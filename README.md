# andersktwo.github.io

Interactive resume site: a static [index.html](index.html) on GitHub Pages, an admin dashboard ([admin.html](admin.html)), and Supabase edge functions for the AI chatbot, analytics, and content.

## Content architecture: Supabase is the source of truth

Resume content (hero, about, skills, experience, projects, education, additional, contact) lives in the Supabase `site_content` table, served publicly by the `site-content` edge function. It is consumed in two ways:

1. **At runtime** — index.html fetches the content on load and re-renders the sections (falling back silently to the baked-in HTML if the fetch fails).
2. **At build time** — `scripts/build-content.js` fetches the same content and regenerates the baked-in HTML between the `<!-- content:X --> … <!-- /content:X -->` markers in index.html. This baked-in copy is what crawlers, link previews, and no-JS visitors see.

Because both paths read from the same place, they cannot drift — as long as you run the build after editing.

### Editing workflow

1. Edit content in the profile editor on the admin dashboard (admin.html → Profile) and save.
2. Regenerate the static HTML:
   ```bash
   node scripts/build-content.js
   ```
3. Review with `git diff`, then commit and push.

**Do not hand-edit the content sections of index.html** — the next build will overwrite them. Edit in the admin dashboard instead. Markup outside the markers (styles, chatbot, scripts, meta tags) is edited in the file as usual.

[scripts/seed-content.json](scripts/seed-content.json) is the snapshot that was pushed into Supabase when this workflow was set up (September 2026). It documents the JSON schema for each section but is **not** read by the site — the database is authoritative.

### Content schema notes

- `about.paragraphs` entries are raw HTML (they may contain `<span class="highlight">` markup). Everything else is plain text, escaped at render time.
- `skills.categories[]` use chips: `{title, icon, iconBg, chipClass, chips: [string]}` where `chipClass` is `""` (cyan), `"purple"`, or `"pink"`.
- `projects.items[]` support optional `links: [{label, href}]` rendered in the card footer, and `media: [{url, name}]` galleries.
- The `site-content` GET is public but excludes the admin-only keys (`owner_devices`, `owner_visitor_ids`); writes require the admin's Supabase Auth JWT.

## Edge functions

Source for the deployed Supabase edge functions is versioned under [supabase/functions/](supabase/functions/) (resume-chat, track, site-content, admin-analytics; setup-admin is deployed but not yet versioned). Deploys happen through the Supabase MCP/dashboard — keep these files in sync when redeploying. SQL changes are recorded in [supabase/migrations/](supabase/migrations/).

Abuse controls (all counters live in the `rate_limit_buckets` table via the atomic `bump_rate_limit()` SQL function):
- **resume-chat**: 20 messages lifetime per email, 20 per IP per rolling 24h, 300 globally per rolling 24h; chat history is validated (max 6 items, user/assistant roles, 2,000 chars each). Rate-limit DB errors fail closed (503) since an open failure would be unmetered Anthropic spend.
- **track**: 100 page-view events per IP per rolling 24h; over-limit events are dropped silently.
- The Anthropic API key's spend limit is set in the Anthropic Console, not in code.

## Style conventions

- No em-dashes in content. Use a colon, comma, or period in prose; a plain hyphen `-` in titles, headings, and date ranges.
- The school is "University of Miami Business School".
