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

Every employee signs in here first, normally with **Microsoft (Microsoft Entra / Azure
AD)**. Only `@itemhound.com` accounts can sign in that way; everyone else is turned away
with an error, both because the Entra app registration itself is restricted to this
company's own tenant and because the callback route checks the email domain again
independently (`ALLOWED_EMAIL_DOMAIN` in `.env`).

There's also an optional **manual sign-in** (employee ID + password) that can be switched
on and off - see **Manual sign-in** below.

### Manual sign-in (optional, off by default)

`ALLOW_PASSWORD_LOGIN` controls a second employee-ID + password form underneath the
Microsoft button. Only the literal string `true` switches it on - anything else, including
leaving the variable out entirely, keeps it off. That default is deliberate: this form is a
second door that bypasses the Microsoft/`@itemhound.com` restriction completely, so it
should only be open while you actually want it open.

**Turning it on or off:**

- Locally: set `ALLOW_PASSWORD_LOGIN=true` (or `false`) in `.env`, then **fully stop and
  restart the API server**. `npm run dev:server` runs `node --watch`, which restarts when a
  `server/*.js` file changes but *not* when `.env` changes - dotenv reads it once at
  startup, so editing `.env` under a running server leaves the old value in effect and the
  form won't appear (or won't disappear). Ctrl-C and start it again.
- On Render: edit `ALLOW_PASSWORD_LOGIN` in the service's **Environment** tab and save.
  Render restarts the service, which is what applies the change - expect a few seconds
  where the app is redeploying. Note that this variable is declared in `render.yaml` as
  `sync: false` precisely so the dashboard owns its value; if it were committed there with
  a `value:`, a blueprint sync would quietly reset it.

Quick way to see what the server currently thinks, without opening the login screen:

```bash
curl https://<your-hub-url>/api/auth/methods
# {"microsoft":true,"password":true}   <- form will show
# {"microsoft":true,"password":false}  <- form is hidden; the flag isn't 'true' here
```

Turning it off also **invalidates sessions that were created with it**, not just new
sign-ins: the session cookie records which method issued it (`via`), and `loadEmployee()`
rejects a `via: 'password'` session whenever the flag is off. So switching it off logs
those people out on their next request rather than leaving them signed in for the
remainder of their 12h cookie.

**Which accounts can use it:** only ones that already have a bcrypt `password` hash on
their `employees` document - in practice, accounts from before Microsoft sign-in existed,
created through the Inventory app's old registration page. **Nothing creates a password
hash any more** (that page and its routes are gone), so this doesn't work for anyone who
first signed in with Microsoft. Treat it as a fallback for existing accounts, not a way to
onboard anyone.

Two things worth knowing before switching it on:

- The old `seed.js` in the Inventory app used to create `EMP001`/`EMP002`/`EMP003` with the
  password `password123`. If those documents are still in the live database, enabling
  manual sign-in makes those accounts usable by anyone who knows that. Check for and clear
  them first (`db.employees.updateOne({ employeeId: "EMP001" }, { $unset: { password: "" } })`,
  or delete the documents).
- There's no rate limiting on this route, so it's brute-forceable by anyone who can reach
  the Hub. Fine on a trusted network; worth adding a limiter if that ever changes.

Failures are deliberately indistinguishable from each other - unknown employee ID, no
password set, and wrong password all return the same "Invalid Employee ID or password", so
the form can't be used to work out which employee IDs exist. When the flag is off the route
answers 404, so a probe can't tell "disabled" from "wrong password" either.

### First sign-in: linking an employee number

Microsoft knows someone's email, not the employee number this system identifies people by
(`employeeId` is the key behind borrowing, reservations, exports and the Inventory admin
check). So the first Microsoft sign-in does two things:

1. Creates (or updates) that person's document in the shared `employees` collection -
   `email`, `name`, `microsoftOid`, `createdAt`/`lastLoginAt` - with no `employeeId` yet.
2. Shows them a card asking for their employee number, before the tool grid or any
   hand-off to a tool. Saving it writes `employeeId` straight onto that same document
   (`POST /api/auth/employee-id`) and re-issues their session cookie, and they carry
   straight on to wherever they were headed. No admin step.

That write is **once per account** - the endpoint only fills in an `employeeId` that isn't
set yet, so nobody can re-point their own account at a different number after records
already reference the old one. Corrections are an admin's job, directly in MongoDB:

```js
db.employees.updateOne({ email: "someone@itemhound.com" }, { $set: { employeeId: "EMP123" } })
```

An employeeId set that way takes effect immediately - `/api/auth/me` and the SSO hand-off
both read it from the collection on every request rather than trusting the copy baked into
the session cookie.

