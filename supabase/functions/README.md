# Supabase Edge Functions

Source of truth for the edge functions deployed to Supabase project `kguucauoxscxreaewiwv`.

| Function | verify_jwt | Purpose |
|---|---|---|
| `resume-chat` | no | AI chatbot (Claude Haiku). Limits: 20 msgs/email lifetime, 20/IP per 24h, 300 global per 24h. Supports `{check: true, email}` for a no-cost remaining-count lookup. |
| `track` | no | Page-view analytics ingest. 100 events/IP per 24h; drops bots and over-limit silently. |
| `site-content` | no | Public GET of `site_content` rows (admin-only keys excluded); authenticated POST upsert (admin user only). |
| `admin-analytics` | yes | Admin dashboard data: chat sessions, page-view stats, token costs. Admin user only. |
| `setup-admin` | yes | Disabled; returns 403. |

## Workflow

1. **Fetch before deploy.** The deployed version may be newer than this directory — always pull the current source (Supabase MCP `get_edge_function`, or `supabase functions download`) and diff against the repo before deploying. On 2026-09-02 two concurrent deploys overwrote each other.
2. Edit here, commit, then deploy — and keep this directory in sync with what is actually deployed.
3. Client IP must be read from `cf-connecting-ip` (fallback `x-real-ip`) only. `x-forwarded-for` carries variable internal proxy hops inside this runtime and must never be used for rate limiting.
4. Secrets (`ANTHROPIC_API_KEY`, service role key, etc.) live in Supabase function env vars — never in this repo.

Snapshot committed 2026-09-04 from deployed versions: resume-chat v21, track v3, site-content v4, admin-analytics v5, setup-admin v3.
