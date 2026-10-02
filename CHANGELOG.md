# v0.2.7 — Monetization & Creator Economy

- Added GENZI Coins wallet and ledger.
- Added creator tips, subscriptions, and paid content purchases.
- Added creator earnings metrics.
- Added owner-only promotional coin grants.
- Added monetization-ready Mini App UI.
- No paid APIs/services introduced.

# GENZI Changelog

## 0.2.6 — Admin & Analytics
- Central admin analytics API.
- 7–30 day operational activity series.
- User/content/community/opportunity/event/poll/quiz metrics.
- Content category and creator summaries.
- Moderation-action and report-reason breakdowns.
- Recent user operations table with restriction controls.
- Amharic-first admin tabs for overview, analytics, safety and users.
- No paid analytics services.


## v0.2.4 — Gamification
- XP, levels and persistent activity history
- Daily check-in streaks
- Badges and milestone awards
- Personal rank and top-20 leaderboard
- XP history API
- Gamification Mini App screen, Amharic-first
- XP hooks for views, reactions, follows, polls and quizzes
- Existing communities, opportunities, events and creator systems preserved
- No paid APIs or services

## v0.2.3 — Events, Polls & Interactive Content

- Added persistent events with categories, locations, online-event metadata, future-date validation, RSVP/interest state, and attendee counts.
- Added event discovery/search and Amharic-first Mini App UI.
- Added persistent polls with 2-6 options, single/multiple selection, vote replacement, live result percentages, closing dates, and authenticated voting.
- Added interactive quizzes with questions, options, correct-answer scoring, persistent user answers, and score feedback.
- Added creator/user event and poll creation flows.
- Added DELETE to CORS methods for RSVP cancellation.
- Preserved Communities, Opportunities, Creators, Following, Feed, Reactions, Comments, Bookmarks, Reports, Moderation, and Telegram authentication.
- No paid APIs or services introduced.

# Changelog

## v0.2.2
- Added Opportunities hub for jobs, freelance gigs, internships, scholarships, training, competitions, business and other opportunities.
- Added search and type/category filtering.
- Added persistent save/unsave for opportunities and saved-opportunity retrieval.
- Added opportunity detail view with deadline, organization, location and contact information.
- Added community member opportunity sharing with no user-entered external links.
- Added verified/active opportunity administration and HTTPS-only application links for admin-managed listings.
- Automatically hides expired opportunities from the discovery feed.
- Kept Amharic-first UX, Telegram authentication and zero-paid-service architecture.


## v0.2.1
- Added community moderator promotion/demotion controls for owners.
- Added community post membership notifications.
- Restricted cross-user community post attachment to community moderators/owners.
- Added public Communities module with Amharic-first discovery.
- Added community creation with predefined categories and optional city.
- Added persistent membership with join/leave and owner protection.
- Added community detail and paginated community feeds.
- Added community post attachment/removal permissions.
- Added Community and CommunityMember Prisma models and post-community relation.
- Kept Telegram authentication, creator features, moderation, reports, notifications, following and zero-paid-service architecture.

# Changelog

## v0.2.2
- Added Opportunities hub for jobs, freelance gigs, internships, scholarships, training, competitions, business and other opportunities.
- Added search and type/category filtering.
- Added persistent save/unsave for opportunities and saved-opportunity retrieval.
- Added opportunity detail view with deadline, organization, location and contact information.
- Added community member opportunity sharing with no user-entered external links.
- Added verified/active opportunity administration and HTTPS-only application links for admin-managed listings.
- Automatically hides expired opportunities from the discovery feed.
- Kept Amharic-first UX, Telegram authentication and zero-paid-service architecture.


## v0.1.9
- Added paginated For You, Following, and Trending feeds.
- Added creator discovery endpoint and ranked creator suggestions.
- Added single-post retrieval for notification/deep-link navigation.
- Added scalable page/limit metadata and hasMore responses.
- Kept Amharic-first UX and zero-paid-service architecture.

# GENZI Ethiopia Changelog

## v0.1.8
- Added persistent creator/user following.
- Added public creator profile data and follower counts.
- Added persistent in-app notifications for follows, comments and reactions.
- Added notification unread count and mark-all-read endpoint.
- Added follow controls to feed posts.
- Kept Telegram authentication, Amharic-first UX, moderation, reporting, reactions, comments, bookmarks and publishing.
- No paid APIs or services introduced.


## v0.2.0
- Creator dashboard with follower, post, view, reaction and comment analytics.
- Public creator profiles now show the creator's published posts with pagination.
- Creator analytics endpoint and creator post listing endpoint.
- Amharic-first creator navigation and metrics UI.

## v0.2.5 — Trust & Safety Hardening
- Added blocked/restricted account enforcement to authenticated Mini App requests.
- Added API burst rate limiting with Retry-After responses.
- Hardened text normalization against zero-width and basic Unicode/spacing evasion.
- Added stronger scam/fraud/OTP and safety monitoring patterns.
- Added automatic temporary restriction after repeated severe moderation violations.
- Added persistent safety-event admin inspection and account restriction controls.
- Added Trust & Safety operational documentation.
- Preserved all existing GENZI features and zero-paid-service constraint.


