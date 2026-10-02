import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
// Audit fix #17: assets must resolve under the Vite base (e.g. /genzi-pages/) on GitHub Pages.
const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const auth = () => window.Telegram?.WebApp?.initData ?? "";
async function api(path, init = {}) { return fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": auth(), ...(init.headers ?? {}) } }); }
// Audit fix #1: browser <img>/<video> tags cannot send X-Telegram-Init-Data, so media is
// loaded through a short-lived single-use signed URL issued by the authenticated API.
function SignedMedia({ fileId, type, alt }) {
    const [url, setUrl] = React.useState(null);
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => { let alive = true; setUrl(null); setFailed(false); void api(`/api/media/${encodeURIComponent(fileId)}/signed`).then(r => r.ok ? r.json() : null).then(x => { if (!alive)
        return; if (x?.data?.url)
        setUrl(`${API}${x.data.url}`);
    else
        setFailed(true); }).catch(() => { if (alive)
        setFailed(true); }); return () => { alive = false; }; }, [fileId]);
    if (failed)
        return _jsx("p", { className: "muted", children: "\uD83D\uDCF7 \u121A\u12F2\u12EB\u12CD\u1295 \u1218\u132B\u1295 \u12A0\u120D\u1270\u1233\u12AB\u121D\u1362" });
    if (!url)
        return _jsx("div", { className: "media media-loading", children: "\u23F3 \u121A\u12F2\u12EB \u1260\u1218\u132B\u1295 \u120B\u12ED..." });
    return type === "video" ? _jsx("video", { className: "media", src: url, controls: true }) : _jsx("img", { className: "media", src: url, alt: alt });
}
function StandardPost({ post, onSave, onOpenAuthor, onMessage }) {
    let tags = [];
    try {
        tags = JSON.parse(post.tagsJson);
    }
    catch { }
    const [authorFollow, setAuthorFollow] = React.useState(false);
    const [authorFollowers, setAuthorFollowers] = React.useState(0);
    const [counts, setCounts] = React.useState({ LIKE: 0, FIRE: 0, LOVE: 0 });
    const [reacted, setReacted] = React.useState(null);
    const [saved, setSaved] = React.useState(false);
    const [comments, setComments] = React.useState([]);
    const [comment, setComment] = React.useState("");
    const [reposted, setReposted] = React.useState(false);
    const [repostCount, setRepostCount] = React.useState(0);
    const [paid, setPaid] = React.useState(post.monetizationType === "PAID");
    const [price, setPrice] = React.useState(post.priceCoins ?? 0);
    const [bought, setBought] = React.useState(post.purchased !== false);
    const [unlocking, setUnlocking] = React.useState(false);
    const [tipOpen, setTipOpen] = React.useState(false);
    const [tipAmount, setTipAmount] = React.useState("50");
    const [tipMsg, setTipMsg] = React.useState("");
    const [tipBusy, setTipBusy] = React.useState(false);
    const [tipDone, setTipDone] = React.useState(false);
    // Audit fixes #3 + #4: hydrate repost state/count and hide repost on own posts.
    const [isOwnPost, setIsOwnPost] = React.useState(false);
    const [localError, setLocalError] = React.useState("");
    React.useEffect(() => { void Promise.all([fetch(`${API}/api/posts/${post.id}/reactions`).then(r => r.json()), api(`/api/posts/${post.id}/bookmark`).then(r => r.ok ? r.json() : null), fetch(`${API}/api/posts/${post.id}/comments`).then(r => r.json()), api(`/api/posts/${post.id}/repost`).then(r => r.ok ? r.json() : null)]).then(([r, b, c, rp]) => { if (r?.data)
        setCounts(r.data); if (b?.data)
        setSaved(!!b.data.saved); if (Array.isArray(c?.data))
        setComments(c.data); if (rp?.data) {
        setReposted(!!rp.data.reposted);
        setRepostCount(rp.data.count ?? 0);
    } }); void api(`/api/users/${post.authorId}/following-status`).then(r => r.ok ? r.json() : null).then(x => { if (x?.data) {
        setAuthorFollow(!!x.data.following);
        setAuthorFollowers(x.data.followers);
    } }).catch(() => undefined); void api("/api/me").then(r => r.ok ? r.json() : null).then(x => { if (x?.data?.id)
        setIsOwnPost(x.data.id === post.authorId); }).catch(() => undefined); void api(`/api/posts/${post.id}/view`, { method: "POST" }).catch(() => undefined); }, [post.id]);
    async function react(type) { const r = await api(`/api/posts/${post.id}/reactions`, { method: "POST", body: JSON.stringify({ type }) }); if (r.ok) {
        const x = await r.json();
        setCounts(x.data.counts);
        setReacted(x.data.active);
    } }
    async function bookmark() { const r = await api(`/api/posts/${post.id}/bookmark`, { method: "POST" }); if (r.ok) {
        const x = await r.json();
        setSaved(x.data.saved);
        onSave?.();
    } }
    async function repost() { const r = await api(`/api/posts/${post.id}/repost`, { method: "POST" }); if (r.ok) {
        const x = await r.json();
        setReposted(!!x.data.reposted);
        setRepostCount(x.data.count);
    } }
    async function unlockPaid() { setUnlocking(true); const r = await api(`/api/posts/${post.id}/purchase`, { method: "POST" }); setUnlocking(false); if (r.ok) {
        const x = await r.json();
        if (x.data?.purchased)
            setBought(true);
    }
    else {
        const x = await r.json().catch(() => null);
        setLocalError(x?.error ?? "ማንሸድ አልተሳካም — በቂ ሪንቦ ላይኖር ይችላል።");
    } }
    async function sendTip() { if (tipBusy)
        return; setTipBusy(true); const amount = Math.max(1, Math.min(10000, Number(tipAmount) || 0)); const r = await api(`/api/users/${post.authorId}/tip`, { method: "POST", body: JSON.stringify({ amountCoins: amount, message: tipMsg || undefined }) }); setTipBusy(false); if (r.ok) {
        setTipDone(true);
        setTipOpen(false);
        setTimeout(() => setTipDone(false), 2500);
    }
    else {
        const x = await r.json().catch(() => null);
        setLocalError(x?.error ?? "ሽልማት አልተሳካም — በቂ ሪንቦ ላይኖር ይችላል።");
    } }
    async function sendComment() { if (!comment.trim())
        return; const r = await api(`/api/posts/${post.id}/comments`, { method: "POST", body: JSON.stringify({ body: comment }) }); if (r.ok) {
        const x = await r.json();
        setComments(v => [...v, x.data]);
        setComment("");
    } }
    async function follow() { const r = await api(`/api/users/${post.authorId}/follow`, { method: "POST" }); if (r.ok) {
        const x = await r.json();
        setAuthorFollow(!!x.data.following);
        setAuthorFollowers(v => Math.max(0, v + (x.data.following ? 1 : -1)));
    } }
    const locked = paid && !bought && !isOwnPost;
    return _jsxs("article", { id: `post-${post.id}`, className: "post", children: [post.mediaFileId && _jsx(SignedMedia, { fileId: post.mediaFileId, type: post.mediaType, alt: post.title }), _jsx("h2", { children: post.title }), locked ? _jsxs("div", { className: "paid-lock", children: [_jsxs("p", { children: ["\uD83D\uDD12 \u12E8\u1270\u12A8\u1348\u1208 \u12ED\u12D8\u1275 \u00B7 \u12CB\u130B \uD83E\uDE99 ", price, " GENZI Coins"] }), _jsx("button", { className: "primary", disabled: unlocking, onClick: () => void unlockPaid(), children: unlocking ? "⏳" : "🪙 ክፈት" })] }) : _jsx("p", { children: post.body }), localError && _jsxs("p", { className: "post-error", children: ["\u26A0\uFE0F ", localError] }), _jsx("div", { className: "tags", children: tags.map(t => _jsxs("span", { children: ["#", t] }, t)) }), _jsxs("div", { className: "meta", children: [_jsxs("button", { className: "author-link", onClick: () => onOpenAuthor?.(post.authorId), children: ["\uD83D\uDC64 ", post.authorName] }), _jsxs("span", { children: ["\uD83D\uDD52 ", post.publishedAt ? new Date(post.publishedAt).toLocaleString("am-ET") : ""] })] }), _jsxs("div", { className: "author-follow", children: [_jsx("button", { onClick: () => void follow(), children: authorFollow ? "✓ ተከታትለዋል" : "＋ ተከተል" }), _jsxs("small", { children: [authorFollowers, " \u1270\u12A8\u1273\u12EE\u127D"] })] }), _jsxs("div", { className: "actions", children: [_jsxs("button", { className: reacted === "LIKE" ? "selected" : "", onClick: () => void react("LIKE"), children: ["\uD83D\uDC4D ", counts.LIKE] }), _jsxs("button", { className: reacted === "FIRE" ? "selected" : "", onClick: () => void react("FIRE"), children: ["\uD83D\uDD25 ", counts.FIRE] }), _jsxs("button", { className: reacted === "LOVE" ? "selected" : "", onClick: () => void react("LOVE"), children: ["\u2764\uFE0F ", counts.LOVE] }), _jsx("button", { className: saved ? "selected" : "", onClick: () => void bookmark(), children: saved ? "🔖 ተቀምጧል" : "🔖 አስቀምጥ" }), !isOwnPost && _jsxs("button", { className: reposted ? "selected" : "", onClick: () => void repost(), children: [reposted ? "🔁 ተደግሟል" : "🔁 ድገም", " ", repostCount || ""] }), !isOwnPost && _jsx("button", { onClick: () => setTipOpen(v => !v), children: "\uD83E\uDE99 \u123D\u120D\u121B\u1275" }), !isOwnPost && onMessage && _jsx("button", { onClick: () => onMessage({ id: post.authorId, firstName: post.authorName, lastName: null, username: null }), children: "\uD83D\uDCAC" })] }), tipDone && _jsx("p", { className: "tip-done", children: "\u2705 \uD83E\uDE99 \u123D\u120D\u121B\u1275\u12CE \u1270\u120D\u12B3\u120D!" }), tipOpen && _jsxs("div", { className: "tip-form", children: [_jsx("input", { type: "number", min: 1, max: 10000, value: tipAmount, onChange: e => setTipAmount(e.target.value) }), _jsx("input", { value: tipMsg, maxLength: 140, onChange: e => setTipMsg(e.target.value), placeholder: "\u12A0\u132D\u122D \u1218\u120D\u12A5\u12AD\u1275 (\u12A0\u121B\u122B\u132D)" }), _jsx("button", { disabled: tipBusy, onClick: () => void sendTip(), children: tipBusy ? "⏳" : `🪙 ላክ (${Math.max(1, Math.min(10000, Number(tipAmount) || 0))})` }), _jsx("button", { onClick: () => setTipOpen(false), children: "\u2715" })] }), _jsxs("section", { className: "comments", children: [_jsxs("h3", { children: ["\uD83D\uDCAC \u12A0\u1235\u1270\u12EB\u12E8\u1276\u127D ", comments.length] }), comments.slice(-20).map(c => _jsxs("div", { className: "comment", children: [_jsx("b", { children: c.user.firstName ?? c.user.username ?? "GENZI ተጠቃሚ" }), _jsx("p", { children: c.body })] }, c.id)), _jsxs("div", { className: "comment-form", children: [_jsx("input", { value: comment, maxLength: 600, onChange: e => setComment(e.target.value), placeholder: "\u12A0\u1235\u1270\u12EB\u12E8\u1275 \u12ED\u133B\u1349..." }), _jsx("button", { onClick: () => void sendComment(), children: "\u120B\u12AD" })] })] })] });
}
function CreatorCard({ creator, onOpen, onChanged, onMessage }) {
    const [following, setFollowing] = React.useState(creator.following);
    async function toggle() { const r = await api(`/api/users/${creator.id}/follow`, { method: "POST" }); if (r.ok) {
        const x = await r.json();
        setFollowing(!!x.data.following);
        onChanged();
    } }
    return _jsxs("article", { className: "creator-card", children: [_jsxs("button", { className: "creator-main", onClick: () => onOpen(creator.id), children: [_jsx("div", { className: "avatar", children: creator.firstName?.slice(0, 1) ?? "G" }), _jsxs("div", { children: [_jsx("b", { children: [creator.firstName, creator.lastName].filter(Boolean).join(" ") || "GENZI ተጠቃሚ" }), _jsxs("small", { children: ["@", creator.username ?? "genzi_user"] }), _jsx("p", { children: creator.bio || "በGENZI የሚያጋራ ይዘት ፈጣሪ" }), _jsxs("small", { children: ["\uD83D\uDC65 ", creator._count.followers, " \u00B7 \uD83D\uDCDD ", creator._count.posts] })] })] }), _jsx("button", { onClick: () => void toggle(), children: following ? "✓ ተከታትለዋል" : "＋ ተከተል" }), _jsx("button", { onClick: () => onMessage(creator), children: "\uD83D\uDCAC" })] });
}
function App() {
    const [posts, setPosts] = React.useState([]);
    const [tab, setTab] = React.useState("home");
    const [notifications, setNotifications] = React.useState([]);
    const [unread, setUnread] = React.useState(0);
    const [q, setQ] = React.useState("");
    const [category, setCategory] = React.useState("");
    const [profile, setProfile] = React.useState(null);
    const [bio, setBio] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [dashboard, setDashboard] = React.useState(null);
    const [profilePosts, setProfilePosts] = React.useState([]);
    const [profilePage, setProfilePage] = React.useState(1);
    const [profileHasMore, setProfileHasMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [creators, setCreators] = React.useState([]);
    const [authorId, setAuthorId] = React.useState(null);
    const [communities, setCommunities] = React.useState([]);
    const [communityId, setCommunityId] = React.useState(null);
    const [selectedCommunity, setSelectedCommunity] = React.useState(null);
    const [communityPosts, setCommunityPosts] = React.useState([]);
    const [communityPage, setCommunityPage] = React.useState(1);
    const [communityHasMore, setCommunityHasMore] = React.useState(false);
    const [communityQ, setCommunityQ] = React.useState("");
    const [newCommunity, setNewCommunity] = React.useState({ name: "", description: "", category: "ማህበረሰብ", city: "" });
    const [opportunities, setOpportunities] = React.useState([]);
    const [opportunityId, setOpportunityId] = React.useState(null);
    const [selectedOpportunity, setSelectedOpportunity] = React.useState(null);
    const [opportunityQ, setOpportunityQ] = React.useState("");
    const [opportunityType, setOpportunityType] = React.useState("");
    const [opportunityCategory, setOpportunityCategory] = React.useState("");
    const [opportunitySaved, setOpportunitySaved] = React.useState([]);
    const [showOpportunityCreate, setShowOpportunityCreate] = React.useState(false);
    const [newOpportunity, setNewOpportunity] = React.useState({ title: "", description: "", organization: "", type: "JOB", category: "ስራ", location: "", deadline: "", contactText: "" });
    const [events, setEvents] = React.useState([]);
    const [eventQ, setEventQ] = React.useState("");
    const [eventCategory, setEventCategory] = React.useState("");
    const [showEventCreate, setShowEventCreate] = React.useState(false);
    const [newEvent, setNewEvent] = React.useState({ title: "", description: "", category: "ማህበረሰብ", location: "", startsAt: "", endsAt: "", isOnline: false, meetingText: "" });
    const [polls, setPolls] = React.useState([]);
    const [pollQ, setPollQ] = React.useState("");
    const [showPollCreate, setShowPollCreate] = React.useState(false);
    const [newPoll, setNewPoll] = React.useState({ question: "", description: "", options: ["", ""], multiple: false, closesAt: "" });
    const [quizzes, setQuizzes] = React.useState([]);
    const [quizAnswers, setQuizAnswers] = React.useState({});
    const [quizScores, setQuizScores] = React.useState({});
    const [gamification, setGamification] = React.useState(null);
    const [growth, setGrowth] = React.useState(null);
    const [growthCode, setGrowthCode] = React.useState("");
    const [monetization, setMonetization] = React.useState(null);
    const [earnings, setEarnings] = React.useState(null);
    const [conversations, setConversations] = React.useState([]);
    const [messageUser, setMessageUser] = React.useState(null);
    const [messages, setMessages] = React.useState([]);
    const [messageBody, setMessageBody] = React.useState("");
    const [messageUnread, setMessageUnread] = React.useState(0);
    const [realtimeOnline, setRealtimeOnline] = React.useState(false);
    const [typingUser, setTypingUser] = React.useState(false);
    const [recipientOnline, setRecipientOnline] = React.useState(null);
    const [eventId, setEventId] = React.useState(null);
    const [selectedEvent, setSelectedEvent] = React.useState(null);
    const [savedOpportunitiesView, setSavedOpportunitiesView] = React.useState(false);
    const [communityMembers, setCommunityMembers] = React.useState([]);
    const [walletTx, setWalletTx] = React.useState([]);
    const [myPosts, setMyPosts] = React.useState([]);
    // Audit fix #2: one centralized navigation function clears every detail-screen ID so bottom
    // nav can never stay trapped behind an open profile/community/opportunity detail view.
    const navigate = React.useCallback((nextTab) => { setAuthorId(null); setCommunityId(null); setOpportunityId(null); setEventId(null); setSelectedCommunity(null); setSelectedOpportunity(null); setSelectedEvent(null); setMessageUser(null); setSavedOpportunitiesView(false); setTab(nextTab); }, []);
    const mode = tab === "following" ? "following" : tab === "trending" ? "trending" : "for-you";
    const load = React.useCallback(async (reset = true) => { setLoading(true); try {
        if (tab === "saved") {
            const r = await api("/api/me/bookmarks");
            const x = await r.json();
            setPosts(Array.isArray(x.data) ? x.data : []);
            setHasMore(false);
            return;
        }
        const next = reset ? 1 : page + 1;
        let url = tab === "home" ? `/api/posts?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&page=${next}&limit=20` : `/api/me/feed?mode=${mode}&page=${next}&limit=20`;
        const r = await api(url);
        const x = await r.json();
        const items = x?.data?.items ?? [];
        setPosts(v => reset ? items : [...v, ...items]);
        setPage(next);
        setHasMore(!!x?.data?.hasMore);
    }
    finally {
        setLoading(false);
    } }, [q, category, tab, mode, page]);
    React.useEffect(() => { if (tab !== "profile" && tab !== "notifications" && tab !== "creator" && !authorId)
        void load(true); }, [tab, category, authorId]);
    // Audit fix #16: lightweight in-app post composer (bot flow stays the primary path).
    const [showComposer, setShowComposer] = React.useState(false);
    const [newPost, setNewPost] = React.useState({ title: "", body: "", category: "entertainment", tags: "" });
    const [composerBusy, setComposerBusy] = React.useState(false);
    const [composerError, setComposerError] = React.useState("");
    async function createPost() { if (composerBusy || !newPost.title.trim() || !newPost.body.trim())
        return; setComposerBusy(true); setComposerError(""); const tags = newPost.tags.split(/[, ]+/).map(t => t.replace(/^#/, "").trim()).filter(Boolean); const r = await api("/api/posts", { method: "POST", body: JSON.stringify({ title: newPost.title, body: newPost.body, category: newPost.category, tags }) }); setComposerBusy(false); if (r.ok) {
        const x = await r.json();
        if (x?.data) {
            setPosts(v => [x.data, ...v]);
            setNewPost({ title: "", body: "", category: "entertainment", tags: "" });
            setShowComposer(false);
        }
    }
    else {
        const x = await r.json().catch(() => null);
        setComposerError(x?.error ?? "ልጥፉን መልክ አልተሳካም።");
    } }
    React.useEffect(() => { void api("/api/me/notifications").then(r => r.ok ? r.json() : null).then(x => { if (x?.data) {
        setNotifications(x.data.items);
        setUnread(x.data.unread);
    } }).catch(() => undefined); }, [tab]);
    React.useEffect(() => { if (tab === "profile") {
        void api("/api/me/profile").then(r => r.json()).then(x => { if (x?.data) {
            setProfile(x.data);
            setBio(x.data.bio ?? "");
        } });
        void api(`/api/users/${profile?.id ?? ""}/posts?page=1&limit=10`).then(r => r.ok && profile?.id ? r.json() : null).then(x => { if (x?.data)
            setMyPosts(x.data.items ?? []); }).catch(() => undefined);
        void loadSavedOpportunities();
    } }, [tab, profile?.id]);
    // Audit fixes #7 + #5: monetization data auto-loads on tab open; recipient presence is polled
    // separately from realtimeOnline (which only tracks OUR OWN SSE connection).
    const loadMonetization = React.useCallback(() => { void Promise.all([api("/api/me/monetization"), api("/api/me/creator-earnings"), api("/api/me/wallet/transactions")]).then(async ([a, b, c]) => { const ax = await a.json().catch(() => null); const bx = await b.json().catch(() => null); const cx = await c.json().catch(() => null); if (ax?.data)
        setMonetization(ax.data); if (bx?.data)
        setEarnings(bx.data); if (Array.isArray(cx?.data))
        setWalletTx(cx.data); }).catch(() => undefined); }, []);
    React.useEffect(() => { if (tab === "monetization")
        loadMonetization(); }, [tab, loadMonetization]);
    React.useEffect(() => { if (!messageUser) {
        setRecipientOnline(null);
        return;
    } let alive = true; setRecipientOnline(null); const check = () => { void api(`/api/users/${messageUser.id}/presence`).then(r => r.ok ? r.json() : null).then(x => { if (alive && x?.data)
        setRecipientOnline(!!x.data.online); }).catch(() => { if (alive)
        setRecipientOnline(null); }); }; check(); const timer = setInterval(check, 20_000); return () => { alive = false; clearInterval(timer); }; }, [messageUser?.id]);
    React.useEffect(() => { if (tab === "gamification")
        void api("/api/me/gamification").then(r => r.ok ? r.json() : null).then(x => { if (x?.data)
            setGamification(x.data); }).catch(() => undefined); }, [tab]);
    React.useEffect(() => { if (tab === "growth")
        void api("/api/me/growth").then(r => r.ok ? r.json() : null).then(x => { if (x?.data)
            setGrowth(x.data); }).catch(() => undefined); }, [tab]);
    React.useEffect(() => { if (tab === "creator")
        void api("/api/me/creator-dashboard").then(r => r.ok ? r.json() : null).then(x => { if (x?.data)
            setDashboard(x.data); }).catch(() => undefined); }, [tab]);
    React.useEffect(() => { if (authorId) {
        setProfilePosts([]);
        setProfilePage(1);
        void api(`/api/users/${authorId}/posts?page=1&limit=12`).then(r => r.ok ? r.json() : null).then(x => { if (x?.data) {
            setProfilePosts(x.data.items ?? []);
            setProfileHasMore(!!x.data.hasMore);
        } }).catch(() => undefined);
    } }, [authorId]);
    React.useEffect(() => { if (tab === "home")
        void api("/api/discover/creators?limit=6").then(r => r.ok ? r.json() : null).then(x => { if (Array.isArray(x?.data))
            setCreators(x.data); }).catch(() => undefined); }, [tab]);
    async function openAuthor(id) { const r = await api(`/api/users/${id}/profile`); if (r.ok) {
        const x = await r.json();
        if (x.data) {
            setProfile(x.data);
            setBio(x.data.bio ?? "");
            setAuthorId(id);
        }
    } }
    async function openNotification(n) { if (n.postId) {
        const r = await api(`/api/posts/${n.postId}`);
        if (r.ok) {
            const x = await r.json();
            if (x.data) {
                setPosts(v => v.some(p => p.id === x.data.id) ? v : [x.data, ...v]);
                navigate("home");
                setTimeout(() => document.getElementById(`post-${n.postId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
            }
        }
    } if (!n.readAt) {
        await api("/api/me/notifications/read", { method: "POST", body: JSON.stringify({ id: n.id }) });
        setNotifications(v => v.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x));
        setUnread(v => Math.max(0, v - 1));
    } }
    async function loadMessages() { const r = await api("/api/me/messages"); if (r.ok) {
        const x = await r.json();
        setConversations(x.data.items);
        setMessageUnread(x.data.unread);
    } }
    async function openConversation(user) { setMessageUser(user); const r = await api(`/api/messages/${user.id}`); if (r.ok) {
        const x = await r.json();
        setMessages(x.data.messages ?? []);
        void api(`/api/messages/${user.id}/read`, { method: "POST" });
        void loadMessages();
    } }
    async function sendDirectMessage() { if (!messageUser || !messageBody.trim())
        return; const r = await api(`/api/messages/${messageUser.id}`, { method: "POST", body: JSON.stringify({ body: messageBody }) }); if (r.ok) {
        const x = await r.json();
        setMessages(v => [...v, x.data]);
        setMessageBody("");
        void loadMessages();
    } }
    async function saveProfile() { const r = await api("/api/me/profile", { method: "PATCH", body: JSON.stringify({ bio }) }); if (r.ok) {
        const x = await r.json();
        setProfile(p => p ? { ...p, ...x.data } : p);
    } }
    // Audit fixes #6/#8/#9: helper state + actions for public-profile tip/subscribe,
    // event detail screen (GET /api/events/:id) and community moderation (members/attach/detach).
    const [pubTipOpen, setPubTipOpen] = React.useState(false);
    const [pubTipAmount, setPubTipAmount] = React.useState("50");
    const [pubTipBusy, setPubTipBusy] = React.useState(false);
    const [pubSubMsg, setPubSubMsg] = React.useState("");
    const [communityAttachQ, setCommunityAttachQ] = React.useState("");
    const [myPostMatches, setMyPostMatches] = React.useState([]);
    async function sendPublicTip(target) { if (pubTipBusy)
        return; setPubTipBusy(true); const amount = Math.max(1, Math.min(1000, Number(pubTipAmount) || 0)); const r = await api(`/api/users/${target.id}/tip`, { method: "POST", body: JSON.stringify({ amountCoins: amount }) }); setPubTipBusy(false); const x = await r.json().catch(() => null); if (r.ok) {
        setPubTipOpen(false);
        setPubSubMsg(`✅ 🪙 ${amount} ሽልማት ተልኳል!`);
        setTimeout(() => setPubSubMsg(""), 2500);
    }
    else
        setPubSubMsg(`⚠️ ${x?.error ?? "ሽልማት አልተሳካም።"}`); }
    async function subscribeCreator(target) { const r = await api(`/api/users/${target.id}/subscribe`, { method: "POST", body: JSON.stringify({}) }); const x = await r.json().catch(() => null); if (r.ok)
        setPubSubMsg(`✅ ⭐ በ ${x?.data?.priceCoins ?? 0} 🪙 ነቅ አባልነት ተጀምሯል!`);
    else
        setPubSubMsg(`⚠️ ${x?.error ?? "አባልነት አልተሳካም።"}`); setTimeout(() => setPubSubMsg(""), 3500); }
    async function openEvent(id) { const r = await api(`/api/events/${id}`); if (r.ok) {
        const x = await r.json();
        if (x.data) {
            setSelectedEvent(x.data);
            setEventId(id);
        }
    } }
    async function loadCommunityMembers() { if (!communityId)
        return; const r = await api(`/api/communities/${communityId}/members`); if (r.ok) {
        const x = await r.json();
        setCommunityMembers(Array.isArray(x?.data) ? x.data : (x?.data?.items ?? []));
    } }
    async function searchMyPosts() { const term = communityAttachQ.trim(); const r = await api(`/api/me/posts?q=${encodeURIComponent(term)}&limit=8`); if (r.ok) {
        const x = await r.json();
        setMyPostMatches(x?.data?.items ?? []);
    } }
    async function attachCommunityPost(postId) { if (!communityId)
        return; const r = await api(`/api/communities/${communityId}/posts/${postId}`, { method: "POST" }); if (r.ok) {
        void openCommunity(communityId);
    } }
    async function detachCommunityPost(postId) { if (!communityId)
        return; const r = await api(`/api/communities/${communityId}/posts/${postId}`, { method: "DELETE" }); if (r.ok) {
        setCommunityPosts(v => v.filter(x => x.id !== postId));
    } }
    async function setCommunityModerator(userId, makeModerator) { if (!communityId)
        return; const r = await api(`/api/communities/${communityId}/members/${userId}/moderator`, { method: makeModerator ? "POST" : "DELETE" }); if (r.ok)
        void loadCommunityMembers(); }
    const displayProfile = authorId ? profile : null;
    React.useEffect(() => { if (tab === "opportunities") {
        void api(`/api/opportunities?q=${encodeURIComponent(opportunityQ)}&type=${encodeURIComponent(opportunityType)}&category=${encodeURIComponent(opportunityCategory)}&page=1&limit=20`).then(r => r.ok ? r.json() : null).then(x => { if (x?.data)
            setOpportunities(x.data.items ?? []); }).catch(() => undefined);
    } }, [tab, opportunityQ, opportunityType, opportunityCategory]);
    React.useEffect(() => { if (tab === "communities") {
        void api(`/api/communities?q=${encodeURIComponent(communityQ)}&page=1&limit=20`).then(r => r.ok ? r.json() : null).then(x => { if (x?.data) {
            setCommunities(x.data.items ?? []);
        } }).catch(() => undefined);
    } }, [tab, communityQ]);
    React.useEffect(() => { if (communityId) {
        setCommunityPosts([]);
        setCommunityPage(1);
        void api(`/api/communities/${communityId}/posts?page=1&limit=12`).then(r => r.ok ? r.json() : null).then(x => { if (x?.data) {
            setCommunityPosts(x.data.items ?? []);
            setCommunityHasMore(!!x.data.hasMore);
        } }).catch(() => undefined);
    } }, [communityId]);
    async function openCommunity(id) { const r = await api(`/api/communities/${id}`); if (r.ok) {
        const x = await r.json();
        if (x.data) {
            setSelectedCommunity(x.data);
            setCommunityId(id);
            if (x.data.ownerId === profile?.id || x.data.memberRole === "OWNER" || x.data.memberRole === "MODERATOR") {
                void api(`/api/communities/${id}/members`).then(a => a.ok ? a.json() : null).then(m => { if (m)
                    setCommunityMembers(Array.isArray(m?.data) ? m.data : (m?.data?.items ?? [])); }).catch(() => undefined);
            }
            else
                setCommunityMembers([]);
        }
    } }
    async function toggleCommunity(c) { const endpoint = c.joined ? `/api/communities/${c.id}/leave` : `/api/communities/${c.id}/join`; const r = await api(endpoint, { method: "POST" }); if (r.ok) {
        setCommunities(v => v.map(x => x.id === c.id ? { ...x, joined: !c.joined, _count: { ...x._count, members: Math.max(0, x._count.members + (c.joined ? -1 : 1)) } } : x));
    } }
    async function openOpportunity(id) { const r = await api(`/api/opportunities/${id}`); if (r.ok) {
        const x = await r.json();
        if (x.data) {
            setSelectedOpportunity(x.data);
            setOpportunityId(id);
        }
    } }
    async function toggleOpportunity(o) { const r = await api(`/api/opportunities/${o.id}/save`, { method: "POST" }); if (r.ok) {
        const x = await r.json();
        setOpportunities(v => v.map(item => item.id === o.id ? { ...item, saved: !!x.data.saved, _count: { ...item._count, saves: Math.max(0, item._count.saves + (x.data.saved ? 1 : -1)) } } : item));
        if (selectedOpportunity?.id === o.id)
            setSelectedOpportunity({ ...selectedOpportunity, saved: !!x.data.saved, _count: { ...selectedOpportunity._count, saves: Math.max(0, selectedOpportunity._count.saves + (x.data.saved ? 1 : -1)) } });
    } }
    // Audit fix #10: saved opportunities load into their own list (used by the dedicated screen).
    async function loadSavedOpportunities() { const r = await api("/api/me/opportunities/saved"); if (r.ok) {
        const x = await r.json();
        const items = Array.isArray(x.data) ? x.data : [];
        setOpportunitySaved(items);
    } }
    async function createOpportunity() { if (!newOpportunity.title.trim() || !newOpportunity.description.trim() || !newOpportunity.organization.trim())
        return; const r = await api("/api/opportunities", { method: "POST", body: JSON.stringify(newOpportunity) }); if (r.ok) {
        const x = await r.json();
        setOpportunities(v => [x.data, ...v]);
        setNewOpportunity({ title: "", description: "", organization: "", type: "JOB", category: "ስራ", location: "", deadline: "", contactText: "" });
        setShowOpportunityCreate(false);
    } }
    async function createCommunity() { if (!newCommunity.name.trim() || !newCommunity.description.trim())
        return; const r = await api("/api/communities", { method: "POST", body: JSON.stringify(newCommunity) }); if (r.ok) {
        setNewCommunity({ name: "", description: "", category: "ማህበረሰብ", city: "" });
        const x = await r.json();
        setCommunities(v => [x.data, ...v]);
        setCommunityId(x.data.id);
    } }
    React.useEffect(() => { if (tab === "events") {
        void Promise.all([api(`/api/events?q=${encodeURIComponent(eventQ)}&category=${encodeURIComponent(eventCategory)}&page=1&limit=20`), api(`/api/polls?q=${encodeURIComponent(pollQ)}&page=1&limit=20`), api("/api/quizzes")]).then(async ([er, pr, qr]) => { const [ex, px, qx] = await Promise.all([er.ok ? er.json() : null, pr.ok ? pr.json() : null, qr.ok ? qr.json() : null]); setEvents(ex?.data?.items ?? []); setPolls(px?.data?.items ?? []); setQuizzes(Array.isArray(qx?.data) ? qx.data : []); }).catch(() => undefined);
    } }, [tab, eventQ, eventCategory, pollQ]);
    async function refreshEventRsvp() { const cur = selectedEvent; if (!cur)
        return; const nx = await toggleEventRsvp(cur); if (nx)
        setSelectedEvent(nx); }
    async function toggleEventRsvp(e) { const r = e.rsvpStatus ? await api(`/api/events/${e.id}/rsvp`, { method: "DELETE" }) : await api(`/api/events/${e.id}/rsvp`, { method: "POST", body: JSON.stringify({ status: "GOING" }) }); if (r.ok) {
        const nx = { ...e, rsvpStatus: e.rsvpStatus ? null : "GOING", _count: { ...e._count, rsvps: Math.max(0, e._count.rsvps + (e.rsvpStatus ? -1 : 1)) } };
        setEvents(v => v.map(x => x.id === e.id ? nx : x));
        return nx;
    } }
    async function createEvent() { if (!newEvent.title.trim() || !newEvent.description.trim() || !newEvent.startsAt)
        return; const r = await api("/api/events", { method: "POST", body: JSON.stringify(newEvent) }); if (r.ok) {
        const x = await r.json();
        setEvents(v => [x.data, ...v]);
        setShowEventCreate(false);
        setNewEvent({ title: "", description: "", category: "ማህበረሰብ", location: "", startsAt: "", endsAt: "", isOnline: false, meetingText: "" });
    } }
    async function votePoll(p, optionId) { const selected = p.multiple ? [...new Set([...p.votedOptionIds, optionId])] : [optionId]; const r = await api(`/api/polls/${p.id}/vote`, { method: "POST", body: JSON.stringify({ optionIds: selected }) }); if (r.ok) {
        const x = await r.json();
        setPolls(v => v.map(item => item.id === p.id ? x.data : item));
    } }
    async function createPoll() { const options = newPoll.options.map(x => x.trim()).filter(Boolean); if (!newPoll.question.trim() || options.length < 2)
        return; const r = await api("/api/polls", { method: "POST", body: JSON.stringify({ ...newPoll, options }) }); if (r.ok) {
        const x = await r.json();
        setPolls(v => [x.data, ...v]);
        setShowPollCreate(false);
        setNewPoll({ question: "", description: "", options: ["", ""], multiple: false, closesAt: "" });
    } }
    async function submitQuiz(qz) { const answers = Object.entries(quizAnswers[qz.id] ?? {}).map(([questionId, optionId]) => ({ questionId, optionId })); const r = await api(`/api/quizzes/${qz.id}/answers`, { method: "POST", body: JSON.stringify({ answers }) }); if (r.ok) {
        const x = await r.json();
        setQuizScores(v => ({ ...v, [qz.id]: { score: x.data.score, total: x.data.total } }));
    } }
    async function loadMoreProfilePosts() { if (!authorId || !profileHasMore)
        return; const next = profilePage + 1; const r = await api(`/api/users/${authorId}/posts?page=${next}&limit=12`); if (r.ok) {
        const x = await r.json();
        setProfilePosts(v => [...v, ...(x.data?.items ?? [])]);
        setProfilePage(next);
        setProfileHasMore(!!x.data?.hasMore);
    } }
    React.useEffect(() => { if (tab === "messages")
        void loadMessages(); }, [tab]);
    React.useEffect(() => {
        let source = null;
        let cancelled = false;
        let reconnect = null;
        async function connect() {
            const r = await api("/api/realtime/token", { method: "POST" });
            if (!r.ok || cancelled)
                return;
            const x = await r.json();
            if (!x.data?.token || cancelled)
                return;
            source = new EventSource(`${API}/api/realtime/stream?token=${encodeURIComponent(x.data.token)}`);
            source.onopen = () => setRealtimeOnline(true);
            source.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === "message" && payload.message) {
                        if (messageUser && (payload.message.senderId === messageUser.id || payload.message.recipientId === messageUser.id)) {
                            setMessages(v => v.some(m => m.id === payload.message.id) ? v : [...v, payload.message]);
                            void api(`/api/messages/${messageUser.id}/read`, { method: "POST" });
                        }
                        void loadMessages();
                    }
                    if (payload.type === "typing" && payload.userId === messageUser?.id) {
                        setTypingUser(true);
                        window.setTimeout(() => setTypingUser(false), 2800);
                    }
                    if (payload.type === "repost")
                        void api("/api/me/notifications").then(r => r.ok ? r.json() : null).then(x => { if (x?.data) {
                            setNotifications(x.data.items);
                            setUnread(x.data.unread);
                        } });
                }
                catch { /* ignore malformed realtime events */ }
            };
            source.onerror = () => { setRealtimeOnline(false); source?.close(); if (!cancelled)
                reconnect = setTimeout(() => void connect(), 3000); };
        }
        void connect();
        return () => { cancelled = true; if (reconnect)
            clearTimeout(reconnect); source?.close(); setRealtimeOnline(false); };
    }, [messageUser?.id]);
    React.useEffect(() => {
        if (tab !== "messages" || !messageUser)
            return;
        let timer = null;
        const heartbeat = () => { void api("/api/me/presence", { method: "POST" }); };
        heartbeat();
        timer = setInterval(heartbeat, 30_000);
        return () => { if (timer)
            clearInterval(timer); };
    }, [tab, messageUser?.id]);
    return _jsxs("main", { children: [_jsxs("header", { children: [_jsxs("div", { className: "brand", children: [_jsx("img", { src: asset("genzi-icon-192.png"), alt: "GENZI", className: "brand-logo" }), _jsxs("div", { children: [_jsx("strong", { children: "GENZI \uD83C\uDDEA\uD83C\uDDF9" }), _jsx("small", { children: "\u12E8\u12A2\u1275\u12EE\u1335\u12EB \u12C8\u1323\u1276\u127D \u12F2\u1302\u1273\u120D \u121B\u1205\u1260\u1228\u1230\u1265" })] })] }), _jsx("button", { className: "compose-btn", onClick: () => setShowComposer(v => !v), children: showComposer ? "✕ ዝጋ" : "✍️ ልጥፍ ጻፍ" })] }), showComposer && _jsxs("section", { className: "composer", children: [_jsx("input", { maxLength: 140, value: newPost.title, onChange: e => setNewPost(v => ({ ...v, title: e.target.value })), placeholder: "\u122D\u12D5\u1235" }), _jsx("textarea", { maxLength: 4000, value: newPost.body, onChange: e => setNewPost(v => ({ ...v, body: e.target.value })), placeholder: "\u12ED\u12D8\u1275\u12CE\u1295 \u12ED\u133B\u1349..." }), _jsx("select", { value: newPost.category, onChange: e => setNewPost(v => ({ ...v, category: e.target.value })), children: ["entertainment", "trending", "music", "community", "money", "AI-tech", "fashion", "events", "gaming"].map(c => _jsx("option", { children: c }, c)) }), _jsx("input", { value: newPost.tags, onChange: e => setNewPost(v => ({ ...v, tags: e.target.value })), placeholder: "\u1273\u130E\u127D \u1233\u12ED\u1295 \u1260\u1270\u1208\u12EB\u12E9 (\u12A0\u121B\u122B\u132D)" }), composerError && _jsxs("p", { className: "post-error", children: ["\u26A0\uFE0F ", composerError] }), _jsx("button", { className: "primary", disabled: composerBusy || !newPost.title.trim() || !newPost.body.trim(), onClick: () => void createPost(), children: composerBusy ? "⏳ በመልክ ላይ..." : "🚀 አሳውቅ" })] }), eventId ? _jsxs("section", { className: "event-detail", children: [_jsx("button", { className: "back", onClick: () => { setEventId(null); setSelectedEvent(null); }, children: "\u2190 \u1270\u1218\u1208\u1235" }), selectedEvent ? _jsxs("div", { className: "event-full", children: [_jsxs("div", { className: "event-hero", children: [_jsx("span", { className: "event-cover", children: selectedEvent.coverEmoji }), _jsx("h2", { children: selectedEvent.title }), _jsxs("small", { children: [selectedEvent.category, " \u00B7 ", new Date(selectedEvent.startsAt).toLocaleString("am-ET"), selectedEvent.endsAt ? ` — ${new Date(selectedEvent.endsAt).toLocaleString("am-ET")}` : ""] })] }), _jsxs("div", { className: "event-body", children: [_jsx("p", { children: selectedEvent.description }), _jsxs("p", { children: [selectedEvent.isOnline ? "🌐 ኦንላይን ዝግጅት" : "📍 ", selectedEvent.isOnline ? (selectedEvent.meetingText ?? "") : ((selectedEvent.location ?? null) ?? "ቦታ አልተገለጸም")] }), selectedEvent.isOnline && selectedEvent.meetingText ? _jsx("a", { className: "meeting-link", href: selectedEvent.meetingText.startsWith("http") ? selectedEvent.meetingText : `https://${selectedEvent.meetingText}`, target: "_blank", rel: "noreferrer", children: "\uD83D\uDD17 \u1218\u1308\u1293\u129B \u12AD\u1348\u1275" }) : null, selectedEvent.organizer ? _jsxs("p", { children: ["\uD83D\uDC64 ", _jsx("b", { children: "\u12F0\u122B\u1305:" }), " ", selectedEvent.organizer.firstName ?? selectedEvent.organizer.username ?? "GENZI ተጠቃሚ"] }) : null, _jsxs("p", { children: ["\uD83D\uDC65 ", _jsx("b", { children: selectedEvent.rsvpCount ?? selectedEvent._count?.rsvps ?? 0 }), " \u1270\u1233\u1273\u134A\u12CE\u127D"] }), _jsx("button", { className: "primary", onClick: () => void refreshEventRsvp(), children: selectedEvent.rsvpStatus ? "✓ እሄዳለሁ (ሰርዝ)" : "🙋 እሄዳለሁ" })] })] }) : _jsx("p", { className: "empty", children: "\u23F3 \u1260\u1218\u132B\u1295 \u120B\u12ED..." })] }) : _jsxs(_Fragment, { children: [tab !== "profile" && tab !== "notifications" && tab !== "creator" && tab !== "opportunities" && tab !== "events" && tab !== "growth" && _jsxs(_Fragment, { children: [_jsxs("div", { className: "search", children: [_jsx("input", { value: q, onChange: e => setQ(e.target.value), placeholder: "\uD83D\uDD0E \u1348\u120D\u130D..." }), _jsx("button", { onClick: () => void load(true), children: "\u1348\u120D\u130D" })] }), _jsxs("div", { className: "feed-tabs", children: [_jsx("button", { className: tab === "home" ? "active" : undefined, onClick: () => navigate("home"), children: "\u1208\u12A5\u122D\u1235\u12CE" }), _jsx("button", { className: tab === "following" ? "active" : undefined, onClick: () => navigate("following"), children: "\u12E8\u121D\u12A8\u1270\u120B\u1278\u12CD" }), _jsx("button", { className: tab === "trending" ? "active" : undefined, onClick: () => navigate("trending"), children: "\uD83D\uDD25 \u1270\u12C8\u12F3\u1305" })] }), _jsxs("div", { className: "chips", children: [_jsx("button", { onClick: () => setCategory(""), children: "\u1201\u1209\u121D" }), ["entertainment", "trending", "music", "community", "money", "AI-tech", "fashion", "events", "gaming"].map(c => _jsx("button", { className: category === c ? "selected" : "", onClick: () => setCategory(c), children: c }, c))] }), tab === "home" && creators.length > 0 && _jsxs("section", { className: "discover", children: [_jsx("div", { className: "section-head", children: _jsx("h2", { children: "\u2728 \u1348\u1323\u122A\u12CE\u127D\u1295 \u12EB\u130D\u1299" }) }), creators.map(c => _jsx(CreatorCard, { creator: c, onOpen: openAuthor, onChanged: () => void api("/api/discover/creators?limit=6").then(r => r.json()).then(x => setCreators(x.data ?? [])), onMessage: (user) => { setMessageUser(user); setTab("messages"); void openConversation(user); } }, c.id))] }), loading && posts.length === 0 ? _jsx("p", { className: "empty", children: "\u23F3 \u1260\u1218\u132B\u1295 \u120B\u12ED..." }) : posts.length ? posts.map(p => _jsx(StandardPost, { post: p, onSave: () => tab === "saved" && void load(true), onOpenAuthor: openAuthor }, p.id)) : _jsx("p", { className: "empty", children: tab === "following" ? "የሚከተሏቸው ፈጣሪዎች ገና ልጥፍ አላደረጉም።" : "ምንም ይዘት አልተገኘም።" }), hasMore && _jsx("button", { className: "load-more", disabled: loading, onClick: () => void load(false), children: loading ? "⏳" : "ተጨማሪ ጫን" })] }), tab === "communities" && _jsxs("section", { className: "communities", children: [_jsx("div", { className: "section-head", children: _jsx("h2", { children: "\uD83C\uDFD8\uFE0F \u121B\u1205\u1260\u1228\u1230\u1266\u127D" }) }), _jsxs("div", { className: "community-create", children: [_jsx("h3", { children: "\u2728 \u121B\u1205\u1260\u1228\u1230\u1265 \u134D\u1320\u122D" }), _jsx("input", { value: newCommunity.name, maxLength: 60, onChange: e => setNewCommunity(v => ({ ...v, name: e.target.value })), placeholder: "\u12E8\u121B\u1205\u1260\u1228\u1230\u1265 \u1235\u121D" }), _jsx("textarea", { value: newCommunity.description, maxLength: 240, onChange: e => setNewCommunity(v => ({ ...v, description: e.target.value })), placeholder: "\u12A0\u132D\u122D \u1218\u130D\u1208\u132B" }), _jsx("input", { value: newCommunity.city, maxLength: 80, onChange: e => setNewCommunity(v => ({ ...v, city: e.target.value })), placeholder: "\u12A8\u1270\u121B (\u12A0\u121B\u122B\u132D)" }), _jsx("select", { value: newCommunity.category, onChange: e => setNewCommunity(v => ({ ...v, category: e.target.value })), children: ["ማህበረሰብ", "ዩኒቨርሲቲ", "ቴክኖሎጂ", "ሙዚቃ", "ጨዋታ", "ስራ", "ንግድ", "ፋሽን", "ከተማ"].map(c => _jsx("option", { children: c }, c)) }), _jsx("button", { className: "primary", onClick: () => void createCommunity(), children: "\u134D\u1320\u122D" })] }), _jsx("div", { className: "search", children: _jsx("input", { value: communityQ, onChange: e => setCommunityQ(e.target.value), placeholder: "\uD83D\uDD0E \u121B\u1205\u1260\u1228\u1230\u1265 \u1348\u120D\u130D..." }) }), communities.length ? communities.map(c => _jsxs("article", { className: "community-card", children: [_jsxs("button", { className: "community-main", onClick: () => void openCommunity(c.id), children: [_jsx("div", { className: "community-icon", children: c.coverEmoji }), _jsxs("div", { children: [_jsx("b", { children: c.name }), _jsxs("small", { children: [c.category, c.city ? ` · ${c.city}` : ""] }), _jsx("p", { children: c.description }), _jsxs("small", { children: ["\uD83D\uDC65 ", c._count.members, " \u00B7 \uD83D\uDCDD ", c._count.posts] })] })] }), _jsx("button", { onClick: () => void toggleCommunity(c), children: c.joined ? "✓ ተቀላቅለዋል" : "＋ ተቀላቀል" })] }, c.id)) : _jsx("p", { className: "empty", children: "\u121D\u1295\u121D \u121B\u1205\u1260\u1228\u1230\u1265 \u12A0\u120D\u1270\u1308\u1298\u121D\u1362" })] }), tab === "opportunities" && _jsxs("section", { className: "opportunities", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { children: "\uD83D\uDE80 \u12A5\u12F5\u120E\u127D" }), _jsx("button", { onClick: () => setShowOpportunityCreate(v => !v), children: showOpportunityCreate ? "✕ ዝጋ" : "＋ እድል አጋራ" })] }), _jsxs("div", { className: "chips", children: [_jsx("button", { className: !savedOpportunitiesView ? "selected" : "", onClick: () => setSavedOpportunitiesView(false), children: "\u1201\u1209\u121D \u12A5\u12F5\u120E\u127D" }), _jsxs("button", { className: savedOpportunitiesView ? "selected" : "", onClick: () => { setSavedOpportunitiesView(true); void loadSavedOpportunities(); }, children: ["\uD83D\uDD16 \u12E8\u1240\u1218\u1325\u12B3\u1278\u12CD (", opportunitySaved.length, ")"] })] }), showOpportunityCreate && _jsxs("div", { className: "opportunity-create", children: [_jsx("input", { value: newOpportunity.title, onChange: e => setNewOpportunity(v => ({ ...v, title: e.target.value })), placeholder: "\u12E8\u12A5\u12F5\u1209 \u122D\u12D5\u1235" }), _jsx("input", { value: newOpportunity.organization, onChange: e => setNewOpportunity(v => ({ ...v, organization: e.target.value })), placeholder: "\u12F5\u122D\u1305\u1275 / \u1270\u124B\u121D" }), _jsx("textarea", { value: newOpportunity.description, onChange: e => setNewOpportunity(v => ({ ...v, description: e.target.value })), placeholder: "\u12DD\u122D\u12DD\u122D \u1218\u130D\u1208\u132B" }), _jsx("button", { className: "primary", onClick: () => void createOpportunity(), children: "\u12A5\u12F5\u1209\u1295 \u12A0\u130B\u122B" })] }), savedOpportunitiesView ? _jsx(_Fragment, { children: opportunitySaved.length ? opportunitySaved.map(o => _jsxs("article", { className: "opportunity-card", children: [_jsxs("button", { className: "opportunity-main", onClick: () => void openOpportunity(o.id), children: [_jsx("div", { className: "opp-type", children: "\uD83D\uDD16" }), _jsxs("div", { children: [_jsx("b", { children: o.title }), _jsxs("small", { children: [o.organization, " \u00B7 ", o.category] }), _jsx("p", { children: o.description.slice(0, 150) }), _jsx("small", { children: o.deadline ? `⏰ ${new Date(o.deadline).toLocaleDateString("am-ET")}` : "" })] })] }), _jsx("button", { onClick: () => void toggleOpportunity(o).then(() => loadSavedOpportunities()), children: "\uD83D\uDD16" })] }, o.id)) : _jsx("p", { className: "empty", children: "\u12E8\u1240\u1218\u1327\u1278\u12CD \u12A5\u12F5\u120E\u127D \u12E8\u1209\u121D\u1362 \u12A8\u12A5\u12F5\u120E\u127D \u12DD\u122D\u12DD\u122D \uD83D\uDD16 \u12ED\u132B\u1291\u1362" }) }) : _jsxs(_Fragment, { children: [_jsx("div", { className: "search", children: _jsx("input", { value: opportunityQ, onChange: e => setOpportunityQ(e.target.value), placeholder: "\uD83D\uDD0E \u12A5\u12F5\u120D \u1348\u120D\u130D..." }) }), _jsxs("div", { className: "chips", children: [_jsx("button", { className: opportunityType === "" ? "selected" : "", onClick: () => setOpportunityType(""), children: "\u1201\u1209\u121D" }), ["JOB", "GIG", "INTERNSHIP", "SCHOLARSHIP", "TRAINING", "COMPETITION", "BUSINESS"].map(v => _jsx("button", { className: opportunityType === v ? "selected" : "", onClick: () => setOpportunityType(v), children: v }, v))] }), opportunities.map(o => _jsxs("article", { className: "opportunity-card", children: [_jsxs("button", { className: "opportunity-main", onClick: () => void openOpportunity(o.id), children: [_jsx("div", { className: "opp-type", children: "\uD83D\uDE80" }), _jsxs("div", { children: [_jsx("b", { children: o.title }), _jsxs("small", { children: [o.organization, " \u00B7 ", o.category] }), _jsx("p", { children: o.description.slice(0, 150) }), _jsxs("small", { children: ["\uD83D\uDD16 ", o._count.saves, o.verified ? " · ✓ የተረጋገጠ" : ""] })] })] }), _jsx("button", { onClick: () => void toggleOpportunity(o), children: o.saved ? "🔖" : "＋🔖" })] }, o.id)), opportunities.length === 0 && _jsx("p", { className: "empty", children: "\u121D\u1295\u121D \u12A5\u12F5\u120D \u12A0\u120D\u1270\u1308\u1298\u121D\u1362" })] })] }), tab === "events" && _jsxs("section", { className: "events-page", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { children: "\uD83C\uDF89 \u12DD\u130D\u1305\u1276\u127D & \u1270\u1233\u1275\u134E" }), _jsx("button", { onClick: () => setShowEventCreate(v => !v), children: showEventCreate ? "✕ ዝጋ" : "＋ ዝግጅት ፍጠር" })] }), showEventCreate && _jsxs("div", { className: "event-create", children: [_jsx("input", { maxLength: 120, value: newEvent.title, onChange: e => setNewEvent(v => ({ ...v, title: e.target.value })), placeholder: "\u12E8\u12DD\u130D\u1305\u1275 \u122D\u12D5\u1235" }), _jsx("textarea", { maxLength: 1500, value: newEvent.description, onChange: e => setNewEvent(v => ({ ...v, description: e.target.value })), placeholder: "\u1218\u130D\u1208\u132B" }), _jsx("select", { value: newEvent.category, onChange: e => setNewEvent(v => ({ ...v, category: e.target.value })), children: ["ሙዚቃ", "ስፖርት", "ቴክኖሎጂ", "ትምህርት", "ንግድ", "ማህበረሰብ", "መዝናኛ", "ሌላ"].map(c => _jsx("option", { children: c }, c)) }), _jsx("input", { value: newEvent.location, onChange: e => setNewEvent(v => ({ ...v, location: e.target.value })), placeholder: "\u1266\u1273 (\u12A0\u121B\u122B\u132D)" }), _jsxs("label", { children: ["\u1218\u1300\u1218\u122A\u12EB ", _jsx("input", { type: "datetime-local", value: newEvent.startsAt, onChange: e => setNewEvent(v => ({ ...v, startsAt: e.target.value })) })] }), _jsxs("label", { children: ["\u1218\u1328\u1228\u123B ", _jsx("input", { type: "datetime-local", value: newEvent.endsAt, onChange: e => setNewEvent(v => ({ ...v, endsAt: e.target.value })) })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: newEvent.isOnline, onChange: e => setNewEvent(v => ({ ...v, isOnline: e.target.checked })) }), " \u12A6\u1295\u120B\u12ED\u1295 \u12DD\u130D\u1305\u1275"] }), newEvent.isOnline && _jsx("input", { value: newEvent.meetingText, onChange: e => setNewEvent(v => ({ ...v, meetingText: e.target.value })), placeholder: "\u12E8\u1218\u1308\u1293\u129B \u1218\u1228\u1303" }), _jsx("button", { className: "primary", onClick: () => void createEvent(), children: "\u12DD\u130D\u1305\u1271\u1295 \u134D\u1320\u122D" })] }), _jsx("div", { className: "search", children: _jsx("input", { value: eventQ, onChange: e => setEventQ(e.target.value), placeholder: "\uD83D\uDD0E \u12DD\u130D\u1305\u1275 \u1348\u120D\u130D..." }) }), _jsx("div", { className: "chips", children: ["", "ሙዚቃ", "ስፖርት", "ቴክኖሎጂ", "ትምህርት", "ንግድ", "ማህበረሰብ", "መዝናኛ"].map(c => _jsx("button", { className: eventCategory === c ? "selected" : "", onClick: () => setEventCategory(c), children: c || "ሁሉም" }, c || "all")) }), _jsx("div", { className: "section-head", children: _jsx("h3", { children: "\uD83D\uDCC5 \u1218\u132A \u12DD\u130D\u1305\u1276\u127D" }) }), events.length ? events.map(e => _jsxs("article", { className: "event-card", children: [_jsx("div", { className: "event-icon", children: e.coverEmoji }), _jsxs("div", { className: "event-main", children: [_jsx("b", { className: "event-title-link", onClick: () => void openEvent(e.id), children: e.title }), _jsxs("small", { children: [e.category, " \u00B7 ", new Date(e.startsAt).toLocaleString("am-ET")] }), _jsx("p", { children: e.description }), _jsxs("small", { children: [e.isOnline ? "🌐 ኦንላይን" : `📍 ${e.location || "ቦታ አልተገለጸም"}`, " \u00B7 \uD83D\uDC65 ", e._count.rsvps] }), _jsx("button", { className: "primary", onClick: () => void toggleEventRsvp(e), children: e.rsvpStatus ? "✓ እሄዳለሁ" : "🙋 እሄዳለሁ" })] })] }, e.id)) : _jsx("p", { className: "empty", children: "\u121D\u1295\u121D \u1218\u132A \u12DD\u130D\u1305\u1275 \u12E8\u1208\u121D\u1362" }), _jsxs("div", { className: "section-head", children: [_jsx("h3", { children: "\uD83D\uDDF3\uFE0F \u121D\u122D\u132B\u12CE\u127D" }), _jsx("button", { onClick: () => setShowPollCreate(v => !v), children: showPollCreate ? "✕" : "＋ ምርጫ ፍጠር" })] }), showPollCreate && _jsxs("div", { className: "poll-create", children: [_jsx("input", { maxLength: 240, value: newPoll.question, onChange: e => setNewPoll(v => ({ ...v, question: e.target.value })), placeholder: "\u1325\u12EB\u1244" }), _jsx("textarea", { maxLength: 500, value: newPoll.description, onChange: e => setNewPoll(v => ({ ...v, description: e.target.value })), placeholder: "\u12A0\u132D\u122D \u1218\u130D\u1208\u132B (\u12A0\u121B\u122B\u132D)" }), newPoll.options.map((o, i) => _jsx("input", { value: o, maxLength: 120, onChange: e => setNewPoll(v => ({ ...v, options: v.options.map((x, j) => j === i ? e.target.value : x) })), placeholder: `ምርጫ ${i + 1}` }, i)), newPoll.options.length < 6 && _jsx("button", { onClick: () => setNewPoll(v => ({ ...v, options: [...v.options, ""] })), children: "\uFF0B \u121D\u122D\u132B \u1328\u121D\u122D" }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: newPoll.multiple, onChange: e => setNewPoll(v => ({ ...v, multiple: e.target.checked })) }), " \u1265\u12D9 \u121D\u122D\u132B \u12ED\u1348\u1240\u12F5"] }), _jsx("button", { className: "primary", onClick: () => void createPoll(), children: "\u121D\u122D\u132B\u12CD\u1295 \u134D\u1320\u122D" })] }), polls.map(p => _jsxs("article", { className: "poll-card", children: [_jsx("b", { children: p.question }), p.description && _jsx("p", { children: p.description }), p.options.map(o => { const pct = p._count.votes ? Math.round(o._count.votes / p._count.votes * 100) : 0; return _jsxs("button", { className: p.votedOptionIds.includes(o.id) ? "poll-option selected" : "poll-option", onClick: () => void votePoll(p, o.id), children: [_jsx("span", { children: o.text }), _jsxs("span", { children: [pct, "% \u00B7 ", o._count.votes] })] }, o.id); }), _jsxs("small", { children: ["\uD83D\uDDF3\uFE0F ", p._count.votes, " \u12F5\u121D\u133E\u127D", p.closesAt ? ` · ይዘጋል ${new Date(p.closesAt).toLocaleDateString("am-ET")}` : ""] })] }, p.id)), _jsx("div", { className: "section-head", children: _jsx("h3", { children: "\uD83E\uDDE0 \u12AD\u12CA\u12DD & \u1348\u1270\u1293" }) }), quizzes.map(qz => _jsxs("article", { className: "quiz-card", children: [_jsx("h3", { children: qz.title }), qz.description && _jsx("p", { children: qz.description }), qz.questions.map(qi => _jsxs("div", { className: "quiz-question", children: [_jsxs("b", { children: [qi.position + 1, ". ", qi.question] }), qi.options.map(o => _jsxs("label", { children: [_jsx("input", { type: "radio", name: `${qz.id}-${qi.id}`, checked: quizAnswers[qz.id]?.[qi.id] === o.id, onChange: () => setQuizAnswers(v => ({ ...v, [qz.id]: { ...(v[qz.id] ?? {}), [qi.id]: o.id } })) }), o.text] }, o.id))] }, qi.id)), _jsx("button", { className: "primary", onClick: () => void submitQuiz(qz), children: "\u1218\u120D\u1236\u127C\u1295 \u120B\u12AD" }), quizScores[qz.id] && _jsxs("p", { className: "score", children: ["\uD83C\uDFAF \u12CD\u1324\u1275: ", quizScores[qz.id]?.score, "/", quizScores[qz.id]?.total] })] }, qz.id))] }), tab === "gamification" && _jsxs("section", { className: "gamification", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { children: "\uD83C\uDFC6 \u12E8GENZI \u1328\u12CB\u1273" }), _jsx("button", { onClick: () => void api("/api/me/gamification").then(r => r.json()).then(x => setGamification(x.data)), children: "\u21BB \u12A0\u12F5\u1235" })] }), gamification ? _jsxs(_Fragment, { children: [_jsxs("div", { className: "xp-hero", children: [_jsx("div", { className: "level-badge", children: "\u2B50" }), _jsxs("div", { children: [_jsx("small", { children: "\u12F0\u1228\u1303" }), _jsx("b", { children: gamification.profile.level }), _jsxs("span", { children: [gamification.profile.xp, " XP"] })] }), _jsxs("div", { children: [_jsx("small", { children: "\u12F0\u1228\u1303 \u1260\u12DD\u122D\u12DD\u122D" }), _jsxs("b", { children: ["#", gamification.rank] })] })] }), _jsxs("div", { className: "streak-grid", children: [_jsxs("div", { children: ["\uD83D\uDD25 ", _jsx("b", { children: gamification.profile.currentStreak }), _jsx("small", { children: "\u12E8\u12A0\u1201\u1291 \u1270\u12A8\u1273\u1273\u12ED \u1240\u1295" })] }), _jsxs("div", { children: ["\uD83C\uDFC5 ", _jsx("b", { children: gamification.profile.longestStreak }), _jsx("small", { children: "\u12A8\u134D\u1270\u129B \u1270\u12A8\u1273\u1273\u12ED \u1240\u1295" })] })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83C\uDF96\uFE0F \u12E8\u1270\u1308\u1299 \u1263\u1306\u127D" }), _jsxs("div", { className: "badge-grid", children: [gamification.profile.badges.map(x => _jsxs("div", { className: "badge", children: [_jsx("span", { children: x.badge.emoji }), _jsx("b", { children: x.badge.name }), _jsx("small", { children: x.badge.description })] }, x.id)), !gamification.profile.badges.length && _jsx("p", { className: "empty", children: "\u1308\u1293 \u1263\u1305 \u12A0\u120D\u1270\u1308\u1298\u121D\u1362 \u1270\u1233\u1270\u1349 \u12A5\u1293 XP \u12EB\u130D\u1299!" })] })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83D\uDCC8 XP \u12E8\u121A\u12EB\u1235\u1308\u1299 \u1270\u130D\u1263\u122B\u1275" }), _jsx("p", { children: "\uD83D\uDCC5 \u12D5\u1208\u1273\u12CA \u1218\u130D\u1262\u12EB +5 \u00B7 \uD83D\uDCAC \u12A0\u1235\u1270\u12EB\u12E8\u1275 +3 \u00B7 \u2764\uFE0F \u121D\u120B\u123D +2 \u00B7 \uD83D\uDDF3\uFE0F \u121D\u122D\u132B +3" }), _jsx("p", { children: "\uD83C\uDFD8\uFE0F \u121B\u1205\u1260\u1228\u1230\u1265 +5 \u00B7 \uD83C\uDF89 RSVP +5 \u00B7 \uD83E\uDDE0 \u12AD\u12CA\u12DD +8 \u00B7 \uD83D\uDE80 \u12A5\u12F5\u120D \u121B\u1235\u1240\u1218\u1325 +3" })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83C\uDFC5 \u12E8GENZI \u12F0\u1228\u1303\u12CE\u127D" }), gamification.leaderboard.map((u, i) => _jsxs("div", { className: "leader-row", children: [_jsxs("span", { children: ["#", i + 1] }), _jsx("b", { children: u.firstName ?? u.username ?? "GENZI ተጠቃሚ" }), _jsxs("small", { children: ["Lv.", u.level, " \u00B7 ", u.xp, " XP"] })] }, u.id))] })] }) : _jsx("p", { className: "empty", children: "\u23F3 \u1260\u1218\u132B\u1295 \u120B\u12ED..." })] }), tab === "monetization" && _jsxs("section", { className: "monetization", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { children: "\uD83D\uDCB0 \u12E8GENZI \u12A2\u12AE\u1296\u121A" }), _jsx("button", { onClick: () => void Promise.all([api("/api/me/monetization"), api("/api/me/creator-earnings")]).then(async ([a, b]) => { setMonetization((await a.json()).data); setEarnings((await b.json()).data); }), children: "\u21BB \u12A0\u12F5\u1235" })] }), _jsxs("div", { className: "coin-hero", children: [_jsxs("div", { children: [_jsx("small", { children: "GENZI Coins" }), _jsxs("b", { children: ["\uD83E\uDE99 ", monetization?.balanceCoins ?? 0] })] }), _jsx("p", { children: "\u12E8\u12CD\u1235\u1325 \u121D\u1295\u12DB\u122C \u2014 \u12A0\u1201\u1295 \u1208\u1219\u12A8\u122B/\u123D\u120D\u121B\u1275 \u1265\u127B\u1362 \u12A5\u12CD\u1290\u1270\u129B \u12AD\u134D\u12EB \u1260\u128B\u120B \u1260payment adapter \u12ED\u1308\u1293\u129B\u120D\u1362" })] }), _jsxs("div", { className: "metric-grid", children: [_jsxs("div", { children: [_jsx("b", { children: monetization?.receivedTips ?? 0 }), _jsx("small", { children: "\u12E8\u1270\u1240\u1260\u1209\u1275 \u121D\u12AD\u122E\u127D" })] }), _jsxs("div", { children: [_jsx("b", { children: earnings?.contentRevenue ?? 0 }), _jsx("small", { children: "\u12E8\u12ED\u12D8\u1275 \u1308\u1262" })] }), _jsxs("div", { children: [_jsx("b", { children: earnings?.subscriptionRevenue ?? 0 }), _jsx("small", { children: "\u12E8\u12A0\u1263\u120D\u1290\u1275 \u1308\u1262" })] }), _jsxs("div", { children: [_jsx("b", { children: earnings?.activeSubscribers ?? 0 }), _jsx("small", { children: "\u1295\u1241 \u12F0\u1295\u1260\u129E\u127D" })] })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83C\uDF81 \u1348\u1323\u122A\u12CE\u127D\u1295 \u12ED\u12F0\u130D\u1349" }), _jsx("p", { children: "\u12A8\u1348\u1323\u122A \u1355\u122E\u134B\u12ED\u120D \u12C8\u12ED\u121D \u120D\u1325\u134D \u120B\u12ED \uD83E\uDE99 Tip \u1218\u120B\u12AD \u12ED\u127D\u120B\u1209\u1362" }), _jsx("p", { children: "\uD83D\uDD10 Paid content \u12A5\u1293 creator subscriptions \u1260GENZI Coins \u12ED\u1230\u122B\u1209\u1362" })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83E\uDDFE \u12E8\u12A5\u122D\u1235\u12CE \u12A5\u1295\u1245\u1235\u1243\u1234" }), _jsxs("p", { children: ["\u12E8\u120B\u12A9\u1275: \uD83E\uDE99 ", monetization?.sentTips ?? 0, " \u00B7 \u12E8\u1270\u1308\u12D9 \u12ED\u12D8\u1276\u127D: ", monetization?.purchases ?? 0, " \u00B7 \u1295\u1241 subscriptions: ", monetization?.activeSubscriptions ?? 0] })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83D\uDCBC \u12E8\u12F0\u1295\u1265 \u1273\u122A\u12AD (Wallet)" }), walletTx.length ? walletTx.slice(0, 30).map(t => _jsxs("div", { className: "tx-row", children: [_jsxs("span", { children: [t.type === "TIP_SENT" ? "📤 ሽልማት ላኩ" : t.type === "TIP_RECEIVED" ? "📥 ሽልማት ተቀበሉ" : t.type === "PURCHASE" ? "🛒 ግዢ" : t.type === "SUBSCRIPTION" ? "⭐ አባልነት" : t.type === "REFERRAL_REWARD" ? "🎁 ግብዣ ሽልማት" : t.type === "ADMIN_GRANT" ? "🏦 አድሚን" : "•", " ", t.type] }), _jsxs("b", { className: t.amount >= 0 ? "pos" : "neg", children: [t.amount >= 0 ? "+" : "", t.amount, " \uD83E\uDE99"] }), _jsx("small", { children: new Date(t.createdAt).toLocaleString("am-ET") })] }, t.id)) : _jsx("p", { className: "empty", children: "\u1308\u1293 \u130D\u1265\u12ED\u1275 \u12E8\u1208\u121D\u1362" })] })] }), tab === "growth" && _jsxs("section", { className: "growth", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { children: "\uD83D\uDE80 \u12E8GENZI \u12A5\u12F5\u1308\u1275" }), _jsx("button", { onClick: () => void api("/api/me/growth").then(r => r.json()).then(x => setGrowth(x.data)), children: "\u21BB \u12A0\u12F5\u1235" })] }), growth ? _jsxs(_Fragment, { children: [_jsxs("div", { className: "growth-hero", children: [_jsx("span", { children: "\uD83D\uDE80" }), _jsxs("div", { children: [_jsx("small", { children: "\u12E8\u1218\u130B\u1260\u12E3 \u12AE\u12F5" }), _jsx("b", { children: growth.code }), _jsx("p", { children: "\u1313\u12F0\u129E\u127D\u12CE\u1295 \u12C8\u12F0 GENZI \u12ED\u130B\u1265\u12D9\u1362" })] })] }), _jsxs("div", { className: "metric-grid", children: [_jsxs("div", { children: [_jsx("b", { children: growth.referrals }), _jsx("small", { children: "\u12E8\u1270\u1233\u12A9 \u130D\u1265\u12E3\u12CE\u127D" })] }), _jsxs("div", { children: [_jsx("b", { children: growth.rewardCoins }), _jsx("small", { children: "\u12E8\u1270\u1308\u1299 Coins" })] }), _jsxs("div", { children: [_jsx("b", { children: growth.shareCount }), _jsx("small", { children: "\u12E8\u1270\u1218\u12D8\u1308\u1261 \u121B\u130B\u122B\u1276\u127D" })] }), _jsxs("div", { children: [_jsx("b", { children: growth.rank ?? "—" }), _jsx("small", { children: "\u12E8\u130D\u1265\u12E3 \u12F0\u1228\u1303" })] })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83D\uDD17 \u12E8\u1218\u130B\u1260\u12E3 \u120A\u1295\u12AD" }), growth.shareLink ? _jsxs(_Fragment, { children: [_jsx("input", { readOnly: true, value: growth.shareLink }), _jsx("button", { className: "primary", onClick: () => { void navigator.clipboard?.writeText(growth.shareLink ?? ""); void api("/api/me/growth/share", { method: "POST", body: JSON.stringify({ type: "REFERRAL_LINK" }) }); }, children: "\uD83D\uDCCB \u120A\u1295\u12A9\u1295 \u1245\u12F3" }), _jsx("button", { onClick: () => { void navigator.share?.({ title: "GENZI 🇪🇹", text: "GENZIን ይቀላቀሉ!", ...(growth.shareLink ? { url: growth.shareLink } : {}) }); void api("/api/me/growth/share", { method: "POST", body: JSON.stringify({ type: "REFERRAL_LINK" }) }); }, children: "\uD83D\uDCE4 \u12A0\u130B\u122B" })] }) : _jsx("p", { className: "empty", children: "\u12E8Telegram bot username \u1260\u121B\u12CB\u1240\u122D \u120B\u12ED \u1290\u12CD\u1362" })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83C\uDF81 \u12E8\u1313\u12F0\u129B \u12AE\u12F5 \u12ED\u1320\u1240\u1219" }), _jsx("input", { maxLength: 24, value: growthCode, onChange: e => setGrowthCode(e.target.value), placeholder: "GZxxxxxxxx" }), _jsx("button", { className: "primary", onClick: () => void api("/api/me/growth/claim", { method: "POST", body: JSON.stringify({ code: growthCode }) }).then(async (r) => { const x = await r.json(); if (r.ok) {
                                                    setGrowthCode("");
                                                    void api("/api/me/growth").then(a => a.json()).then(y => setGrowth(y.data));
                                                    alert(x.data?.completed ? "🎉 የመጋበዣ ሽልማቱ ተጠናቋል።" : "ይህን ኮድ ከዚህ በፊት ተጠቅመዋል።");
                                                }
                                                else
                                                    alert(x.error ?? "ኮዱ አልተገኘም።"); }), children: "\uD83C\uDF81 \u12AE\u12F1\u1295 \u1270\u1320\u1240\u121D" }), _jsx("small", { children: "\u12E8\u122B\u1235\u12CE\u1295 \u12AE\u12F5 \u1218\u1320\u1240\u121D \u12A0\u12ED\u127B\u120D\u121D\u1362 \u12A0\u1295\u12F5 \u1270\u1320\u1243\u121A \u12A0\u1295\u12F5 \u130A\u12DC \u1265\u127B \u12ED\u130B\u1260\u12DB\u120D\u1362" })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83D\uDCA1 \u12E8GENZI \u12E8\u12A5\u12F5\u1308\u1275 \u123D\u120D\u121B\u1275" }), _jsx("p", { children: "\uD83D\uDC64 \u1208\u12A5\u122D\u1235\u12CE \u12E8\u121A\u1240\u120B\u1240\u120D \u12A0\u12F2\u1235 \u1270\u1320\u1243\u121A: +50 Coins" }), _jsx("p", { children: "\uD83C\uDF81 \u1260\u1218\u130B\u1260\u12E3 \u12E8\u121A\u1240\u120B\u1240\u120D \u12A0\u12F2\u1235 \u1270\u1320\u1243\u121A: +20 Coins" }), _jsx("p", { className: "muted", children: "Coins \u12E8GENZI \u12CD\u1235\u1323\u12CA \u12E8\u1219\u12A8\u122B/\u123D\u120D\u121B\u1275 \u12AD\u122C\u12F2\u1275 \u1293\u1278\u12CD\u1362" })] })] }) : _jsx("p", { className: "empty", children: "\u23F3 \u1260\u1218\u132B\u1295 \u120B\u12ED..." })] }), tab === "messages" && _jsxs("section", { className: "messages", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { children: "\uD83D\uDCAC \u12E8\u130D\u120D \u1218\u120D\u12D5\u12AD\u1276\u127D" }), _jsx("button", { onClick: () => void loadMessages(), children: "\u21BB \u12A0\u12F5\u1235" })] }), _jsxs("div", { className: "message-layout", children: [_jsx("div", { className: "conversation-list", children: conversations.length ? conversations.map(c => _jsxs("button", { className: messageUser?.id === c.other.id ? "conversation active" : "conversation", onClick: () => void openConversation(c.other), children: [_jsx("div", { className: "avatar", children: c.other.firstName?.slice(0, 1) ?? "G" }), _jsxs("div", { children: [_jsx("b", { children: [c.other.firstName, c.other.lastName].filter(Boolean).join(" ") || "GENZI ተጠቃሚ" }), _jsxs("small", { children: ["@", c.other.username ?? "genzi_user"] }), _jsx("p", { children: c.lastMessage?.body ?? "እስካሁን መልዕክት የለም።" })] }), c.unread ? _jsx("span", { className: "unread-dot", children: "\u25CF" }) : null] }, c.id)) : _jsx("p", { className: "empty", children: "\u1308\u1293 \u12CD\u12ED\u12ED\u1275 \u12E8\u1208\u12CE\u1275\u121D\u1362 \u12A8\u1348\u1323\u122A \u1355\u122E\u134B\u12ED\u120D \u1218\u120D\u12D5\u12AD\u1275 \u12ED\u1300\u121D\u1229\u1362" }) }), _jsx("div", { className: "chat-panel", children: messageUser ? _jsxs(_Fragment, { children: [_jsxs("div", { className: "chat-header", children: [_jsx("div", { className: "avatar", children: messageUser.firstName?.slice(0, 1) ?? "G" }), _jsxs("div", { children: [_jsx("b", { children: [messageUser.firstName, messageUser.lastName].filter(Boolean).join(" ") || "GENZI ተጠቃሚ" }), _jsxs("small", { children: ["@", messageUser.username ?? "genzi_user"] }), _jsx("small", { className: "presence-status", children: recipientOnline === null ? (realtimeOnline ? "🔄 በመፈተሽ ላይ…" : "⚪ ከመስመር ውጭ") : recipientOnline ? (typingUser ? "⌨️ እየጻፉ ነው…" : "🟢 በመስመር ላይ") : "⚪ ከመስመር ውጭ" })] })] }), _jsxs("div", { className: "chat-messages", children: [messages.map(m => _jsxs("div", { className: m.senderId === profile?.id ? "bubble mine" : "bubble", children: [_jsx("p", { children: m.body }), _jsx("small", { children: new Date(m.createdAt).toLocaleString("am-ET") })] }, m.id)), !messages.length && _jsx("p", { className: "empty", children: "\u12CD\u12ED\u12ED\u1271\u1295 \u12ED\u1300\u121D\u1229\u1362" })] }), _jsxs("div", { className: "message-compose", children: [_jsx("input", { maxLength: 1000, value: messageBody, onChange: e => { setMessageBody(e.target.value); if (messageUser)
                                                                void api(`/api/messages/${messageUser.id}/typing`, { method: "POST", body: "{}" }); }, onKeyDown: e => { if (e.key === "Enter")
                                                                void sendDirectMessage(); }, placeholder: "\u1218\u120D\u12D5\u12AD\u1275 \u12ED\u133B\u1349..." }), _jsx("button", { className: "primary", onClick: () => void sendDirectMessage(), children: "\u120B\u12AD" })] })] }) : _jsx("div", { className: "empty", children: "\uD83D\uDCAC \u12CD\u12ED\u12ED\u1275 \u1208\u1218\u1300\u1218\u122D \u12A8\u130D\u122B \u1260\u12A9\u120D \u1270\u1320\u1243\u121A \u12ED\u121D\u1228\u1321\u1362" }) })] })] }), tab === "notifications" && _jsxs("section", { className: "notifications", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { children: "\uD83D\uDD14 \u121B\u1233\u12C8\u1242\u12EB\u12CE\u127D" }), _jsx("button", { onClick: () => void api("/api/me/notifications/read", { method: "POST", body: "{}" }).then(() => { setUnread(0); setNotifications(v => v.map(n => ({ ...n, readAt: new Date().toISOString() }))); }), children: "\u1201\u1209\u1295\u121D \u12A0\u1295\u1265\u1265" })] }), notifications.length ? notifications.map(n => _jsxs("button", { className: n.readAt ? "notification" : "notification unread", onClick: () => void openNotification(n), children: [_jsx("b", { children: n.title }), _jsx("p", { children: n.body }), _jsxs("small", { children: [new Date(n.createdAt).toLocaleString("am-ET"), n.postId ? " · ልጥፉን ክፈት" : ""] })] }, n.id)) : _jsx("p", { className: "empty", children: "\u121D\u1295\u121D \u121B\u1233\u12C8\u1242\u12EB \u12E8\u1208\u121D\u1362" })] }), tab === "creator" && _jsxs("section", { className: "creator-dashboard", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { children: "\uD83D\uDCCA \u12E8\u1348\u1323\u122A \u12F3\u123D\u1266\u122D\u12F5" }), _jsx("button", { onClick: () => void api("/api/me/creator-dashboard").then(r => r.json()).then(x => setDashboard(x.data)), children: "\u21BB \u12A0\u12F5\u1235" })] }), dashboard ? _jsxs(_Fragment, { children: [_jsxs("div", { className: "metric-grid", children: [_jsxs("div", { children: [_jsx("b", { children: dashboard.totalPosts }), _jsx("small", { children: "\u120D\u1325\u134E\u127D" })] }), _jsxs("div", { children: [_jsx("b", { children: dashboard.totalViews }), _jsx("small", { children: "\u12A5\u12ED\u1273\u12CE\u127D" })] }), _jsxs("div", { children: [_jsx("b", { children: dashboard.totalReactions }), _jsx("small", { children: "\u121D\u120B\u123E\u127D" })] }), _jsxs("div", { children: [_jsx("b", { children: dashboard.totalComments }), _jsx("small", { children: "\u12A0\u1235\u1270\u12EB\u12E8\u1276\u127D" })] }), _jsxs("div", { children: [_jsx("b", { children: dashboard.followers }), _jsx("small", { children: "\u1270\u12A8\u1273\u12EE\u127D" })] }), _jsxs("div", { children: [_jsx("b", { children: dashboard.following }), _jsx("small", { children: "\u12E8\u121D\u1275\u12A8\u1270\u120B\u1278\u12CD" })] })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\u26A1 \u121D\u120B\u123E\u127D" }), _jsxs("p", { children: ["\uD83D\uDC4D ", dashboard.reactionCounts.LIKE, " \u00B7 \uD83D\uDD25 ", dashboard.reactionCounts.FIRE, " \u00B7 \u2764\uFE0F ", dashboard.reactionCounts.LOVE] })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83C\uDFC6 \u1260\u12A5\u12ED\u1273 \u12E8\u1260\u1208\u1321 \u120D\u1325\u134E\u127D" }), dashboard.topPosts.length ? dashboard.topPosts.map(p => _jsxs("div", { className: "top-post", children: [_jsx("b", { children: p.title }), _jsxs("span", { children: ["\uD83D\uDC41\uFE0F ", p.views, " \u00B7 ", p.category] })] }, p.id)) : _jsx("p", { className: "empty", children: "\u1308\u1293 \u12E8\u121A\u1273\u12ED \u12E8\u1208\u121D\u1362" })] })] }) : _jsx("p", { className: "empty", children: "\u23F3 \u1260\u1218\u132B\u1295 \u120B\u12ED..." })] }), tab === "profile" && _jsxs("section", { className: "profile", children: [_jsx("div", { className: "avatar", children: profile?.firstName?.slice(0, 1) ?? "G" }), _jsxs("h2", { children: [profile?.firstName ?? "GENZI ተጠቃሚ", " ", profile?.lastName ?? ""] }), _jsxs("p", { className: "muted", children: ["@", profile?.username ?? "genzi_user"] }), _jsx("label", { children: "\u1235\u1208 \u12A5\u1294" }), _jsx("textarea", { maxLength: 160, value: bio, onChange: e => setBio(e.target.value), placeholder: "\u1235\u1208 \u12A5\u122D\u1235\u12CE \u12A0\u132D\u122D \u1218\u130D\u1208\u132B..." }), _jsx("button", { onClick: () => void saveProfile(), children: "\uD83D\uDCBE \u1355\u122E\u134B\u12ED\u120D \u12A0\u1235\u1240\u121D\u1325" }), _jsxs("div", { className: "profile-card", children: [_jsx("span", { children: "\uD83D\uDEE1\uFE0F \u121A\u1293" }), _jsx("b", { children: profile?.role ?? "USER" })] }), _jsxs("div", { className: "stats", children: [_jsxs("span", { children: ["\uD83D\uDCDD ", _jsx("b", { children: myPosts.length }), " \u120D\u1325\u134E\u127D"] }), _jsxs("span", { children: ["\uD83D\uDC65 ", _jsx("b", { children: profile?._count?.followers ?? 0 }), " \u1270\u12A8\u1273\u12EE\u127D"] }), _jsxs("span", { children: ["\uD83D\uDD16 ", _jsx("b", { children: opportunitySaved.length }), " \u12E8\u1240\u1218\u1321 \u12A5\u12F5\u120E\u127D"] }), _jsxs("span", { children: ["\uD83E\uDE99 ", _jsx("b", { children: monetization?.balanceCoins ?? growth?.balanceCoins ?? 0 }), " Coins"] })] }), _jsxs("div", { className: "profile-card", children: [_jsx("h3", { children: "\uD83D\uDCDD \u12E8\u12A5\u1294 \u120D\u1325\u134E\u127D" }), myPosts.length ? myPosts.map(p => _jsx(StandardPost, { post: p, onOpenAuthor: openAuthor }, p.id)) : _jsx("p", { className: "empty", children: "\u1308\u1293 \u120D\u1325\u134D \u12A0\u120D\u133B\u1349\u121D \u2014 \u12A8\u120B\u12ED \u270D\uFE0F \u12ED\u1300\u121D\u1229\u1362" })] }), _jsxs("div", { className: "profile-links", children: [_jsx("button", { onClick: () => navigate("saved"), children: "\uD83D\uDD16 \u12E8\u1270\u1240\u1218\u1321 \u120D\u1325\u134E\u127D" }), _jsx("button", { onClick: () => { navigate("opportunities"); setSavedOpportunitiesView(true); void loadSavedOpportunities(); }, children: "\uD83D\uDE80 \u12E8\u1240\u1218\u1321 \u12A5\u12F5\u120E\u127D" }), _jsx("button", { onClick: () => navigate("gamification"), children: "\uD83C\uDFC6 XP & \u12F0\u1228\u1303" }), _jsx("button", { onClick: () => navigate("creator"), children: "\uD83D\uDCCA \u12E8\u1348\u1323\u122A \u12F3\u123D\u1266\u122D\u12F5" }), _jsx("button", { onClick: () => navigate("monetization"), children: "\uD83D\uDCB0 \u1308\u1262 & \u12A0\u122D\u1295\u1266" }), _jsx("button", { onClick: () => navigate("growth"), children: "\uD83C\uDF81 \u130D\u1265\u12E3" })] })] })] }), _jsxs("nav", { children: [_jsxs("button", { className: tab === "home" ? "active" : "", onClick: () => navigate("home"), children: ["\uD83C\uDFE0", _jsx("small", { children: "\u1218\u1290\u123B" })] }), _jsxs("button", { className: tab === "communities" ? "active" : "", onClick: () => navigate("communities"), children: ["\uD83C\uDFD8\uFE0F", _jsx("small", { children: "\u121B\u1205\u1260\u1228\u1230\u1265" })] }), _jsxs("button", { className: tab === "opportunities" ? "active" : "", onClick: () => navigate("opportunities"), children: ["\uD83D\uDE80", _jsx("small", { children: "\u12A5\u12F5\u120E\u127D" })] }), _jsxs("button", { className: tab === "events" ? "active" : "", onClick: () => navigate("events"), children: ["\uD83C\uDF89", _jsx("small", { children: "\u12DD\u130D\u1305\u1276\u127D" })] }), _jsxs("button", { className: tab === "following" ? "active" : "", onClick: () => navigate("following"), children: ["\uD83D\uDC65", _jsx("small", { children: "\u12E8\u121D\u12A8\u1270\u120B\u1278\u12CD" })] }), _jsxs("button", { className: tab === "saved" ? "active" : "", onClick: () => navigate("saved"), children: ["\uD83D\uDD16", _jsx("small", { children: "\u12E8\u1270\u1240\u1218\u1321" })] }), _jsxs("button", { className: tab === "messages" ? "active" : "", onClick: () => navigate("messages"), children: ["\uD83D\uDCAC", _jsxs("small", { children: ["\u1218\u120D\u12D5\u12AD\u1275 ", messageUnread ? `(${messageUnread})` : ""] })] }), _jsxs("button", { className: tab === "notifications" ? "active" : "", onClick: () => navigate("notifications"), children: ["\uD83D\uDD14", _jsxs("small", { children: ["\u121B\u1233\u12C8\u1242\u12EB ", unread ? `(${unread})` : ""] })] }), _jsxs("button", { className: tab === "profile" ? "active" : "", onClick: () => navigate("profile"), children: ["\uD83D\uDC64", _jsx("small", { children: "\u1355\u122E\u134B\u12ED\u120D" })] }), _jsxs("button", { className: tab === "creator" ? "active" : "", onClick: () => navigate("creator"), children: ["\uD83D\uDCCA", _jsx("small", { children: "\u1348\u1323\u122A" })] }), " ", _jsxs("button", { className: tab === "growth" ? "active" : undefined, onClick: () => navigate("growth"), children: ["\uD83D\uDE80", _jsx("small", { children: "\u12A5\u12F5\u1308\u1275" })] }), _jsxs("button", { className: tab === "monetization" ? "active" : "", onClick: () => navigate("monetization"), children: ["\uD83D\uDCB0", _jsx("small", { children: "\u1308\u1262" })] }), _jsxs("button", { className: tab === "gamification" ? "active" : "", onClick: () => navigate("gamification"), children: ["\uD83C\uDFC6", _jsx("small", { children: "\u1328\u12CB\u1273" })] })] })] });
}
window.Telegram?.WebApp?.ready();
window.Telegram?.WebApp?.expand();
createRoot(document.getElementById("root")).render(_jsx(App, {}));
