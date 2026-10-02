export const POST_SCHEMA_VERSION = "1.0";
export function lockPost(post, authorName) {
    return {
        schemaVersion: POST_SCHEMA_VERSION,
        media: { type: post.mediaType ?? null, fileId: post.mediaFileId ?? null, aspectRatio: "16:9" },
        title: post.title,
        body: post.body,
        tags: post.tags,
        author: { name: authorName },
        timestamp: post.timestamp,
        metadata: {
            slug: post.slug,
            excerpt: post.excerpt,
            readingMinutes: post.readingMinutes,
            altText: post.altText,
            category: post.category,
            ...(post.location ? { location: post.location } : {}),
            ...(post.link ? { link: post.link } : {})
        }
    };
}
