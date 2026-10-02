import { db } from "./db.js";
import { normalizePost } from "./normalizer.js";
import { moderateText } from "./moderation.js";
import { lockPost } from "./post-schema.js";
import { categoryKeyboard, previewKeyboard } from "./ui.js";
import { t } from "./i18n.js";
import { getSession, setSession, clearSession } from "./session-store.js";
import { publishToChannel } from "./telegram-publisher.js";
/**
 * Convert a Prisma `Locale` enum value ("AMHARIC" | "ENGLISH") into the
 * bot's i18n locale ("am" | "en").
 */
function toI18nLocale(prismaLocale) {
    return prismaLocale === "ENGLISH" ? "en" : "am";
}
export async function getUser(ctx) {
    const from = ctx.from;
    if (!from)
        throw new Error("Missing Telegram user");
    return db.user.upsert({
        where: { telegramId: String(from.id) },
        update: {
            ...(from.username !== undefined ? { username: from.username } : {}),
            firstName: from.first_name,
            ...(from.last_name !== undefined ? { lastName: from.last_name } : {}),
        },
        create: {
            telegramId: String(from.id),
            ...(from.username !== undefined ? { username: from.username } : {}),
            firstName: from.first_name,
            ...(from.last_name !== undefined ? { lastName: from.last_name } : {}),
        },
    });
}
function previewText(post, locale, author) {
    const tags = post.tags.length
        ? `\n\n🏷️ ${post.tags.map((x) => `#${x.replace(/\s+/g, "_")}`).join(" ")}`
        : "";
    return [
        "🇪🇹 GENZI",
        "",
        post.mediaFileId ? "🖼️ [MEDIA — 16:9]" : "",
        `*${post.title}*`,
        "",
        post.body,
        tags,
        "",
        `👤 ${author}`,
        `🕒 ${new Date(post.timestamp).toLocaleString(locale === "am" ? "am-ET" : "en-US")}`,
        `📚 ${post.readingMinutes} ደቂቃ ንባብ`,
    ]
        .filter(Boolean)
        .join("\n");
}
export function registerPostFlow(bot) {
    bot.callbackQuery("create_post", async (ctx) => {
        if (!ctx.from)
            return ctx.answerCallbackQuery("Missing user context.");
        const user = await getUser(ctx);
        const locale = toI18nLocale(user.locale);
        const submission = await db.submission.create({
            data: {
                telegramChatId: String(ctx.chat?.id ?? ctx.from.id),
                telegramUserId: String(ctx.from.id),
                userId: user.id,
                state: "INPUT",
            },
        });
        await setSession(ctx.from.id, submission.id, "title", locale);
        await ctx.answerCallbackQuery();
        await ctx.reply(t(locale, "titlePrompt"));
    });
    bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
        if (!ctx.from)
            return ctx.answerCallbackQuery("Missing user context.");
        const session = await getSession(ctx.from.id);
        if (!session || !session.submissionId)
            return ctx.answerCallbackQuery("Session expired.");
        const key = ctx.match[1];
        await db.submission.update({
            where: { id: session.submissionId },
            data: { ...(key !== undefined ? { category: key } : {}), state: "PREPARING" },
        });
        const user = await getUser(ctx);
        const submission = await db.submission.findUniqueOrThrow({
            where: { id: session.submissionId },
        });
        const normalized = normalizePost({
            title: submission.title ?? "",
            body: submission.body ?? "",
            category: key ?? "",
            tags: [],
            ...(submission.mediaType ? { mediaType: submission.mediaType } : {}),
            ...(submission.mediaFileId ? { mediaFileId: submission.mediaFileId } : {}),
        });
        const moderation = moderateText(`${normalized.title}\n${normalized.body}`, {
            isAdmin: user.role !== "USER",
            isForwarded: false,
        });
        await db.submission.update({
            where: { id: submission.id },
            data: {
                normalizedJson: JSON.stringify(normalized),
                moderationJson: JSON.stringify(moderation),
                state: moderation.decision === "ALLOW"
                    ? "PREVIEW"
                    : moderation.decision === "QUARANTINE"
                        ? "QUARANTINED"
                        : "REJECTED",
            },
        });
        await setSession(ctx.from.id, session.submissionId, "preview", session.locale);
        await ctx.answerCallbackQuery();
        if (moderation.decision === "BAN" || moderation.decision === "REJECT") {
            await ctx.reply(moderation.category === "LINK"
                ? t(session.locale, "linkDenied")
                : t(session.locale, "rejected"));
            return;
        }
        await ctx.reply(previewText(normalized, session.locale, user.firstName ?? "GENZI"), {
            parse_mode: "Markdown",
            reply_markup: previewKeyboard(session.locale),
        });
    });
    bot.callbackQuery("publish_preview", async (ctx) => {
        if (!ctx.from)
            return ctx.answerCallbackQuery("Missing user context.");
        const session = await getSession(ctx.from.id);
        if (!session || !session.submissionId)
            return ctx.answerCallbackQuery("Session expired.");
        const user = await getUser(ctx);
        const submission = await db.submission.findUniqueOrThrow({
            where: { id: session.submissionId },
        });
        if (submission.state !== "PREVIEW")
            return ctx.answerCallbackQuery("Not ready.");
        const normalized = JSON.parse(submission.normalizedJson ?? "{}");
        const locked = lockPost(normalized, user.firstName ?? "GENZI");
        let telegramPublication;
        try {
            telegramPublication = await publishToChannel(bot, {
                title: locked.title,
                body: locked.body,
                tags: locked.tags,
                author: user.firstName ?? "GENZI",
                ...(locked.media.type ? { mediaType: locked.media.type } : {}),
                ...(locked.media.fileId ? { mediaFileId: locked.media.fileId } : {}),
                ...(locked.metadata.location
                    ? { location: locked.metadata.location }
                    : {}),
            });
        }
        catch (error) {
            console.error("GENZI channel publication failed", error);
            await ctx.answerCallbackQuery("Publication failed. Check channel configuration.");
            return;
        }
        const post = await db.post.create({
            data: {
                slug: `${locked.metadata.slug}-${Date.now()}`,
                title: locked.title,
                body: locked.body,
                excerpt: locked.metadata.excerpt,
                category: locked.metadata.category,
                tagsJson: JSON.stringify(locked.tags),
                ...(locked.media.type !== null && locked.media.type !== undefined
                    ? { mediaType: locked.media.type }
                    : {}),
                ...(locked.media.fileId !== null && locked.media.fileId !== undefined
                    ? { mediaFileId: locked.media.fileId }
                    : {}),
                ...(locked.media.aspectRatio !== undefined
                    ? { mediaAspect: locked.media.aspectRatio }
                    : {}),
                ...(locked.metadata.altText !== undefined
                    ? { altText: locked.metadata.altText }
                    : {}),
                ...(locked.metadata.location !== undefined
                    ? { location: locked.metadata.location }
                    : {}),
                readingMinutes: locked.metadata.readingMinutes,
                publishedAt: new Date(),
                telegramMessageId: telegramPublication.messageId,
                telegramChatId: telegramPublication.chatId,
                authorId: user.id,
                authorName: user.firstName ?? "GENZI",
            },
        });
        await db.submission.update({
            where: { id: submission.id },
            data: { state: "PUBLISHED" },
        });
        await clearSession(ctx.from.id);
        await ctx.answerCallbackQuery();
        await ctx.reply(`${t(session.locale, "published")}\n\n🆔 ${post.slug}`);
    });
    bot.callbackQuery("save_draft", async (ctx) => {
        if (!ctx.from)
            return ctx.answerCallbackQuery("Missing user context.");
        const session = await getSession(ctx.from.id);
        if (!session || !session.submissionId)
            return ctx.answerCallbackQuery("Session expired.");
        await db.submission.update({
            where: { id: session.submissionId },
            data: { state: "DRAFT" },
        });
        await clearSession(ctx.from.id);
        await ctx.answerCallbackQuery();
        await ctx.reply(t(session.locale, "draftSaved"));
    });
    bot.callbackQuery("edit_preview", async (ctx) => {
        if (!ctx.from)
            return ctx.answerCallbackQuery("Missing user context.");
        const session = await getSession(ctx.from.id);
        if (!session || !session.submissionId)
            return ctx.answerCallbackQuery("Session expired.");
        await setSession(ctx.from.id, session.submissionId, "title", session.locale);
        await ctx.answerCallbackQuery();
        await ctx.reply(t(session.locale, "titlePrompt"));
    });
    bot.callbackQuery("cancel", async (ctx) => {
        if (!ctx.from)
            return ctx.answerCallbackQuery("Missing user context.");
        const session = await getSession(ctx.from.id);
        if (session?.submissionId)
            await db.submission.update({
                where: { id: session.submissionId },
                data: { state: "REJECTED" },
            });
        await clearSession(ctx.from.id);
        await ctx.answerCallbackQuery();
        await ctx.reply("❌ ሂደቱ ተሰርዟል።");
    });
    bot.on("message", async (ctx, next) => {
        if (!ctx.from)
            return next();
        const session = await getSession(ctx.from.id);
        if (!session || !session.submissionId)
            return next();
        const user = await getUser(ctx);
        const locale = session.locale;
        const submission = await db.submission.findUniqueOrThrow({
            where: { id: session.submissionId },
        });
        if (ctx.message.forward_origin) {
            await db.submission.update({
                where: { id: submission.id },
                data: { state: "REJECTED" },
            });
            await clearSession(ctx.from.id);
            await ctx.reply(t(locale, "forwardedDenied"));
            return;
        }
        const text = ctx.message.text ?? ctx.message.caption ?? "";
        if (session.step === "title") {
            if (!text || text.length > 100) {
                await ctx.reply("❌ ርዕሱ አስፈላጊ ነው እና ከ100 ፊደል አይበልጥም።");
                return;
            }
            const moderation = moderateText(text, {
                isAdmin: user.role !== "USER",
                isForwarded: false,
            });
            if (moderation.decision !== "ALLOW" && moderation.decision !== "QUARANTINE") {
                await ctx.reply(t(locale, "rejected"));
                return;
            }
            await db.submission.update({
                where: { id: submission.id },
                data: { title: text },
            });
            await setSession(ctx.from.id, session.submissionId, "body", locale);
            await ctx.reply(t(locale, "bodyPrompt"));
            return;
        }
        if (session.step === "body") {
            if (!text || text.length > 6000) {
                await ctx.reply("❌ ጽሑፉ አስፈላጊ ነው እና ከ6000 ፊደል አይበልጥም።");
                return;
            }
            const moderation = moderateText(text, {
                isAdmin: user.role !== "USER",
                isForwarded: false,
            });
            if (moderation.decision !== "ALLOW" && moderation.decision !== "QUARANTINE") {
                await ctx.reply(t(locale, "rejected"));
                return;
            }
            await db.submission.update({
                where: { id: submission.id },
                data: { body: text },
            });
            await setSession(ctx.from.id, session.submissionId, "media", locale);
            await ctx.reply(t(locale, "mediaPrompt"));
            return;
        }
        if (session.step === "media") {
            if (text === "/skip") {
                await setSession(ctx.from.id, session.submissionId, "category", locale);
                await ctx.reply(t(locale, "categoryPrompt"), {
                    reply_markup: categoryKeyboard(locale),
                });
                return;
            }
            if (ctx.message.photo?.length) {
                const largest = ctx.message.photo.at(-1);
                await db.submission.update({
                    where: { id: submission.id },
                    data: {
                        mediaType: "image",
                        ...(largest?.file_id !== undefined
                            ? { mediaFileId: largest.file_id }
                            : {}),
                    },
                });
                await setSession(ctx.from.id, session.submissionId, "category", locale);
                await ctx.reply(t(locale, "categoryPrompt"), {
                    reply_markup: categoryKeyboard(locale),
                });
                return;
            }
            if (ctx.message.video) {
                await db.submission.update({
                    where: { id: submission.id },
                    data: {
                        mediaType: "video",
                        ...(ctx.message.video.file_id !== undefined
                            ? { mediaFileId: ctx.message.video.file_id }
                            : {}),
                    },
                });
                await setSession(ctx.from.id, session.submissionId, "category", locale);
                await ctx.reply(t(locale, "categoryPrompt"), {
                    reply_markup: categoryKeyboard(locale),
                });
                return;
            }
            await ctx.reply("❌ ምስል/ቪዲዮ ይላኩ ወይም /skip ይጫኑ።");
            return;
        }
        await next();
    });
}
