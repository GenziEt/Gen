import { InlineKeyboard } from "grammy";
import { t } from "./i18n.js";
import { categories } from "./categories.js";
export function mainMenu(locale) {
    return new InlineKeyboard()
        .text(t(locale, "createPost"), "create_post")
        .text(t(locale, "confession"), "confession").row()
        .text(t(locale, "trending"), "trending")
        .text(t(locale, "opportunities"), "opportunities").row()
        .text(t(locale, "language"), "language");
}
export function categoryKeyboard(locale) {
    const kb = new InlineKeyboard();
    for (const category of categories) {
        kb.text(locale === "am" ? category.am : category.en, `cat:${category.key}`).row();
    }
    kb.text(t(locale, "cancel"), "cancel");
    return kb;
}
export function previewKeyboard(locale) {
    return new InlineKeyboard()
        .text(t(locale, "approve"), "publish_preview").row()
        .text(t(locale, "edit"), "edit_preview")
        .text(t(locale, "saveDraft"), "save_draft").row()
        .text(t(locale, "cancel"), "cancel");
}
