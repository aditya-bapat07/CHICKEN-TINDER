# Chicken Tinder

A complete activity discovery app with a React frontend, Fastify API, and PostgreSQL database. Deployment instructions are in [DEPLOYMENT.md](DEPLOYMENT.md). Browse 185 seeded activities, personalize your mood, swipe on ideas, save matches, share invitations, and manage your account and API keys.

Public website: **https://v0-chicken-tinder.vercel.app**. Production runs on Vercel with a dedicated Neon PostgreSQL database. The original SQLite file remains local and has not been imported.

## Run locally

Requires Node.js 24, npm, and PostgreSQL 16 (or Docker).

```sh
cp .env.example .env
docker compose up -d --wait
npm ci
npm run setup
npm run dev
```

Open **http://localhost:5173**. This starts the frontend and API together. The API runs at **http://localhost:3000**, with interactive documentation at **http://localhost:3000/docs**. Vite proxies `/api` and `/docs` to the API.

Setup applies committed PostgreSQL migrations and seeds 185 activities idempotently. Configure `DATABASE_URL` and `DIRECT_URL` in `.env` when using an external database. The old `database/prisma/dev.db` is preserved locally as an untracked archive; it is no longer used. Its accounts and matches are not automatically copied to PostgreSQL.

## Production build

```sh
npm run build
npm start
```

Open **http://localhost:3000**. Fastify serves the built frontend and `/api` from the same origin, including page reloads and public invitation URLs. Run these commands from the project root. `PORT` changes the API port; the development proxy follows `PORT` or `API_PORT` (default 3000).

## Included flows

- Sign up with name, email, and password; sign in with a password or an existing API key.
- Protected pages, restored sign-in after refresh, sign-out, and revoked-key handling.
- Search and filter the activity library by category, free budget, and maximum duration; use Surprise me for a random idea from the current results. Inspect details, save an activity, or add an activity.
- Scroll-triggered section reveals, staggered cards, hero parallax, hover feedback, a scroll progress bar, and a back-to-top control. The Motion toggle remembers your preference and respects system reduced-motion settings.
- Three-question mood quiz and editable energy, budget, and social preferences.
- Resume and end swipe sessions; use buttons, touch swipes, or left/right keyboard arrows.
- After ten consecutive passes, the tenth activity becomes a match. A yes resets the streak. Matches can be marked done or skipped.
- Match filtering, public share invitations, session recaps, and a leaderboard of forced matches.
- Generate named API keys, copy the secret shown once, inspect usage, and revoke keys.
- Update profile details and add or change a password. Older accounts without passwords can sign in with their saved API key and add a password.

Passwords use salted scrypt hashes. API keys are stored as SHA-256 hashes in the database. Sign-in credentials are stored in browser local storage; use HTTPS for hosted deployments. Browser-session keys issued by password signup/sign-in expire after seven days and are revoked on sign-out. Password changes revoke other browser sessions while retaining the current one. Personal API keys remain active until explicitly revoked.

The previous simulated email-recovery endpoint is disabled because it disclosed an account key from an email address alone. **Email delivery and password-reset emails are not configured.** The UI supports password and existing-key sign-in without claiming to send emails.

## Website experience

Chicken Tinder is designed as a small decision-making companion rather than a passive activity directory. The website gives visitors useful content immediately, then introduces personalization when it becomes helpful.

### Discover page

The home page is available to signed-out visitors and signed-in users. It opens with a friendly hero section focused on turning boredom into a concrete plan, followed by a small activity overview and a selection of ideas from different categories.

Visitors can search the activity library without creating an account. The filters support:

- Activity category, such as creative, outdoor, fitness, social, solo, learning, gaming, relaxation, or culinary.
- Free activities only.
- A maximum duration of 30 or 60 minutes.
- Full-text search across activity titles and descriptions.

Each activity card shows its category, description, estimated time, and budget. Selecting a card opens a detail view. The **Surprise me** action chooses an idea from the current filtered results, which is useful when the visitor wants a decision instead of more browsing.

The `/activities` page expands this into the complete catalog. Signed-in users can also add a new activity with a title, description, category, duration, energy level, budget, and social setting.

### Finding a personal fit

The vibe quiz asks three questions about the user’s current energy, available budget, and preferred social setting. Each answer is scored from 1 to 5 and saved as the user’s boredom profile.

That profile affects the swipe recommendations. For example, a low-energy, free, solo profile will favor quiet activities over expensive group activities, while still allowing some variety through weighted random selection.

The same values can be edited later from **My profile**, so the recommendation context can change with the user’s day rather than acting as a permanent personality label.

