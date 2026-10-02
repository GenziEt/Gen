import { db } from "./db.js";
import type { Locale } from "./i18n.js";
import type { Locale as PrismaLocale } from "@prisma/client";

export type Step = "title" | "body" | "media" | "category" | "preview";
export type ConfessionStep = "confession_body" | "confession_confirm";

export function toPrismaLocale(locale: Locale): PrismaLocale {
  return locale === "en" ? "ENGLISH" : "AMHARIC";
}

export function fromPrismaLocale(locale: PrismaLocale): Locale {
  return locale === "ENGLISH" ? "en" : "am";
}

export async function setSession(
  telegramUserId: number,
  submissionId: string,
  step: Step,
  locale: Locale
) {
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

export async function setConfessionSession(
  telegramUserId: number,
  confessionId: string,
  step: ConfessionStep,
  locale: Locale
) {
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

export async function getSession(telegramUserId: number) {
  return db.conversationSession.findUnique({
    where: { telegramUserId: String(telegramUserId) },
  });
}

export async function clearSession(telegramUserId: number) {
  await db.conversationSession.deleteMany({
    where: { telegramUserId: String(telegramUserId) },
  });
}