import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { db } from "./db.js";
import { moderateText } from "./moderation.js";
import { t, type Locale } from "./i18n.js";
import {
  getSession,
  setConfessionSession,
  clearSession,
  fromPrismaLocale,
} from "./session-store.js";
import { publishConfession } from "./telegram-publisher.js";
import { getUser } from "./post-flow.js";

const CONFESSION_MAX = 800;

const REACTION_CHOICES = [
  { key: "approach", emoji: "❤️", am: "ልቅረባት/ልቅረበው", en: "Approach them" },
  { key: "forget", emoji: "😂", am: "ተወው/ተይው", en: "Forget it" },
  { key: "ask_friend", emoji: "👀", am: "ጓደኛ ጠይቅ", en: "Ask a friend" },
  { key: "stay_single", emoji: "💀", am: "ብቻ ቆይ", en: "Stay single" },
] as const;

type ReactionRow = {
  choice: string;
  _count: { _all: number };
};

async function reactionCounts(
  confessionId: string
): Promise<Record<string, number>> {
  const rows = await db.confessionReaction.groupBy({
    by: ["choice"],
    where: { confessionId },
    _count: { _all: true },
  });
  const typedRows = rows as unknown as ReactionRow[];
  const counts: Record<string, number> = {};
  for (const choice of REACTION_CHOICES)
    counts[choice.key] =
      typedRows.find((r) => r.choice === choice.key)?._count._all ?? 0;
  return counts;
}

function confessionKeyboard(
  confessionId: string,
  counts: Record<string, number>
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const choice of REACTION_CHOICES) {
    kb.text(
      `${choice.emoji} ${counts[choice.key] ?? 0}`,
      `confess_react:${confessionId}:${choice.key}`
    ).row();
  }
  return kb;
}

async function enforceViolation(
  userId: string,
  category: string,
  action: "BAN" | "REJECT",
  reason: string,
  evidence: string
): Promise<void> {
  await db.moderationEvent.create({
    data: { targetUserId: userId, category, action, reason, evidence },
  });
  if (action === "BAN") {
    await db.user.update({ where: { id: userId }, data: { blocked: true } });
    return;
  }
  const recent = await db.moderationEvent.count({
    where: {
      targetUserId: userId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      action: { in: ["REJECT", "BAN"] },
    },
  });
  if (recent >= 3)
    await db.user.update({
      where: { id: userId },
      data: { restrictedUntil: new Date(Date.now() + 60 * 60 * 1000) },
    });
}

