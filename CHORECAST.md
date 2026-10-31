# Chorecast

An iPad-first family chores app for kids aged 7 to 18. Each kid gets:

- a daily "forecast" of chores;
- a floating 3D island that grows with their savings;
- a pretend economy that teaches tax, saving, investing and giving;
- Character Growth, short money lessons that grow a 3D plant from a seed.

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
| `004_island_rewards.sql` | `island_prizes` (every prize won in Character Growth, with the lessons it took and the kid's pace), `island_purchases` (everything bought in the island shop, in XP or cash) and `farm_feedings` (each time a kid feeds their farm animals). The island itself stays in the kid's doc in `kids`; the server fills these from the app's `growth.prize`, `island.buy` and `island.feed` events. |
| `003_chore_guides.sql` | `chore_guides` (each custom chore's photo guide: the steps, the grown-up's photos and whether kids photograph every step or just the end). Adds a `kind` column to `photos`: `proof`, `step` or `guide`. Guide photos are deleted when a guide is re-recorded or deleted. |
| `005_prize_lesson.sql` | Adds `lesson_id` to `island_prizes`: the lesson whose leaf each prize sits on. |
| `006_chore_sends.sql` | `chore_sends` (every custom chore a grown-up sent straight to a kid: the chore, its type and frequency, who sent it and when). |

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
- **Daily chore or side hustle, and how often:** a custom chore is either a daily chore (a must-do or team task on a kid's list) or a side hustle (optional, first to finish gets paid). The grown-up also picks how often it comes round: every day, every 2 days, twice a week, once a week, every 2 weeks, once a month or just once. Kids see the frequency on the chore and in its brief, and a custom chore is always drafted when it's due (a "just once" chore leaves after it's done).
- **Chores page layout:** Grown-ups, then Chores, folds into two sections. Custom chores comes first and starts open, grouped into must-dos, team tasks and side hustles, with a Send button on each one that's switched on. Default chores (the jobs Chorecast comes with) starts folded. Each header shows how many chores it holds. Which sections are open is remembered on that device only (`cc:choreFold` in local storage), so it needs no table.
- **Send it now:** a custom chore can go straight to one or more kids, from "Send it now" just under the chore name in the new-chore form, or the Send button on its row. It lands on their list at once over live sync, marked "Sent to you" with who sent it, and a kid whose screen is open gets a pop-up. It stays until it's done (for up to a week) and sits out of everyone else's draft; a side hustle sent to a kid is theirs alone. Grown-ups can take a send back. Sends are kept in `family_settings` (`sends`) and logged to `chore_sends`.
- **Money:** pay slips with family tax, a budget split into Spend, Vault, Invest and Give jars, a savings vault with daily interest, a Trust Score, and a pretend stock market.
- **Island:** a cel-shaded 3D island per kid. It has wind-blown grass, a shop of animals, toys and furniture, and upkeep jobs (mowing, weeding, raking, pond cleaning, pruning, water blasting) that each need their own tool.
  - **Makeover:** paint for the walls, roof and front door, and a colour for every tree. A colour is bought once and can be switched to and from for free. Tapping a colour shows it on the island first. Some colours only come as Character Growth prizes.
  - **Farm:** the farm paddock makes the island bigger with a fenced field, a barn, hay bales and a feed trough. Hens, goats, cows, alpacas and ponies live inside the fence. Each farm animal eats a scoop of feed a day: the paddock comes with a feed bucket and a first bag, and after that bags of 10 scoops cost XP or Spend-jar money. Feeding is an island job that earns 5 XP per hungry animal, so keeping animals is a running cost. Hungry animals sit still with a thought bubble and the trough is empty until they're fed.
- **Character Growth:** opened from the Grow tab in a kid's bottom bar, or from the Character Growth card on their Today screen. A red dot on Grow means reviews, questions about their week or a grown-up's lesson are waiting. For now it has one skill tree, Money Sense: 4 units of 4 lessons in each of 4 age bands, 64 lessons in all, built around the app's jars, chores, payday and Saving goal. The other 11 trees, Money Moments and real stories are parked in `chorecast-growth/content/parked/` and don't reach kids until a grown-up has read them.
  - **Plant:** the tree is a cel-shaded 3D plant on a floating island, one per age band. It starts as a seed in the soil. In each lesson's quiz the plant takes the stage, and every question answered right grows the stalk a step (a lesson that isn't passed gives its growth back). Every lesson passed unfurls a big leaf (right, then left, and so on) carrying what that lesson earned on top: a gold star with its XP, or the island prize it won. The lesson's label sits just under its leaf, and the kid's guide perches on the newest leaf. A finished unit puts a ring on the stalk and a label that opens the unit challenge, and passing the last lesson opens a flower with butterflies and confetti. Each first pass saves its XP (`done[lesson].xp`) and any prize it won (`done[lesson].prize`) in the kid's growth doc; passes from before that show the XP from the attempt log, or 40. The camera follows the growing tip; dragging, swiping or scrolling looks up and down the stalk, and tapping a label opens that lesson's card.
  - **Lessons:** each is about 5 minutes with a guide (Kiri the kea, Coco the cockatoo or Bolt the robot), and uses 24 kinds of mini-game. Every step plays out in 3D on the guide's island, built from the lesson's own words and game: coin towers and pies for amounts, props for ideas like saving or scams, and a scene for each kind of game that reacts to every move.
  - **How to play:** the first time a kid meets each kind of game, a hand plays it on a made-up example before their turn. It plays at an easy pace and loops, with a short rest between goes, until the kid taps "My turn!". The ? on any question replays it.
  - **Daily extras:** spaced review cards, questions about the kid's own week in Chorecast, a weekly market story, and a crew quiz for siblings side by side. Money Moments and real stories come back if they're moved out of `parked/`.
  - **Rewards:** XP feeds the island, with a 250 XP daily cap. Mastered skills raise the character level and earn titles, and the Studio shop can point a kid at a lesson to earn what they want.
  - **Island prizes:** every few lessons passed, in any tree, wins a prize. Prizes take turns: a makeover colour (paint or a tree colour), then something big the shop doesn't sell (a red panda, treehouse, hot-air balloon, baby dragon, lighthouse or unicorn foal). After those run out, prizes are chests of bonus XP. The next two prizes wait in locked bubbles on the plant where the leaves of the lessons that will win them are going to grow. When the lesson is passed, its leaf grows under the bubble, the lock shakes and springs open, the bubble pops, and the prize drops onto the leaf with an "Unlocked!" badge. `island_prizes.lesson_id` records the lesson that won each prize. Its lesson card says what it wins, the home screen shows the next two prizes, and the result screen shows a prize as soon as it's won.
  - **Prize pacing:** how many lessons a prize takes depends on how many lessons the kid passed in the last 7 days: 0 to 2 means a prize every 3 lessons, 3 to 6 every 4, 7 to 12 every 5, 13 to 18 every 6, 19 to 24 every 7, and more every 8. A kid who learns now and then still wins something about once a week. A kid racing ahead always has a prize coming up, and the list lasts longer. Each gap is set when a prize is won, so a prize a kid can see never moves further away. After a quiet week the next one moves closer. Grown-ups see prizes won and the current pace in the Character Growth report.
  - **For grown-ups:** reports, lesson assignments with bonuses, and settings for daily time, band, country, read-aloud and which trees are on. How to write lessons is in [CONTENT.md](CONTENT.md).
- **Grown-ups:** a PIN-locked dashboard to review photos, approve pay, check habits, set the money rules, follow Character Growth and manage family devices.

## Tech notes

- The page is plain HTML, CSS and JavaScript with no build step of its own. Character Growth's parts are joined into `growth.js` by `node scripts/build-growth.mjs`.
- `node scripts/check-growth.mjs` checks every lesson and question. `node scripts/chorecast-artifact.mjs out.html` makes the Claude artifact version of the page.
- The server is plain Node (`node:http`) with `pg`, or PGlite locally. Passwords are hashed with scrypt, and sessions are HttpOnly cookies.
- [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) comes from cdnjs, and the Nunito font from Google Fonts.
- **3D performance rules:**
  - **One renderer at a time:** the card renderer and the page sky pause while a full-screen 3D view covers them (a mission, the island studio, Character Growth).
  - **Card renderer buffer:** it is only as big as the largest card it draws, and only full-screen while coins rain.
  - **Clouds:** each cloud is one batched mesh (`cloudCluster`) that draws exactly like the old puff sprites, and is re-sorted back to front as the view turns.
  - **Static scenery:** in the plant, scenery is baked into one mesh per material (`bake`), and pieces still at zero size are hidden.
  - **Pacer:** every full-screen view sets its pixel ratio through `G3.pacer(renderer, max)` and calls the function it returns each frame. On a device that can't keep up, it lowers the sharpness a quarter step at a time (never below 1). A device that keeps up, or one capped at 30 fps in Low Power Mode, stays as designed.
- Weather effects (rain, storm, snow, fog, wind) are built in but switched off by `WEATHER_ON = false`.
