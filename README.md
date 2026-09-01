# ITEMHOUND AI Hub

A single page that lists every internal tool our teams have built, with a link to each one.
Built with React + Vite for the UI and a small Express server for login and single sign-on.
The tool list itself still lives in one config file - no database involved for that part.

Signing in here is required before the Hub (or any SSO-enabled tool reached through it)
can be used - see **Login and single sign-on** below.

## Adding or changing a tool

Edit **`src/config/tools.js`**. That is the only file you need to touch for the tool list.

```js
{
  id: 'finance-budget-tracker',   // unique, lowercase, dashes
  name: 'Budget Tracker',         // shown on the tile
  url: 'https://...',             // where it points
  team: 'finance',                // a team id from the TEAMS list
  description: 'One short line.', // optional
  owner: 'Finance Team',          // optional
  status: 'live',                 // 'live' | 'beta' | 'planned'
  tags: ['budget'],               // optional extra search words
  sso: 'inventory',                // optional - see below, only for SSO-enabled tools
}
```

Teams are defined at the top of the same file: `finance`, `accounting`, `bib-production`,
`admin`, `hr`, `kit-claiming`, `timing`, `entractiv`, `fulfillment`.

Placeholder entries are marked `placeholder: true` and show a "Sample entry" tag. Replace
them with real tools and remove that line.

## Login and single sign-on

Every employee signs in here first, against the same `employees` collection the Equipment
Inventory app uses (one account works in both places). From then on:

- Opening the Hub without a valid session shows the login screen.
- Clicking a tool marked `sso: '<toolId>'` in `tools.js` (right now just the Equipment
  Inventory tile) skips that app's own login screen entirely - the Hub asks its own
  backend for a one-time hand-off token and the browser lands straight on that app's
  main page.
- Opening that tool's own URL directly, without going through the Hub, sends the browser
  back here to log in first - and after logging in (or right away, if you already had a
  Hub session), sends you straight back to that same tool rather than leaving you on the
  Hub's tool grid.
- If that tool's session cookie is already valid (signed in earlier today), opening it
  directly goes straight to its main page - no detour through the Hub at all.

Adding a second SSO-enabled tool later means: give that app the same `/sso` hand-off route
and session-cookie pattern the Equipment Inventory app now has (see its own README), add
its base URL to `server/toolRegistry.js` and the matching env var, and add `sso: '<id>'` to
its entry in `tools.js`.

## Running it locally

Requires Node 18 or newer. Two processes run side by side in dev - the Vite dev server
(what you open in the browser) and the small API server (what actually talks to MongoDB
and issues sessions).

```bash
npm install               # first time only
cp .env.example .env      # then fill in the real values (see below)

npm run dev:server        # terminal 1 - API on http://localhost:8787
npm run dev               # terminal 2 - open http://localhost:5173
```

Vite proxies `/api/*` requests through to the API server (see `vite.config.js`), so the
browser only ever talks to one origin and the session cookie just works.

### Environment variables (`.env`)

| Variable            | What it's for                                                              |
|---------------------|------------------------------------------------------------------------------|
| `MONGO_URI`          | Same Atlas connection string as the Equipment Inventory app's `.env`.        |
| `MONGO_DB_NAME`       | `inventory` - same shared database.                                         |
| `SESSION_SECRET`      | Random value, signs the Hub's own login cookie. Not shared with any app.    |
| `SSO_SHARED_SECRET`   | Must be **identical** to the Equipment Inventory app's `SSO_SHARED_SECRET`. |
| `INVENTORY_URL`       | Where that app is reachable - `http://localhost:3000` in dev.               |
| `PORT`                | Port the API server listens on in dev (`8787`).                             |

## Building

```bash
npm run build    # writes the React app to dist/
npm start        # runs the real server: serves dist/ AND the API, one process, one port
```

`npm run preview` (plain Vite preview) only serves the built files with no API behind it -
use `npm start` to test the whole thing together, the way it runs in production.

## Deploying to Render

This is now a **Web Service**, not a Static Site, since it runs its own API.

1. Push this folder to a Git repository.
2. In Render: **New > Web Service**, connect the repo (or **New > Blueprint** - `render.yaml`
   is included and fills in the build/start commands for you).
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Set these environment variables in the Render dashboard (not committed to the repo):
   `MONGO_URI`, `MONGO_DB_NAME`, `SESSION_SECRET`, `SSO_SHARED_SECRET`, `INVENTORY_URL`
   (the Inventory app's real Render URL - `https://inventory-management-atyc.onrender.com`).
6. Once this is deployed, update the Inventory app's own `HUB_URL` env var on Render to
   this Hub's real URL, so its "not logged in" redirect points at the right place.

## What each person's browser remembers

Favorites, recently used tools and the light/dark choice are stored in that person's own
browser (localStorage) - unrelated to the login session, which is a real server-verified
cookie. Nothing here is shared between people.

## Manually testing the full login / SSO flow

Once both apps are running locally (Hub on 5173/8787, Inventory on 3000, matching
`SSO_SHARED_SECRET` in both `.env` files):

1. Open `http://localhost:5173` - you should land on the Hub's login screen, not the tool grid.
2. Log in with a real employee account. You should land on the tool grid, with your name
   and a Log Out button in the header.
3. Click the Equipment Inventory tile - a new tab should open already on its dashboard,
   never showing its login screen.
4. In that new tab, reload the page - you should stay on the dashboard (the session cookie
   is already valid), not bounce anywhere.
5. Open `http://localhost:3000` directly in a fresh incognito window (no cookie yet) - it
   should redirect you to the Hub's login screen, not show its own old login form. Log in
   there and you should land back on the Inventory dashboard, not the Hub's tool grid.
5b. Repeat step 5, but first log in at the Hub in that same incognito window (visit
   `http://localhost:5173` and sign in, then open `http://localhost:3000` directly) - this
   time it should bounce through the Hub and back to Inventory with no login form shown at
   all, just a brief "Taking you back to..." message.
6. Back in the Inventory tab, click Log Out - it should send you to `/`, which (with no
   session left) redirects to the Hub's login screen.

## Notes

- Branding follows the ITEMHOUND guidelines: Inter for headings, Nunito Sans for body,
  maroon `#630A1F` and dark slate `#25363E` on white. The fonts and logo files in
  `src/assets/` are the approved ones - please don't swap or recolor them.
- Dark mode uses dark slate as the base surface so the palette stays on-brand. The
  guidelines call for a plain white base, so light mode is the default.
- The Hub's database connection is only ever used to check a login against the shared
  `employees` collection - it doesn't read or write anything else. That's a deliberate,
  narrow exception to "each app owns its own data" for the one thing every app needs to
  trust in common: who's signed in.
