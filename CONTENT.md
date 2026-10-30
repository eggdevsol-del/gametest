# Character Growth content

Every lesson, Money Moment and real story in Character Growth is plain text in [`chorecast-growth/content/`](chorecast-growth/content/). No code changes are needed to add or fix one.

After editing, run:

```bash
node scripts/build-growth.mjs
```

```bash
node scripts/check-growth.mjs
```

The build splits the files into `public/chorecast/growth/`, one file per tree and age band, and writes `index.json` with a new version so devices fetch the new text. The check runs every question through the app's own parser and lists anything broken: a missing `*` answer, a sort item with no bin, a budget nobody can balance, and so on.

## Trees, bands and units

There are 12 skill trees, one file each: `money`, `invest`, `work`, `make`, `give`, `maths`, `words`, `time`, `home`, `mind`, `online`, `world`.

A kid's band comes from their age. A grown-up can shift it one band up or down.

| Band | Ages |
| --- | --- |
| `sprouts` | 7 to 9 |
| `builders` | 10 to 12 |
| `makers` | 13 to 15 |
| `launchers` | 16 to 18 |

Each band has 8 units with up to 6 lessons each. Lessons in a unit open one at a time, and a unit opens once every lesson in the unit before it is passed. Each finished unit also has a unit challenge. Units that have no lessons yet show as "Coming in a content update".

## Lesson file layout

```
@band sprouts
@unit 1 | Coins and notes | Know our money and what it can do
@unit 2 | Needs and wants | Tell what we must have from what would be nice
...

@lesson 1.1 | Coins and notes | 🪙 | bank
hook: Some money is small and round. Some is flat and bendy. Why two kinds?
guess: mcq | Which is worth more? | One $5 note* | One $2 coin | One 50c coin
learn: Coins are small, round money. We use them for small amounts.
learn: Notes are flat money for bigger amounts.
try: 50c + 50c = $1 :: gap | $1 + $1 = $_ | 2
play: sort | Coin, Note | 10c=Coin; $5=Note; $20=Note | Is it a coin or a note?
check: mcq | Which one is a note? | $10* | $2 | 50c
check: tf | A bigger coin is always worth more. | false | A $2 coin is smaller but worth more.
home: Look at some coins with a grown-up. Find the number on each one.
skill: coins
```

- `@lesson unit.lesson | title | icon | scene`. The scene is the 3D set behind the guide: `bank`, `shares`, `workshop`, `stall`, `garden`, `kitchen`, `stage`, `museum`, `home`, `online`, `townhall` or `island`.
- `hook:` is the opening line the guide says.
- `guess:` is optional: a question asked before teaching, which doesn't count against the score.
- `learn:` lines are short teaching cards, one idea each.
- `try:` is a worked example, then `::`, then a practice question.
- `play:` is the lesson's main game.
- `check:` lines are scored. Use at least 2. Passing needs 80%.
- `home:` is a take-home activity for the family.
- `skill:` is a short tag. It ties together spaced review, parent reports and "Needs a hand".
- `mins:` is optional, giving the expected minutes.
- Lines starting with `#` are comments.

## Question types

Fields are separated by `|`. Lists inside a field are separated by `;`. Mark right answers with `*`.