Three things the endpoint refuses:

- **Numbers already in use.** Uniqueness is enforced by the partial unique index on
  `employeeId` in the Inventory app's `db.js`, and checked before writing, so two people
  can't end up sharing one - including two simultaneous claims.
- **Reserved numbers** listed in `RESERVED_EMPLOYEE_IDS` (default: `Admin`). The Inventory
  app grants its admin powers to exactly the employeeId `Admin`, so leaving that
  self-assignable would let anyone with an `@itemhound.com` mailbox claim admin. Whoever
  should actually be Admin gets it set in MongoDB by hand, once.
- **Malformed numbers** - letters, digits, dots, dashes and underscores only, up to 32
  characters (`EMPLOYEE_ID_PATTERN` in `server/index.js`; loosen it there if real employee
  numbers need other characters).

Worth being aware of: within those rules, an employee types their own number in, so this
trusts people to enter their real one. That's consistent with how the rest of this internal
tooling works, but if you ever want it verified against an HR list instead, this endpoint is
the single place to add that check.

See **Setting up Microsoft sign-in** below for the one-time Azure app registration this all
depends on.

### Setting up Microsoft sign-in (one-time)

This app authenticates through a Microsoft Entra (Azure AD) **App Registration** - you need
one before any of this works, and it belongs to whoever administers itemhound.com's
Microsoft 365 / Entra tenant:

1. Go to the [Microsoft Entra admin center](https://entra.microsoft.com) (or
   portal.azure.com → **Microsoft Entra ID**) → **App registrations** → **New registration**.
2. Name it something recognizable, e.g. "ITEMHOUND AI Hub".
3. **Supported account types**: choose **Accounts in this organizational directory only
   (Itemhound only - Single tenant)**. This is what actually enforces "only our own
   Microsoft 365 users can sign in" at the Microsoft level, before this app's own email-
   domain check ever runs.
4. **Redirect URI**: platform **Web**, and add every environment you'll use this from, e.g.:
   - `http://localhost:8787/auth/microsoft/callback` (local dev)
   - `https://<this Hub's real Render URL>/auth/microsoft/callback` (production)
5. Click **Register**. On the app's **Overview** page, copy the **Application (client) ID**
   and the **Directory (tenant) ID**.
