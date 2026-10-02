function slugify(input) {
    return input
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80) || `genzi-${Date.now()}`;
}
function cleanText(input) {
    return input.normalize("NFKC").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
export function normalizePost(raw) {
    const title = cleanText(raw.title).slice(0, 100);
    const body = cleanText(raw.body).slice(0, 6000);
    const words = body.split(/\s+/).filter(Boolean).length;
    const readingMinutes = Math.max(1, Math.ceil(words / 180));
    const excerpt = body.slice(0, 180).replace(/\s+\S*$/, "").trim();
    const timestamp = new Date().toISOString();
    return {
        ...raw,
        title,
        body,
        tags: raw.tags.slice(0, 8).map(cleanText).filter(Boolean),
        slug: slugify(title),
        excerpt,
        timestamp,
        readingMinutes,
        altText: `${title} — GENZI 🇪🇹`
    };
}
