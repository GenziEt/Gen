import crypto from "node:crypto";
import { env } from "./config.js";
export function validateTelegramInitData(initData) {
    if (!initData)
        return null;
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash)
        return null;
    const authDate = Number(params.get("auth_date"));
    if (!Number.isFinite(authDate) || Math.floor(Date.now() / 1000) - authDate > 86400)
        return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(env.TELEGRAM_BOT_TOKEN).digest();
    const expected = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash)))
        return null;
    const raw = params.get("user");
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