## v0.2.8 — Growth & Viral Loops

- Persistent Telegram-native referral codes and deep links.
- One-time referral attribution with self-referral protection.
- Internal GENZI Coin referral rewards (+50 inviter / +20 invitee).
- Share/copy event attribution with duplicate suppression.
- Personal growth dashboard with referrals, rewards, shares and referral rank.
- Referral-code claiming from the Mini App.
- Growth activity ledger and notifications.
- Added `TELEGRAM_BOT_USERNAME` configuration.
- Added `docs/GROWTH.md`.


## v0.2.9 — Production Infrastructure & Reliability
- Added structured JSON application logging without a paid logging service.
- Added liveness (`/health`) and database readiness (`/ready`) endpoints.
- Added protected operational diagnostics.
- Added production environment validation and secret hardening.
- Added Express trusted-proxy configuration for correct client IP handling behind reverse proxies.
- Hardened in-memory rate-limit bucket cleanup.
- Added Telegram webhook mode with secret-token validation and polling/webhook startup separation.
- Added graceful SIGINT/SIGTERM shutdown for Telegram, Prisma, and HTTP server.
- Added PostgreSQL-ready Prisma schema and PostgreSQL generation/push scripts while retaining SQLite development support.
- Added SQLite backup utility and production backup/migration guidance.
- Added Docker healthchecks.
- Added production operations documentation.
- No paid APIs or services added.

## v0.3.0 — Advanced Community & Social Layer
- Added persistent one-to-one direct messaging.
- Added conversation inbox with unread state and read receipts.
- Added message safety normalization and moderation gate.
- Added creator/profile-to-message entry point.
- Added persistent post reposts with toggle and counts.
- Added repost notifications to original authors.
- Preserved Telegram authentication, moderation, communities, opportunities, events, polls, quizzes, gamification, monetization and growth.


## v0.3.5 — Pre-Deployment Hardening
- Added `.dockerignore` (mirroring `.gitignore`: `.env`, `*.db`, `node_modules`, `dist`, `.git`). The Dockerfile's `COPY apps ./apps` had no ignore file, so any `.env`, SQLite database, or `node_modules` a developer happened to have inside `apps/` at build time would be baked into the image layers — extractable by anyone who can pull the image, even from a private registry.
- No paid APIs or services added.

## v0.3.4 — Moderator Security & Content Coverage
- Closed moderator-identity spoofing: report resolution and submission moderation actions now require a verified per-moderator session (`/moderatorlogin` in the bot → one-time code → `X-Moderator-Session` token), not just the shared admin API key plus a client-supplied header.
- Added `/promote` and `/demote` bot commands (OWNER-only) so moderators can actually be added without a manual database edit.
- `/api/media/:fileId` now requires a valid Telegram WebApp session — no longer an unauthenticated open proxy.
- Community, event, opportunity, poll, and quiz creation now run through the same content-moderation pipeline as posts/comments/DMs/confessions (new shared `enforceContentModeration` helper), instead of publishing instantly and unfiltered.
- Fixed the rate limiter to stop trusting a client-supplied `X-Forwarded-For` header unconditionally; it now only reflects a forwarded address when `TRUST_PROXY=true` and Express's own trust-proxy resolution says so, closing a rate-limit bypass.
- Admin panel updated: moderator Telegram-ID field replaced with a one-time-code verification flow.
- No paid APIs or services added.

## v0.3.3 — Confessions & Fixes
- Implemented the anonymous Confessions flow end-to-end: capture → moderation → preview/confirm → anonymous channel publication with sequential confession numbers and reaction-vote buttons (Approach / Forget it / Ask a friend / Stay single).
- Added Confession and ConfessionReaction Prisma models (SQLite and PostgreSQL schemas).
- Generalized ConversationSession to support either a post submission or a confession, so the post-creation flow and the confession flow no longer collide.
- Fixed a critical bug where every direct message was silently rejected: the safety check referenced a non-existent `action` field instead of `decision` and was missing its required `isAdmin` argument, so `POST /api/messages/:userId` always returned "message not sent" while nothing was actually saved. Direct messages now moderate correctly, with the same escalation (repeated-violation restriction, ban on hard violations) used elsewhere.
- No paid APIs or services added.

## v0.3.2 — Real-Time Social Experience
- Added zero-cost Server-Sent Events realtime transport.
- Added short-lived authenticated realtime tokens.
- Added live direct-message delivery without refresh.
- Added typing indicators for direct conversations.
- Added lightweight online presence and heartbeat tracking.
- Added realtime repost notification events.
- Added browser reconnect/fallback behavior in the Mini App.
- Preserved Telegram authentication, moderation, communities, opportunities, events, polls, quizzes, gamification, monetization, referrals, production diagnostics, and all prior modules.
- No paid realtime service or external SaaS dependency.