### Swipe sessions

The swipe page presents one activity at a time and keeps the interaction deliberately simple:

- **Yes, let’s do it** saves the activity as a pending match.
- **Not this time** records a rejection and loads another idea.
- A card can be swiped with touch or pointer input.
- Left and right keyboard arrows work when focus is not inside another control.
- An unfinished session can be resumed after navigating away.

The app uses a small commitment mechanic to prevent endless rejecting. After nine consecutive passes, the next pass is labeled **Let fate choose**. If the user rejects that tenth activity, it is stored as a `forced_accept` and becomes a match. Accepting any activity resets the rejection streak.

At any point, the user can end the session and see a recap showing total swipes, likes, passes, and forced matches. When there are no unseen activities left, the page directs the user toward existing matches or the full activity catalog.

### Matches and follow-through

The **My matches** page is the user’s saved list of possibilities. Matches are separated into four views:

- **Up next** for pending ideas.
- **Completed** for activities the user has done.
- **Skipped** for ideas the user decided not to pursue.
- **All matches** for the complete history.

Every match retains its activity details and offers actions to mark it done, skip it, or share it. Marking an activity done records a completion timestamp, so the page becomes a lightweight record of things the user actually tried rather than only a list of recommendations.

### Sharing an invitation

The share action creates a unique public invitation token for a match. The resulting `/invite/:token` page can be opened by someone who is not signed in and shows the activity, its description, practical details, and the name of the person who shared it.

This keeps the private account and API key protected while making it easy to turn an individual activity into a plan with a friend.

### Account and API key pages

Signed-in users have two account areas:

- **My profile** updates the display name and current energy, budget, and social preferences. It also lets older API-key-only accounts add a password, or lets password users change their password.
- **API keys** creates named personal keys for integrations, shows key usage metadata, displays a newly generated secret only once, and supports revocation.

Password sign-in creates a browser-session key. Signing out revokes that browser-session credential, while separately generated personal keys stay active until the user explicitly revokes them. This makes the website session convenient without treating every API key as disposable.

### Public and protected pages

The main discovery, catalog, leaderboard, sign-in, sign-up, and shared invitation views can be visited without an active account. Swipe sessions, the quiz, matches, settings, and API-key management are protected and redirect unauthenticated visitors to sign-in.

The interface also includes loading states, retryable connection errors, empty states, keyboard-accessible controls, mobile layouts, and a reduced-motion option. The visual motion layer adds scroll reveals, card staggering, hero movement, a scroll progress indicator, and a back-to-top control without adding an animation library.

## Checks

```sh
npm run build
npm run test:deployment
npm test
npm run test:e2e
npm run test:mobile
```

Set `TEST_DATABASE_URL` to a disposable PostgreSQL database (the local `.env.example` supplies one). Tests create and remove a unique schema, apply real migrations, and check that seeding twice preserves activity IDs. They never use `DATABASE_URL` as an implicit test target. API checks cover authentication, password changes, key ownership/revocation, quiz validation, sessions, duplicate/ended swipes, matches, sharing, and leaderboard counts. Browser tests cover desktop/mobile discovery, the full account journey, and actionable error states.

The Playwright configuration uses installed Google Chrome locally and bundled Chromium in CI. GitHub Actions installs Chromium and runs the full suite with PostgreSQL 16 and Node 24. Browser tests use port 3100. Screenshots and failure traces are written to `test-results/`.

The independent layout suite checks phone, tablet, and desktop widths in Chrome and WebKit (Safari's engine), using a fixed catalog without database access. Install WebKit once with `npx playwright install webkit`, then run `npm run test:mobile`. It checks card readability, navigation touch targets, dialog bounds, and form text size to avoid iOS focus zoom. Mobile cards use compact illustrations and one column; category artwork uses SVG so it renders consistently across platforms.

## Project map

- `frontend/`: React application, pages, API client, and authentication context.
- `backend/src/`: Fastify API, routes, services, authentication, and database access.
- `database/prisma/`: PostgreSQL schema, migrations, and repeatable activity seed.
- `api/index.js`: cached Vercel function handler; `vercel.json` configures builds and routing.
- `tests/`: end-to-end browser checks.
- `scripts/`: local development and isolated API test runners.

## Scroll effects

The animation layer is in `frontend/src/components/ScrollEffects.tsx` and uses native IntersectionObserver, ResizeObserver, and requestAnimationFrame with passive scroll listeners. It adds no animation dependencies. Content remains visible when observers are unavailable, keyboard focus reveals items immediately, and all observers/listeners are cleaned up on navigation.
