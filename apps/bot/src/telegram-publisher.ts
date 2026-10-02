import type { Bot, InlineKeyboard } from "grammy";
import { env } from "./config.js";

type PublishInput = { title: string; body: string; tags: string[]; author: string; mediaType?: string; mediaFileId?: string; location?: string };

export async function publishToChannel(bot: Bot, input: PublishInput): Promise<{ chatId: string; messageId: number }> {
  if (!env.GENZI_CHANNEL_ID) throw new Error("GENZI_CHANNEL_ID is not configured");
  const tags = input.tags.length ? `\n\n🏷️ ${input.tags.map((x) => `#${x.replace(/\s+/g, "_")}`).join(" ")}` : "";
  const location = input.location ? `\n📍 ${input.location}` : "";
  const caption = `🇪🇹 <b>${escapeHtml(input.title)}</b>\n\n${escapeHtml(input.body)}${tags}${location}\n\n👤 ${escapeHtml(input.author)}`;
  if (input.mediaType === "image" && input.mediaFileId) {
    const msg = await bot.api.sendPhoto(env.GENZI_CHANNEL_ID, input.mediaFileId, { caption, parse_mode: "HTML" });
    return { chatId: String(env.GENZI_CHANNEL_ID), messageId: msg.message_id };
  }
  if (input.mediaType === "video" && input.mediaFileId) {
    const msg = await bot.api.sendVideo(env.GENZI_CHANNEL_ID, input.mediaFileId, { caption, parse_mode: "HTML" });
    return { chatId: String(env.GENZI_CHANNEL_ID), messageId: msg.message_id };
  }
  const msg = await bot.api.sendMessage(env.GENZI_CHANNEL_ID, caption, { parse_mode: "HTML" });
  return { chatId: String(env.GENZI_CHANNEL_ID), messageId: msg.message_id };
}
function escapeHtml(value: string): string { return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export async function publishConfession(bot: Bot, body: string, number: number, keyboard: InlineKeyboard): Promise<{ chatId: string; messageId: number }> {
  if (!env.GENZI_CHANNEL_ID) throw new Error("GENZI_CHANNEL_ID is not configured");
  const caption = `🗣️ <b>GENZI CONFESSION #${String(number).padStart(5, "0")}</b>\n\n${escapeHtml(body)}\n\nምን ማድረግ አለበት? 👇`;
  const msg = await bot.api.sendMessage(env.GENZI_CHANNEL_ID, caption, { parse_mode: "HTML", reply_markup: keyboard });
  return { chatId: String(env.GENZI_CHANNEL_ID), messageId: msg.message_id };
}
