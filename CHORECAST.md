# Chorecast

An iPad-first family chores app for kids aged 7 to 18. Each kid gets:

- a daily "forecast" of chores;
- a floating 3D island that grows with their savings;
- a pretend economy that teaches tax, saving, investing and giving;
- Character Growth, a skill tree of short lessons.

The app itself is one page, [`public/chorecast/index.html`](public/chorecast/index.html). Character Growth runs from [`public/chorecast/growth.js`](public/chorecast/growth.js), which is built from [`chorecast-growth/`](chorecast-growth/). A small Node server in [`server/`](server/) handles sign-in and keeps every family's data in Postgres.

## Run it

```bash
npm install
```

```bash
npm run build
```

```bash
npm start
```

Then open `http://localhost:8787/`. On an iPad, use your computer's network address instead of `localhost`. The site root redirects to `/chorecast/`.

Without `DATABASE_URL`, the server uses an embedded Postgres (PGlite) stored in `.data/pglite`, so nothing else needs installing. To serve `public/` directly without a build, run `node server/index.js --static public --port 8787`.

`npm run dev` (Vite) still serves the page, but without the server: no sign-in, and everything is saved in that browser only.

The Tattoo Tycoon offline app (vite-plugin-pwa) is set to `selfDestroying` on this branch. Devices that installed the game get a service worker that removes itself and clears its cache, so they stop seeing the game. The game's code in `src/` is unchanged and still on `main`.

## Railway

[`railway.json`](railway.json) builds with `npm run build`, starts `node server/index.js` and checks `/api/health`.

To set it up:

1. In the Railway project, choose **New**, then **Database**, then **PostgreSQL**.
2. On the Chorecast web service, open **Variables** and add `DATABASE_URL` with the value `${{Postgres.DATABASE_URL}}`.
3. Redeploy. The deploy log should say `database ready (postgres)` and list each migration it applied.

If `DATABASE_URL` is missing, the server still starts on the embedded database and logs a warning. That data is wiped on every deploy, so attach Postgres before any family signs up.

Optional variables:

- `CONTENT_EDITORS`: a comma-separated list of grown-up emails allowed to approve new Character Growth content for all families.
- `ADMIN_TOKEN`: lets a script or scheduled agent post content drafts (see [CONTENT.md](CONTENT.md)).

## Database

Tables are created by numbered SQL files in [`server/migrations/`](server/migrations/). On start, the server applies any it hasn't run yet, each in a transaction, and records them in `schema_migrations`.

**Rule for every update:** if a change stores something new, add the next numbered migration (for example `003_trophies.sql`) that creates the tables or columns it needs. Never edit a migration that has already shipped.

| Migration | Tables |
| --- | --- |
| `001_core.sql` | Accounts and sync: `users`, `families`, `family_members`, `devices`, `sessions`, `invites`. App data: `family_settings`, `kids`, `jobs`, `habits`, `photos`. History: `doc_changes` (every write), `events` (everything that happens in the app). |
| `002_character_growth.sql` | `growth_progress` (one row per kid), `growth_attempts` (every lesson, review, challenge, moment or story), `growth_answers` (every answer, by skill), `content_items` (the content feed and its review queue). |
| `003_chore_guides.sql` | `chore_guides` (each custom chore's photo guide: the steps, the grown-up's photos and whether kids photograph every step or just the end). Adds a `kind` column to `photos`: `proof`, `step` or `guide`. Guide photos are deleted when a guide is re-recorded or deleted. |

## Accounts and devices

- **Sign in with email:** a grown-up makes a family with an email and password. They get a one-time recovery code, which resets the password, since the app sends no email.
- **Other grown-ups:** Grown-ups, then Family and devices, makes an invite code. The other grown-up signs up with it and joins the same family on their own device.
- **Kid's iPad:** the same page shows a 6-digit code that lasts 15 minutes. On the iPad, choose "Kid's iPad" and type it. Kid iPads can do everything a kid does, but changing money rules, approving or paying jobs, adding kids and deleting need the grown-up PIN. The PIN unlocks the iPad for 30 minutes.
- **Live sync:** every change is saved on the server and pushed straight to the family's other devices. Changes made offline wait in a queue and send when the connection is back.
- **Moving in:** data saved on a device before sign-in can be copied into the family on first sign-in.
- **As a Claude artifact:** the page has no server to reach, so it keeps using Claude's artifact storage and has no sign-in.

## What's inside

