# Chorecast

An iPad-first family chores app for kids aged 7 to 18. Each kid gets a daily "forecast" of chores, a floating 3D island that grows with their savings, and a pretend economy that teaches tax, saving, investing and giving.

The whole app is one self-contained page: [`public/chorecast/index.html`](public/chorecast/index.html).

## Run it

With the existing Vite setup:

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/` (on an iPad, use your computer's network address instead of `localhost`). On this branch the site root redirects to `/chorecast/`, and `npm run build` copies the page into `dist/chorecast/` unchanged.

The Tattoo Tycoon offline app (vite-plugin-pwa) is set to `selfDestroying` on this branch. Devices that installed the game get a service worker that removes itself and clears its cache, so they stop seeing the game. The game's code in `src/` is unchanged and still on `main`.

It also works from any static host, or by opening the HTML file directly in a browser.

## What's inside

- **Fair chore draft:** 112 NZ/AU chores. Each morning, shared household jobs are drafted between kids so no two get the same job, and a job a sibling just did sits out until it's due again. Bedroom jobs are always each kid's own.
- **Missions:** full-screen chore events with music, a timer, scoring, split-screen crew mode and a photo of the finished job.
- **Money:** pay slips with family tax, a budget split into Spend, Vault, Invest and Give jars, a savings vault with daily interest, a Trust Score, and a pretend stock market.
- **Island:** a cel-shaded 3D island per kid. It has wind-blown grass, a shop of animals, toys and furniture, and upkeep jobs (mowing, weeding, raking, pond cleaning, pruning, water blasting) that each need their own tool.
- **Grown-ups:** a PIN-locked dashboard to review photos, approve pay, check habits and set the money rules.

## Data

When it runs as a Claude artifact, data and photos sync through Claude's artifact storage. Run on its own like this, everything is saved in the browser on that device (localStorage and IndexedDB). Clearing the browser's site data wipes it.

## Tech notes

- Plain HTML, CSS and JavaScript in one file, with no build step of its own.
- [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) from cdnjs, and the Nunito font from Google Fonts.
- Weather effects (rain, storm, snow, fog, wind) are built in but switched off by `WEATHER_ON = false`.
