# Anders Zoega — Work at a Startup Profile

**Location:** Miami, FL · In school · Graduates Dec 2027
**Looking for:** An internship in Sep 2026
**Interested in:** Backend and Full stack roles
**Links:** GitHub · LinkedIn

## About

Technical co-founder building an AI operations platform; audited a venture-backed startup ahead of its $2.45M raise.

## Work

### Founder — Ktwo.ai (Dec 2025 – Present)

- Technical co-founder of Ktwo, an AI operations product for home-services businesses (two co-founders; I own product and engineering). Rebuilt it from a Replit-generated prototype into an engineered codebase: decomposed a 2,500-line route monolith and a 3,600-line dashboard, removed 15k dead lines. Pre-launch; running at low cadence while I look for a team to learn from.
- Architected a three-stage agent pipeline (Haiku classifier, deterministic orchestrator, Sonnet persona) so business rules are enforced in code, not the prompt, with prompt-injection isolation at the input boundary.
- Migrated to Supabase Auth with mandatory 2FA (TOTP and SMS), AAL2 enforcement, and audited time-boxed impersonation; moved rate-limit state into Postgres for multi-replica safety; enforced structural tenant isolation via a tenant-scoped query wrapper with a static tripwire test.
- Introduced the repo's first test suite and deployed to Railway behind a gated waitlist.

**Stack:** TypeScript, React, Node.js/Express, Supabase (Postgres), Drizzle, Anthropic SDK, Docker, Railway, Vitest

### AI Consultant — The Zeya App (Sep 2025 – Nov 2025)

- Contract engagement with a venture-backed consumer marketplace during its pre-seed phase; worked directly with the founder and the development team.
- Audited the codebase, cloud infrastructure, and AI implementation; presented security, architecture, and cost findings with recommendations.
- Advised on AI integration strategy going into their raise; the company closed a $2.45M seed round following the engagement.

### Founding Partner & Lead Engineer — Ktwo.ai (Jul 2025 – Nov 2025)

- Built and operated a client portal for small businesses (sole engineer, working with one non-technical partner): analytics dashboards, Stripe billing with webhook signature verification, support ticketing with Slack alerts, five-tier RBAC. Signed and served the company's first paying client, a Danish wine retailer.
- After REST and GraphQL attempts failed, cracked the retailer's legacy SOAP/WSDL API and built a catalog sync into Postgres: bulk call with field pre-selection, field-level diffed upsert with orphan deletion, roughly 430 products with images in about 40 seconds.
- Three-pass image enrichment with 16-way bounded concurrency and backoff, storing CDN URLs behind an origin-allowlisted proxy; the owner managed his catalog from the portal with SKU-based editing.
- Built a React Native storefront and scaffolded the OnPay-to-DanDomain order loop; the app never launched, blocked on DanDomain's SOAP order API before the engagement ended.

**Stack:** TypeScript, React, Node.js/Express, React Native/Expo, Supabase (Postgres), Drizzle, Stripe, node-soap

## Education

**BBA Artificial Intelligence for Business Technology** at University of Miami Herbert Business School, Dec 2027
STEM-designated major in Department of Business Technology.

## Skills

React (intermediate), Node.js (intermediate), PostgreSQL (intermediate), TypeScript (intermediate), Python (intermediate), SQL (intermediate), Express (intermediate), React Native (intermediate), AI Agents (intermediate), Docker (beginner)

## Location & Work Authorization

- Open to remote work. Willing to relocate to: San Francisco Bay Area, New York City, Houston TX, Dallas TX, Austin TX
- Authorized to work in the US

## About — What are you looking for in your next role?

Looking for:

An internship or part-time engineering role at a seed-to-Series A startup, starting now. I'm a full-time student in Miami through December 2027, so remote or Miami in-person both work during the semester, and I'm open to relocating for the summer. I'm looking for a team that wants real work done on a real product and is fine with me doing it around classes.

I'm an AI-native builder. Claude Code and Cursor are core to how I work, and I'm drawn to teams putting AI into actual operations rather than demoing it. Over the past year I took my own company, Ktwo, from a Replit-generated prototype to an engineered platform: auth migration with mandatory 2FA, structural tenant isolation with tripwire tests, a deterministic agent orchestrator with prompt-injection isolation, and the repo's first test suite. At Zeya I audited a live venture-backed product and advised the founder on AI strategy ahead of their raise.

I do my best work paired with someone senior who'll let me own a feature and then tell me what I got wrong. I'll tell you what I don't know before you find out.

Want to avoid:

AI-washing without technical depth, and process that exists for its own sake.

## Describe a project that you worked on that you are proud of

A political map of the Star Citizen universe, drawn the way grand-strategy games draw galaxies: faction territories, hyperlane-style jump routes, and a route planner that respects ship size. Double-click any of the 90 systems and it opens into an orbital diagram of every planet, moon, station, and jump point on record, about 860 objects total. Live at https://andersktwo.github.io/SC-map/, one self-contained HTML file, no backend.

The part I'm proudest of is that no border is hand-drawn. A single ownership resolver decides who owns each system, then a Voronoi pass assigns every point in space to its nearest seed, with a jittered grid of "void" seeds so deep space stays neutral and lane seeds so territory follows the jump network instead of blobbing. The tradeoff was cohesion: a pure Voronoi fractures empires into islands, so unclaimed systems get a weighted neutral pocket and lane seeds are capped at a fixed reach from their endpoint. The engine has its own cohesion tests, and a Playwright script opens all 90 system views headlessly and fails the build on any page error.

## Company preferences

Would prefer companies of 1–10 people. Also ok with 11–50 people.
