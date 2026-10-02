import { db } from "./db.js";
import { publishToChannel } from "./telegram-publisher.js";
import { lockPost } from "./post-schema.js";
import { env } from "./config.js";
export async function performModerationAction(bot, submissionId, moderator, decision) {
    const submission = await db.submission.findUnique({ where: { id: submissionId }, include: { user: true } });
    if (!submission)
        throw new Error("Submission not found");
    if (decision === "APPROVE") {
        if (!submission.normalizedJson)
            throw new Error("Submission has no normalized content");
        const normalized = JSON.parse(submission.normalizedJson);
        const locked = lockPost(normalized, submission.user.firstName ?? "GENZI");
        const publication = await publishToChannel(bot, {
            title: locked.title,
            body: locked.body,
            tags: locked.tags,
            author: submission.user.firstName ?? "GENZI",
            ...(locked.media.type ? { mediaType: locked.media.type } : {}),
            ...(locked.media.fileId ? { mediaFileId: locked.media.fileId } : {}),
            ...(locked.metadata.location ? { location: locked.metadata.location } : {})
        });
        const post = await db.post.create({
            data: {
                slug: `${locked.metadata.slug}-${Date.now()}`,
                title: locked.title,
                body: locked.body,
                excerpt: locked.metadata.excerpt,
                category: locked.metadata.category,
                tagsJson: JSON.stringify(locked.tags),
                mediaType: locked.media.type ?? null,
                mediaFileId: locked.media.fileId ?? null,
                mediaAspect: locked.media.aspectRatio ?? null,
                altText: locked.metadata.altText ?? null,
                location: locked.metadata.location ?? null,
                readingMinutes: locked.metadata.readingMinutes,
                publishedAt: new Date(),
                telegramMessageId: publication.messageId,
                telegramChatId: publication.chatId,
                authorId: submission.userId,
                authorName: submission.user.firstName ?? "GENZI"
            }
        });
        await db.submission.update({ where: { id: submissionId }, data: { state: "PUBLISHED" } });
        await db.moderationEvent.create({ data: { submissionId, targetUserId: submission.userId, moderatorId: moderator.id, category: "ADMIN_REVIEW", action: "ALLOW", reason: "Approved by moderator" } });
        return post;
    }
    if (decision === "REJECT") {
        await db.submission.update({ where: { id: submissionId }, data: { state: "REJECTED" } });
        await db.moderationEvent.create({ data: { submissionId, targetUserId: submission.userId, moderatorId: moderator.id, category: "ADMIN_REVIEW", action: "REJECT", reason: "Rejected by moderator" } });
        return null;
    }
    if (decision === "BAN") {
        await db.user.update({ where: { id: submission.userId }, data: { blocked: true } });
        await db.submission.update({ where: { id: submissionId }, data: { state: "REJECTED" } });
        await db.moderationEvent.create({ data: { submissionId, targetUserId: submission.userId, moderatorId: moderator.id, category: "ADMIN_REVIEW", action: "BAN", reason: "User banned by moderator" } });
        if (env.GENZI_GROUP_ID) {
            try {
                await bot.api.banChatMember(env.GENZI_GROUP_ID, Number(submission.user.telegramId));
            }
            catch (error) {
                console.error("Telegram ban failed", error);
            }
        }
        return null;
    }
    await db.user.update({ where: { id: submission.userId }, data: { restrictedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await db.moderationEvent.create({ data: { submissionId, targetUserId: submission.userId, moderatorId: moderator.id, category: "ADMIN_REVIEW", action: "RESTRICT", reason: "User restricted for 24 hours" } });
    return null;
}