export function registerConfessionFlow(bot: Bot): void {
  bot.callbackQuery("confession", async (ctx) => {
    if (!ctx.from) return ctx.answerCallbackQuery();
    const user = await getUser(ctx);
    const locale = fromPrismaLocale(user.locale);
    if (user.blocked || (user.restrictedUntil && user.restrictedUntil > new Date())) {
      await ctx.answerCallbackQuery();
      await ctx.reply(t(locale, "rejected"));
      return;
    }
    const confession = await db.confession.create({
      data: {
        telegramUserId: String(ctx.from.id),
        userId: user.id,
        state: "INPUT",
      },
    });
    await setConfessionSession(ctx.from.id, confession.id, "confession_body", locale);
    await ctx.answerCallbackQuery();
    await ctx.reply(t(locale, "confessionIntro"));
  });

  bot.callbackQuery(/^confess_confirm:(yes|no)$/, async (ctx) => {
    if (!ctx.from) return ctx.answerCallbackQuery();
    const session = await getSession(ctx.from.id);
    if (!session || !session.confessionId)
      return ctx.answerCallbackQuery("Session expired.");
    const locale = fromPrismaLocale(session.locale);
    const decision = ctx.match[1];

    if (decision === "no") {
      await db.confession.update({
        where: { id: session.confessionId },
        data: { state: "REJECTED" },
      });
      await clearSession(ctx.from.id);
      await ctx.answerCallbackQuery();
      await ctx.reply(t(locale, "confessionCancelled"));
      return;
    }

    const confession = await db.confession.findUniqueOrThrow({
      where: { id: session.confessionId },
    });
    if (confession.state !== "PREVIEW" || !confession.body) {
      await ctx.answerCallbackQuery("Not ready.");
      return;
    }

    const number =
      (await db.confession.count({ where: { state: "PUBLISHED" } })) + 1;
    const keyboard = confessionKeyboard(
      confession.id,
      await reactionCounts(confession.id)
    );
    let published: { chatId: string; messageId: number };
    try {
      published = await publishConfession(
        bot,
        confession.body,
        number,
        keyboard
      );
    } catch (error) {
      console.error("GENZI confession publication failed", error);
      await ctx.answerCallbackQuery(
        "Publication failed. Check channel configuration."
      );
      return;
    }

    await db.confession.update({
      where: { id: confession.id },
      data: {
        state: "PUBLISHED",
        number,
        telegramChatId: published.chatId,
        telegramMessageId: published.messageId,
      },
    });
    await clearSession(ctx.from.id);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `${t(locale, "confessionPublished")}\n\n🆔 #${String(number).padStart(5, "0")}`
    );
  });

  bot.callbackQuery(/^confess_react:([^:]+):([a-z_]+)$/, async (ctx) => {
    if (!ctx.from) return ctx.answerCallbackQuery();
    const confessionId = ctx.match[1];
    const choiceKey = ctx.match[2];
    if (!confessionId || !choiceKey) {
      await ctx.answerCallbackQuery();
      return;
    }
    const choice = REACTION_CHOICES.find((c) => c.key === choiceKey);
    if (!choice) {
      await ctx.answerCallbackQuery();
      return;
    }
    const user = await getUser(ctx);
    const confession = await db.confession.findUnique({
      where: { id: confessionId },
    });
    if (!confession || confession.state !== "PUBLISHED") {
      await ctx.answerCallbackQuery();
      return;
    }
    await db.confessionReaction.upsert({
      where: {
        confessionId_userId: { confessionId, userId: user.id },
      },
      update: { choice: choiceKey },
      create: { confessionId, userId: user.id, choice: choiceKey },
    });
    const counts = await reactionCounts(confessionId);
    try {
      await ctx.editMessageReplyMarkup({
        reply_markup: confessionKeyboard(confessionId, counts),
      });
    } catch {
      /* markup may already match, or the message is no longer editable — non-fatal */
    }
    const locale = fromPrismaLocale(user.locale);
    await ctx.answerCallbackQuery(
      locale === "am" ? "✅ ድምጽዎ ተመዝግቧል።" : "✅ Your vote is recorded."
    );
  });

  bot.on("message", async (ctx, next) => {
    if (!ctx.from) return next();
    const session = await getSession(ctx.from.id);
    if (!session || !session.confessionId) return next();

    const locale = fromPrismaLocale(session.locale);
    const text = ctx.message.text ?? "";

    if (text === "/cancel") {
      await db.confession.update({
        where: { id: session.confessionId },
        data: { state: "REJECTED" },
      });
      await clearSession(ctx.from.id);
      await ctx.reply(t(locale, "confessionCancelled"));
      return;
    }

    if (ctx.message.forward_origin) {
      await db.confession.update({
        where: { id: session.confessionId },
        data: { state: "REJECTED" },
      });
      await clearSession(ctx.from.id);
      await ctx.reply(t(locale, "forwardedDenied"));
      return;
    }

    if (session.step !== "confession_body") return next();

    const user = await getUser(ctx);

    if (!text || text.length > CONFESSION_MAX) {
      await ctx.reply(
        locale === "am"
          ? `❌ መልዕክቱ አስፈላጊ ነው እና ከ${CONFESSION_MAX} ፊደል አይበልጥም።`
          : `❌ Message is required and must be under ${CONFESSION_MAX} characters.`
      );
      return;
    }

    const moderation = moderateText(text, {
      isAdmin: false,
      isForwarded: false,
    });
    if (moderation.decision === "BAN" || moderation.decision === "REJECT") {
      const action = moderation.decision === "BAN" ? "BAN" : "REJECT";
      await enforceViolation(
        user.id,
        moderation.category,
        action,
        moderation.reason,
        text
      );
      await db.confession.update({
        where: { id: session.confessionId },
        data: {
          state: "REJECTED",
          moderationJson: JSON.stringify(moderation),
        },
      });
      await clearSession(ctx.from.id);
      await ctx.reply(
        moderation.category === "LINK"
          ? t(locale, "linkDenied")
          : t(locale, "rejected")
      );
      return;
    }
    if (moderation.category === "MONITORED_SAFETY_CATEGORY") {
      await db.moderationEvent.create({
        data: {
          targetUserId: user.id,
          category: moderation.category,
          action: "ALLOW",
          reason: moderation.reason,
          evidence: text,
        },
      });
    }

    await db.confession.update({
      where: { id: session.confessionId },
      data: {
        body: text,
        state: "PREVIEW",
        moderationJson: JSON.stringify(moderation),
      },
    });
    await setConfessionSession(
      ctx.from.id,
      session.confessionId,
      "confession_confirm",
      locale
    );

    const preview = [
      t(locale, "confessionPreviewLabel"),
      "",
      text,
      "",
      t(locale, "confessionConfirmPrompt"),
    ].join("\n");
    const keyboard = new InlineKeyboard()
      .text(t(locale, "confessionYes"), "confess_confirm:yes")
      .text(t(locale, "confessionNo"), "confess_confirm:no");
    await ctx.reply(preview, { reply_markup: keyboard });
  });
}