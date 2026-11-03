# Chorecast

Chores, pocket money and growing up, for families with kids aged 7 to 15. A Node server (`server/`) with Postgres
(or an embedded database locally) serves the app from `public/chorecast/`.

- `npm start` runs the server (`--port`, `--static`; see the top of `server/index.js`).
- `npm test` runs every test suite against real servers on throwaway databases; `npm run lint` checks the code.
- `npm run smoke`, `npm run backup`, `npm run restore` and `npm run metrics` are described in `CHORECAST.md`.

Everything about how the app works, its data and its settings is in [CHORECAST.md](CHORECAST.md); lesson content is
described in [CONTENT.md](CONTENT.md).
