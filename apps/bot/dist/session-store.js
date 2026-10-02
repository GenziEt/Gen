import { db } from "./db.js";
export function toPrismaLocale(locale) {
    return locale === "en" ? "ENGLISH" : "AMHARIC";
}
export function fromPrismaLocale(locale) {
    return locale === "ENGLISH" ? "en" : "am";
}
export async function setSession(telegramUserId, submissionId, step, locale) {
    const dbLocale = toPrismaLocale(locale);
    return db.conversationSession.upsert({
        where: { telegramUserId: String(telegramUserId) },
        update: { submissionId, confessionId: null, step, locale: dbLocale },
        create: {
            telegramUserId: String(telegramUserId),
            step,
            locale: dbLocale,
            // ✅ All relations use connect — no scalar FKs mixed in
            user: {
                connect: { telegramId: String(telegramUserId) },
            },
            submission: {
                connect: { id: submissionId },
            },
        },
    });
}
export async function setConfessionSession(telegramUserId, confessionId, step, locale) {
    const dbLocale = toPrismaLocale(locale);
    return db.conversationSession.upsert({
        where: { telegramUserId: String(telegramUserId) },
        update: { confessionId, submissionId: null, step, locale: dbLocale },
        create: {
            telegramUserId: String(telegramUserId),
            step,
            locale: dbLocale,
            // ✅ All relations use connect — no scalar FKs mixed in
            user: {
                connect: { telegramId: String(telegramUserId) },
            },
            confession: {
                connect: { id: confessionId },
            },
        },
    });
}
export async function getSession(telegramUserId) {
    return db.conversationSession.findUnique({
        where: { telegramUserId: String(telegramUserId) },
    });
}
export async function clearSession(telegramUserId) {
    await db.conversationSession.deleteMany({
        where: { telegramUserId: String(telegramUserId) },
    });
}
