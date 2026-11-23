# TextLink — Write. Link. Share.

Anonymous text sharing: write or paste text, pick a custom code, get `https://your-domain/<code>`. No accounts.

**Stack:** Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS · Route Handlers · Zod · MongoDB Atlas + Mongoose · Vitest · React Testing Library · Playwright.

## Run locally

```bash
npm install
cp .env.example .env.local     # then set MONGODB_URI
npm run dev                    # http://localhost:3000
```

No Atlas yet? `npm run dev:db` starts a throwaway local MongoDB and prints a `MONGODB_URI` to use.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm test` | Unit, API integration (in-memory MongoDB) and component tests |
| `npm run test:e2e` | Playwright (desktop + mobile). Needs `MONGODB_URI` set |
| `npm run build && npm start` | Production build |

## API

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/texts` | `{ content, code }` → `201 { code, path, url }`, `409` if taken, `400` if invalid |
| `GET` | `/api/availability?code=` | `{ available, valid, reason? }` |
| `GET` | `/api/texts/:code` | `{ code, content, createdAt }` or `404` |

## Design notes

- **Uniqueness is enforced by a unique MongoDB index.** The availability check is only a hint; `POST` inserts and maps duplicate-key errors (`11000`) to `409`. Tested with 12 concurrent requests for one code (exactly one wins).
- **Code rules** (`lib/code.ts`, shared by client and server): lowercase letters, digits, hyphens; 4–40 chars; no leading/trailing hyphen; reserved route names blocked. Input is lowercased before checking and storing.
- **XSS:** text is rendered as a React text node inside `<pre>`, never as HTML. Shared pages are `noindex`. Security headers are set in `next.config.ts`.
- **Rate limiting** (`lib/rate-limit.ts`) is in-memory and per instance, so it is best-effort on serverless. Add Vercel Firewall rate-limit rules for hard limits.
- Shared texts are public to anyone who knows or guesses the code. Don't share secrets.

## Deploy (Vercel + Atlas)

1. Atlas: create a database user, and allow network access from Vercel (`0.0.0.0/0`, or use the Vercel Marketplace integration).
2. Vercel: import the repo, set `MONGODB_URI`, `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SITE_HOST`, then deploy.
3. The unique index is created by Mongoose on first connection (`autoIndex`). For a large production collection, create it once manually: `db.texts.createIndex({ code: 1 }, { unique: true })`.

Testing tools are pinned for Node 20 compatibility (Vitest 3, jsdom 26); Node 22+ is recommended.