6. Go to **Certificates & secrets** → **New client secret** → copy the secret's **Value**
   immediately (it's only ever shown once).
7. **API permissions** should already show Microsoft Graph's `User.Read` (delegated) by
   default - that, plus the standard `openid`/`profile`/`email` scopes this app also asks
   for, don't need admin consent for a typical tenant. If your tenant enforces admin
   consent for everything, grant consent here.
8. Put the three values from steps 5-6 into `.env` (or the Render dashboard) as
   `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and set `AZURE_REDIRECT_URI`
   to whichever redirect URI from step 4 matches where this instance is actually running.

From then on:

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
- Logging out at the Hub logs out of every SSO-enabled tool too, not just the Hub itself.
  This happens as a real chain of page redirects through each tool's own domain (Hub ->
  Inventory's own `/logout` -> back to the Hub), not a background request - a background
  fetch can't reliably clear another app's cookie across domains once third-party cookie
  blocking is in play, regardless of CORS. See `/api/auth/logout-chain` in
  `server/index.js`. Adding a second SSO-enabled tool later just means adding its base URL
  to `server/toolRegistry.js` and giving it the same `GET /logout?returnTo=...` route
  Inventory has (see its own README) - it's automatically included in the chain from
  there.
- A tool's own "Return to Hub"-style button (see Inventory's) is a one-way navigation
  back, nothing more - it deliberately does NOT log that tool out, so coming back to it
  later in the same session doesn't ask for a password again. Only the Hub's own Log Out
  signs out of everything.

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

| Variable                | What it's for                                                              |
|--------------------------|------------------------------------------------------------------------------|
| `MONGO_URI`               | Same Atlas connection string as the Equipment Inventory app's `.env`.        |
| `MONGO_DB_NAME`            | `inventory` - same shared database.                                         |
| `SESSION_SECRET`           | Random value, signs the Hub's own login cookie. Not shared with any app.   |
| `SSO_SHARED_SECRET`        | Must be **identical** to the Equipment Inventory app's `SSO_SHARED_SECRET`.|
| `INVENTORY_URL`            | Where that app is reachable - `http://localhost:3000` in dev.              |
| `PORT`                     | Port the API server listens on in dev (`8787`).                            |
| `AZURE_TENANT_ID`          | Microsoft Entra tenant id - see **Setting up Microsoft sign-in** above.    |
| `AZURE_CLIENT_ID`          | That app registration's Application (client) ID.                          |
| `AZURE_CLIENT_SECRET`      | That app registration's client secret value.                              |
| `AZURE_REDIRECT_URI`       | Must exactly match a Redirect URI registered on the app.                  |
| `ALLOWED_EMAIL_DOMAIN`     | `itemhound.com` - accounts outside this domain are rejected.              |
| `RESERVED_EMPLOYEE_IDS`    | Comma-separated employee numbers nobody may self-assign (default `Admin`).|
| `ALLOW_PASSWORD_LOGIN`     | `true` shows the manual employee-ID + password form; anything else hides it.|

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
   (the Inventory app's real Render URL - `https://inventory-management-atyc.onrender.com`),
   and `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_REDIRECT_URI`,
   `ALLOWED_EMAIL_DOMAIN`, `RESERVED_EMPLOYEE_IDS`, `ALLOW_PASSWORD_LOGIN` (see **Setting
   up Microsoft sign-in** above - the redirect URI registered on the Azure app has to match
   this service's real Render URL). `ALLOW_PASSWORD_LOGIN` is the one you'll come back to:
   it's the on/off switch for manual sign-in, and saving it restarts the service.
6. Once this is deployed, update the Inventory app's own `HUB_URL` env var on Render to
   this Hub's real URL, so its "not logged in" redirect points at the right place.

## What each person's browser remembers

Favorites, recently used tools and the light/dark choice are stored in that person's own
browser (localStorage) - unrelated to the login session, which is a real server-verified
cookie. Nothing here is shared between people.

## Manually testing the full login / SSO flow

Once both apps are running locally (Hub on 5173/8787, Inventory on 3000, matching
`SSO_SHARED_SECRET` in both `.env` files):

1. Open `http://localhost:5173` - you should land on the Hub's login screen (a single
   "Sign in with Microsoft" button), not the tool grid.
2. Sign in with a real `@itemhound.com` Microsoft account. On that account's first-ever
   sign-in you should get the **employee number** card before anything else; enter one and
   you should land on the tool grid, with your name and a Log Out button in the header.
   Check the `employees` document for your email now has that `employeeId`.
3. Sign out and back in with the same account - the card should NOT appear again.
4. Sign in with a second account and try to claim the *same* employee number - it should
   be refused with "already registered to someone else", and the card should stay put.
5. Try claiming `Admin` - it should be refused as admin-assignable only.
6. Try signing in with a non-`@itemhound.com` account (or cancel the Microsoft prompt) -
   you should land back on the Hub's login screen with a clear error, not a broken page.
7. Open `http://localhost:3000` directly, signed out, with a brand-new account - you
   should get the Hub's login screen, then the employee-number card, and only *then* be
   sent on to Inventory's dashboard (the card comes before the hand-off, so the tool never
   receives a session with no employee number).
8. Click the Equipment Inventory tile - a new tab should open already on its dashboard,
   never showing its login screen.
9. In that new tab, reload the page - you should stay on the dashboard (the session cookie
   is already valid), not bounce anywhere.
10. Open `http://localhost:3000` directly in a fresh incognito window (no cookie yet) - it
   should redirect you to the Hub's login screen, not show its own old login form. Sign in
   there and you should land back on the Inventory dashboard, not the Hub's tool grid.
11. Repeat step 10, but first sign in at the Hub in that same incognito window (visit
   `http://localhost:5173` and sign in, then open `http://localhost:3000` directly) - this
   time it should bounce through the Hub and back to Inventory with no login form shown at
   all, just a brief "Taking you back to..." message.
12. In the Inventory tab, click **Return to Hub** - this only navigates back, it should
   NOT sign you out (opening `http://localhost:3000` directly again in the same window
   should go straight back to the dashboard, no login screen).
13. Back at the Hub, click **Log Out** - you'll briefly see the address bar pass through
   `localhost:3000/logout` before landing back on the Hub's login screen. Afterward, open
   `http://localhost:3000` directly (same window) - it should now send you to the Hub's
   login screen too, confirming Inventory's own session was cleared, not just the Hub's.

To test manual sign-in, set `ALLOW_PASSWORD_LOGIN=true` and restart the API server:

14. Reload the login screen - an "OR" divider and an Employee ID + Password form should
    appear below the Microsoft button.
15. Sign in with an account that has a password hash. You should land on the tool grid with
    no employee-number card (those accounts already have an employeeId).
16. Set `ALLOW_PASSWORD_LOGIN=false`, restart, and reload - the form should disappear, and
    the session you just created with it should be logged out on that first request.

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