| Type | Format |
| --- | --- |
| Multiple choice | `mcq \| Question \| right* \| wrong \| wrong` |
| True or false (swipe) | `tf \| Statement \| true or false \| why` |
| Fill the gap | `gap \| Question with _ \| answer \| choice; choice` (no choices gives a number pad or text box) |
| Sort into bins | `sort \| Bin A, Bin B \| item=Bin A; item=Bin B \| prompt` (use `jars` as the bins for Spend, Vault, Invest, Give) |
| Put in order | `order \| Question \| first; second; third` (`build` is the same, stacked as blocks) |
| Match pairs | `match \| Question \| left=right; left=right; left=right` (`route` is the same, drawn as a map) |
| Estimate on a slider | `slider \| Question \| min \| max \| answer \| unit \| tolerance \| step` |
| Best value | `price \| Question \| name:cents:qty:unit; name:cents:qty:unit` |
| Spot the scam | `scam \| Question \| message=scam; message=real; message=scam \| why` |
| Choose a path | `path \| Situation \| choice => good: outcome \| choice => bad: outcome` (grades: good, ok, bad) |
| Debate | `debate \| Topic \| stronger argument* \| weaker argument \| the other side` |
| Tap to find | `tap \| Question \| emoji:yes:why; emoji:no` |
| Budget | `budget \| Question \| income \| category=minimum; category=minimum \| surprise:cost` |
| Market ride | `market \| Question \| years` |
| Compound snowball | `compound \| Question \| start \| rate % \| years` |
| Coin shop | `shop \| Question \| item \| cost in cents \| goal in cents` |
| Timing tap | `timing \| Question \| button label \| zone label` |
| Spot the difference | `diff \| Question \| a1; a2; a3 \| b1; b2; b3` |
| Chat reply | `chat \| Question \| them: message \| me: right*/wrong/wrong` |
| Mystery clues | `mystery \| clue; clue; clue \| right* \| wrong \| wrong` |
| Island link | `island \| Question \| items, resale or stand` |
| Generated maths | `gen \| kind \| how many` (kinds: change, add, percent, round, scale, gst, time, compound, unit, split) |

## New Zealand and Australia

Wrap anything that differs by country in `{nz:...~au:...}`, for example `{nz:IRD~au:the ATO}` or `{nz:15% GST~au:10% GST}`. A grown-up picks the country in Character Growth settings. Use `~` between the two, because `|` and `;` already split fields.

## Money Moments (`moments.txt`)

One 30-second fact and question a day, from the kid's band, never repeated within 90 days.

```
@m m001 | sprouts,builders | | coins
The first coins were made about 2,600 years ago in Lydia, in what is now Türkiye.
mcq | About how old are the first coins? | About 2,600 years* | About 26 years | About 260,000 years
```

The header holds: an id, the bands (or `all`), an optional season as `MM-DD..MM-DD` (for example `12-01..12-31` for Christmas or `{nz:04-01..04-30~au:06-01..06-30}` for tax time), and skill tags. The fact goes on the next line and the question on the line after.

## Real stories (`cases.txt`)

```
@case buffett | Warren Buffett | invest | builders | 💼 | living
meet: The opening, for Builders and older.
meet@sprouts: A simpler opening for the youngest band (optional).
decide: A decision point the kid faces.
opt: A choice => what really happened with that choice
opt: Another choice => what that would have led to
happened: What actually happened.
skill: The skill to keep.
turn: Something to try in Chorecast or at home.
check: mcq | ... | ...*
```

The header holds: an id, a name, a tree, the youngest band, an icon and an optional `living` flag. Grown-ups can hide stories about living people. Each story should teach a skill, never just "this person got rich". Facts were checked in October 2026. Re-check them every six months, and especially anything about a living person.

## Content without a release

On the website, new lessons, Money Moments and real stories can also arrive through the server's content feed, with no deploy. A script or scheduled agent posts drafts:

```bash
curl -X POST "$SITE/api/content" -H "authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" -d @drafts.json
```

The body is `{"items":[...]}`, and each item uses the text formats above:

- **A Money Moment:** `{"id":"m900","kind":"moment","band":"builders","tags":["tax"],"seasonFrom":"04-01","seasonTo":"04-30","data":{"text":"The fact.","item":"mcq | Question | right* | wrong"}}`. Leave out `band` for every band.
- **Lessons:** `{"id":"money-b-2","kind":"lesson","tree":"money","band":"builders","data":{"text":"@unit 2 | ...\n@lesson 2.1 | ..."}}`. These are added to that tree's unit, next to the lessons already there.
- **A real story:** `{"id":"case-x","kind":"case","data":{"text":"@case x | Name | tree | band | icon\nmeet: ..."}}`.

Any item can also carry `startsAt` and `expiresAt` dates.

Drafts reach no one until a content editor approves them under Grown-ups, then Character Growth. A content editor is a grown-up whose email is listed in the server's `CONTENT_EDITORS` variable. Approved items go to every family on the server, which is why ordinary parents can't approve them.