- **Fair chore draft:** 112 NZ/AU chores. Each morning, shared household jobs are drafted between kids so no two get the same job, and a job a sibling just did sits out until it's due again. Bedroom jobs are always each kid's own.
- **Our home:** the first time a grown-up unlocks the dashboard, ten quick questions with follow-ups ask about the house: bedrooms, pets, dishwasher, lawn, bins and so on. Each question shows real chores above it that the answer turns on or off. Chores the home can't have (no cat means no litter tray) never get drafted. Answers can be changed any time under Our home.
- **Missions:** full-screen chore events with music, a timer, scoring, split-screen crew mode and a photo of the finished job. At the end the points tally up row by row and three 3D stars slam in, Angry Birds style, as the score passes each mark.
- **Custom chores with photo guides:** under Grown-ups, then Chores, then Add a custom chore, a grown-up picks "Photo guide" and does the chore once, start to finish, taking a photo at each step and adding a few words. A last photo shows the finished job. The timer sets the kids' clock, a little longer than the grown-up took. The photos become the kids' how-to guide on the mission brief, and in the mission each step shows the grown-up's photo, which kids can tap to see full size.
  - **A photo at every step:** steps go in order, and kids must photograph each one before they can tick it off and move on.
  - **One photo at the end:** kids tick the steps freely, then photograph the finished job next to the grown-up's finished photo. They can't skip the photo.
  - **Reviewing:** grown-ups see the kid's photos side by side with their own, step by step. A guide can be re-recorded, switched between the two photo modes or deleted from its chore. Written-step custom chores still work as before.
- **Money:** pay slips with family tax, a budget split into Spend, Vault, Invest and Give jars, a savings vault with daily interest, a Trust Score, and a pretend stock market.
- **Island:** a cel-shaded 3D island per kid. It has wind-blown grass, a shop of animals, toys and furniture, and upkeep jobs (mowing, weeding, raking, pond cleaning, pruning, water blasting) that each need their own tool.
- **Character Growth:** opened from the Grow tab in a kid's bottom bar, or from the Character Growth card on their Today screen. A red dot on Grow means reviews, questions about their week or a grown-up's lesson are waiting. It covers 12 skill trees (Money Sense, Investor School, Work and Careers, Make and Sell, Give and Change, Everyday Maths, Words That Work, Money Through Time, Home and Life, Mind and Body, Smart Online, How the World Works) in 4 age bands.
  - **Skill trees:** each tree is a path of floating 3D islands, one per lesson, with a challenge island at the end of each unit. Passing a lesson builds a rope bridge to the next island, which shakes off its mist, and the guide hops across. Units still being written show as misty islands.
  - **Lessons:** each is about 5 minutes with a guide (Kiri the kea, Coco the cockatoo or Bolt the robot), and uses 24 kinds of mini-game. Every step plays out in 3D on the guide's island, built from the lesson's own words and game: coin towers and pies for amounts, props for ideas like saving or scams, and a scene for each kind of game that reacts to every move.
  - **How to play:** the first time a kid meets each kind of game, a hand plays it on a made-up example before their turn. The ? on any question replays it.
  - **Daily extras:** spaced review cards, questions about the kid's own week in Chorecast, a daily Money Moment, a weekly market story, real stories, and a crew quiz for siblings side by side.
  - **Rewards:** XP feeds the island, with a 250 XP daily cap. Mastered skills raise the character level and earn titles, and the Studio shop can point a kid at a lesson to earn what they want.
  - **For grown-ups:** reports, lesson assignments with bonuses, and settings for daily time, band, country, read-aloud and which trees are on. How to write lessons is in [CONTENT.md](CONTENT.md).
- **Grown-ups:** a PIN-locked dashboard to review photos, approve pay, check habits, set the money rules, follow Character Growth and manage family devices.

## Tech notes

- The page is plain HTML, CSS and JavaScript with no build step of its own. Character Growth's parts are joined into `growth.js` by `node scripts/build-growth.mjs`.
- `node scripts/check-growth.mjs` checks every lesson and question. `node scripts/chorecast-artifact.mjs out.html` makes the Claude artifact version of the page.
- The server is plain Node (`node:http`) with `pg`, or PGlite locally. Passwords are hashed with scrypt, and sessions are HttpOnly cookies.
- [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) comes from cdnjs, and the Nunito font from Google Fonts.
- Weather effects (rain, storm, snow, fog, wind) are built in but switched off by `WEATHER_ON = false`.
