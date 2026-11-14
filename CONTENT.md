# Character Growth content

Every lesson, Money Moment and real story in Character Growth is plain text in [`chorecast-growth/content/`](chorecast-growth/content/). No code changes are needed to add or fix one.

Only files directly in `content/` ship. Files in [`content/parked/`](chorecast-growth/content/parked/) are kept but never built, so kids don't see them. A tree also has to be listed in `LIVE` in `chorecast-growth/01-core.js`.

After editing, run:

```bash
node scripts/build-growth.mjs
```

```bash
node scripts/check-growth.mjs
```

The build splits the files into `public/chorecast/growth/`, one file per tree and age band, and writes `index.json` with a new version so devices fetch the new text. The check runs every question through the app's own parser and lists anything broken: a missing `*` answer, a sort item with no bin, a budget nobody can balance, and so on.

## Trees, bands and units

Seven subjects are live: `money` (Money Sense), `character` (Good Character), `maths` (Maths), `words` (English), `science` (Science), `mind` (Strong Mind) and `body` (Healthy Body). The rest (`invest`, `work`, `make`, `give`, `home`, `online`), `moments.txt`, `cases.txt` and the full 8-unit Money Sense (`money.full.txt`) are in `parked/`, with the old Everyday Maths, Words That Work, Mind and Body, Money Through Time and How the World Works files, which new units may borrow from. To bring a parked subject back, check every lesson in it first, trim it to the shape below, move it up into `content/` and add it to `LIVE`.

A kid's band comes from their age. A grown-up can shift it one band up or down.

| Band | Ages | School years (NZ) |
| --- | --- | --- |
| `sprouts` | 7 to 9 | about Years 3 to 5 |
| `builders` | 10 to 12 | about Years 6 to 8 |
| `makers` | 13 to 15 | about Years 9 and 10 |

Kids 16 and over use the Makers band. Chorecast isn't made for older teens.

Subjects grow every month. Each month's drop adds whole units to every live subject in all three bands, numbered on from the last one, so a year of lessons builds up a month at a time. A unit has 4 lessons, except Money Sense's first 8 units, which have 6. The checker fails if a unit has the wrong number of lessons or the units skip a number. Lessons in a unit open one at a time, and a unit opens once every lesson in the unit before it is passed. Each finished unit also has a unit challenge.

A month's drop is 15 units in each band (60 lessons): Maths 4, English 3, Science 3, Strong Mind 2, and one each of Healthy Body, Good Character and Money Sense. Kids can start as many new lessons a day as they like, unless a grown-up sets a cap (`perDay`), so drops are written well ahead of the fastest kid.

## What lessons cover

Money Sense and Good Character stay close to things a kid can practise in Chorecast: earning from chores, the four jars, payday, the Saving goal, spending, saving and spotting a bad deal or a scam. Where it fits, the `home:` task is something to do in the app that week.

The school subjects follow the NZ Curriculum for the band's school years: English and Mathematics and Statistics as used in schools from 2026, and the new Years 0–10 science that schools start using in 2027. Set word problems and examples in the Chorecast world (the island, the farm stand, chores, the jars) where that fits naturally, and nowhere it would feel forced.

- **Maths:** number and place value, adding and taking away, times tables and dividing, fractions, decimals and percentages, measuring, time, shapes and angles, data, chance and (for Makers) algebra. Write every sum out in numerals (`7 × 8 = _`) where you can: the checker works written sums out again. Maths practice (`MATHS.K` in `13-practice.js`) gives endless extra questions; a lesson can use them too, with `gen | kind | how many`.
- **English:** reading (short passages written for the lesson, with questions about them), spelling and word knowledge, grammar and punctuation, and writing. NZ spelling (colour, centre, practise as a verb). Passages are original: never quote books, songs or poems.
- **Science:** living things, the physical world (forces, energy, light, sound, electricity), materials, Earth and space, and how scientists find out (fair tests, observing, measuring). Facts that are settled science only, with no numbers that change. Experiments use safe household things with a grown-up nearby: no fire, no hot liquids, no mixing cleaning products, nothing to eat or sniff.
- **Strong Mind:** good habits, self-control and patience, bouncing back, goals, handling worry and big feelings, focus and a growth mindset. Everyday feelings only: anything that sounds like a crisis (not eating, hurting themselves, not wanting to be alive) is for families and doctors, so lessons only ever say to talk to Mum, Dad or another trusted grown-up.
- **Healthy Body:** moving and playing, sleep, food groups and water, germs and washing hands, teeth, sun safety, water safety, road safety and simple first aid (get a grown-up, call 111 in New Zealand or 000 in Australia with `{nz:…~au:…}`). No diets, weighing, calories, body shapes or puberty: those are for parents.
- **Good Character:** as below, with more gratitude, kindness, honesty, respect and responsibility.

Lessons never cover sex or consent, alcohol, drugs or vaping, mental health crises, body image, politics or law, Treaty or Indigenous history, religion, or real people and brands. Those belong with families and schools.

Good Character teaches gratitude, attitude, honesty, respect, body safety, online safety and screens, from a family's point of view. Body safety stays protective and plain: private parts are the parts a swimsuit covers, nobody touches them, asks to see them or sends pictures, and kids say no, get away and tell Mum or Dad, even about a \"secret\". Anything about relationships, sex, religion or politics is left to parents, so the `home:` task sends kids to ask their parents what their family believes. Screen science sticks to what is well established (late screens hurt sleep, apps are built to hold attention, the brain's planning and self-control keep developing into the twenties) and gives no statistics.

No facts that go out of date: no tax rates, wages, thresholds, laws, phone numbers, websites or recent dates. The one exception is Money Sense's Makers band, which a grown-up asked to keep in full: its lessons on bank accounts, your first pay, scams and worry use {nz:…~au:…} lines with tax numbers, KiwiSaver and super rules, helpline numbers and websites, and need checking each year. Use made-up round prices ("a $20 game") so nothing needs fact-checking and both countries read the same.

The app has no way for kids to spend or give money themselves. A grown-up pays out the Spend or Give jar under Grown-ups, then Pay out cash, so lessons say "ask a grown-up to pay it out".

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
- `check:` lines are the quiz. Use at least 2.
- A lesson is scored as a whole, shown to kids as a percentage: every `try:` and `check:` question is worth 1 point and the `play:` game 3 (scaled by its score and rounded), and 80% or more passes. 95% or more is a top score: the third star and a little bonus XP. `guess:` never counts. A kid who doesn't reach 80% can practise just the questions they missed, and their right answers are kept.
- A lesson with 16 or more scored items is split into even rounds of up to 12, with a checkpoint after each round where progress is saved, so a long lesson can be finished over more than one sitting.
- `home:` is a take-home activity for the family.
- `skill:` is a short tag. It ties together spaced review, parent reports and "Needs a hand".

### Long lessons in every subject

A lesson file stays short. When a kid starts a lesson, the app builds it out with more questions and games on the same topic, until it has **40 for Sprouts, 45 for Builders and 50 for Makers**, counting the lesson's own tries, game and checks. The lesson's own game and questions always come last. Long lessons split into rounds (see above).

- **Maths** lessons are built from their `skill:`. Each maths topic has a question maker in `chorecast-growth/14-drill.js` (`MSKILL`). It makes fresh numbers every time and works out the answer in code. `tests/lesson-drill.test.mjs` works each answer out again, 300 times per topic. Each question is asked as fill the gap, multiple choice and true or false. The topic's games come in too: **Memory flip**, **Lightning round**, **Balloon pop** (for example, "Pop every multiple of 5"), and, for the right topics, **Clock hands** (drag the hands to a time), **Pizza fractions** (shade the slices), **Balance scale** (add weights to balance 7 + ? = 15) and **Coin counter**. Earlier topics in the unit are mixed in at the end. A maths topic the app can't make numbers for (shapes, symmetry, graphs, chance) uses a fact bank instead, in `content/facts/maths.txt`, and also mixes in fresh questions on the unit's number topics. Every maths lesson needs a question maker or a fact bank before it can go live.
- **Every other subject** is built from the lesson's **fact bank**. Fact banks live in `content/facts/<tree>.txt`, one `@band` section per age band and one `@facts unit.lesson` block per lesson. The build adds them to the end of each band's pack:

  ```
  @band sprouts
  @facts 1.2
  fact: Sleep lets your body [grow]. | shrink; disappear; melt
  ```

  The right answer goes in `[square brackets]`. After the `|` come 2 or 3 wrong answers, separated by `;`, and each one must make the sentence **clearly false** (not just odd, and never accidentally true). Each fact is asked as fill the gap, true or false (once each way, far apart), "Which one is true?", **Guess the word** (for one-word answers of 3 to 10 letters), **Lightning rounds** and a **True or False sort**. Then facts from earlier lessons are mixed in. Money Sense adds **Coin counter**. Every lesson needs **8 to 12 facts**. A `{nz:…~au:…}` country switch can go in the sentence but not in the answer or the wrong answers. Sprouts facts are 18 words or fewer, and others 24 or fewer.
- **Every wrong answer must read as a whole sentence when it's dropped into the gap.** True or false, "Which one is true?" and the sorts show the full sentence, so "they can [rely] on you. | lie to" makes "they can lie to on you". Put the joining words inside the brackets when the wrong answers need different ones ("[look at] the person. | turn away from; frown at"). Match the answer's form: a verb for a verb, plural for plural ("[Everyone] has feelings. | Nobody; Only one person", not "Only babies"). A wrong answer can't be true in any reading ("Including someone is scary" might be), and story details say which story ("In Mia's story, …") because they're mixed into later lessons. An "a" or "an" just before the brackets is moved into each choice by the app ("as an [egg]. | seed" shows "as a seed"), so write the article that fits the right answer. `tests/lesson-drill.test.mjs` catches two joining words in a row, a doubled word and a wrong "a"/"an"; the rest is read by Claude.
- **Body safety and online safety facts** use only harmless, silly wrong answers (a goldfish, a teddy, the moon). A kid must never read a false sentence that blames them, says to keep a secret, or says not to tell. Never "a robot" or "a stranger" as a wrong answer for who to tell or trust: a kid could read a chatbot or a stranger as fine.
- Fact banks follow every content rule in this file and are checked like lessons. A grown-up samples them on the review page.
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
| Best value | `price \| Question \| name:dollars:qty:unit; name:dollars:qty:unit` (dollars, e.g. `Big bag:4.50:2:kg`) |
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
| Generated maths | `gen \| kind \| how many` (money kinds: change, add, percent, round, scale, gst, time, compound, unit, split; or any maths practice kind in `MATHS.K`, such as times, fracof, equation) |

## 3D scenes

Every step of a lesson acts itself out on the guide's 3D island. The scene is built from what you write, so there's nothing extra to add.

- **Hook:** the lesson's emoji spins in on a pedestal, with props for the ideas the hook mentions.
- **Learn cards:** dollar amounts become coin towers and percentages become slices of a pie. Key words add an animated prop, up to two per card:
  - save: piggy bank;
  - plan, budget or goal: clipboard;
  - price, cost or deal: price tag;
  - spend or buy: shopping bag;
  - interest, grow or invest: money plant;
  - shares, market or fund: chart;
  - scam or fake: shield;
  - online, phone or password: phone;
  - give, help or thank: heart;
  - work, job or skills: toolbox;
  - sell, customer or profit: stall;
  - card, loan or debt: bank card;
  - tax, council or rules: town hall;
  - home or bills: house;
  - food, lunch or recipe: plate of food;
  - feelings, calm or habits: breathing bubble;
  - history or barter: old urn;
  - time, week or year: clock;
  - read, write or explain: speech bubbles;
  - compare or unit price: balance scale;
  - money, pay or earn: coins.
- **Questions and games:** each kind has a scene that reacts to every move, such as lettered answer plinths, True and False signposts, a number tile, jars to sort into, stepping stones, a balance scale, spending stands, a bar chart or a snowball.
- **Take it home:** a house and a to-do board.

The first time a kid meets each kind of game, a hand plays it on a made-up example before their turn, so the demo never gives away a lesson's answers.

## New Zealand and Australia

Wrap anything that differs by country in `{nz:...~au:...}`, for example `{nz:IRD~au:the ATO}` or `{nz:15% GST~au:10% GST}`. A grown-up picks the country in Character Growth settings. Use `~` between the two, because `|` and `;` already split fields.

Questions are split into fields before the country text is swapped in, so keep separators outside the braces: no `|`, `;`, `=`, `*`, `/`, `=>` or (in sort bins) `,` inside `{nz:...~au:...}`. `price` and `tap` items can't use the braces at all, and numbers in `slider` and `budget` items aren't localised, so keep those the same for both countries. A `gap` with answer chips can't localise its answer either; use the number pad instead.

## Languages

Te reo Māori, Spanish, Mandarin and Japanese courses (`LANGS` in `chorecast-growth/01-core.js`). Each is one course for every age, aimed at speaking on your own: 8 stages of 10 units of 8 lessons, with a story and a challenge per unit, about 3,000 words in all. Each course starts with a course map (`<id>.map.md`, beside the course) that plans every unit to the top level before any lesson is written. The te reo stages are Te Aho Arataki Marau's eight levels.

A course is one file, `content/<id>.txt` (or in `parked/` until it's reviewed), split by `@stage`:

```
@lang mi
@pairs papa/pāpā
@stage 1
@unit 1 | Kia ora! | Greet people and say goodbye

@lesson 1.1 | Kia ora | 👋 | home
hook: People all over Aotearoa say one friendly word every day.
word: kia ora | hello, thanks | 👋 | wave
say: «Kia ora, Ari!» | Hello, Ari!
rule: «Kia ora» works for anyone, any time.
learn: «Kia ora» means hello and thanks.
chant: «Tēnā koe»; «Tēnā kōrua»; «Tēnā koutou»
play: hear | Which one is «kia ora»? | 👋* | 🌙 | 🍎
check: hear | What does «kia ora» mean? | hello and thanks* | good night | see you later
home: Say «kia ora» to everyone in your family today.
skill: mi-greet

@story 1 | Mōrena, Mere!
line: Ari | «Mōrena, Mere!» | Good morning, Mere!
check: mcq | Who is leaving at the end? | Mere* | Ari | Nobody
```

- Text in `«…»` is in the language. Kids can tap it to hear it, and to see what a word they've learned means.
- `word:` is the word, its meaning, a picture (an emoji, different from the lesson's other words), an action for Sprouts to do as they say it and, for Mandarin and Japanese, its reading (pinyin with tone marks, or rōmaji). 1 to 8 new words a lesson.
- `say:` is a phrase, its meaning and (for Mandarin and Japanese) its reading. Kids hear it, say it and hear both.
- Mandarin and Japanese show each known word's reading above it (as ruby) for Sprouts always and for everyone in stages 1 and 2. Japanese stage 1 is written in hiragana with spaces between words. In `tiles` answers for Mandarin and Japanese, spaces mark where one tile ends and the next begins.
- `rule:` is a pattern. Makers see it before the words, Builders after them as "Spot the pattern", and Sprouts don't see it at all unless there's a `rule@sprouts:`.
- `chant:` is said to a beat, for Sprouts only.
- `learn@sprouts:`, `rule@makers:` and so on replace a line for one band.
- `@pairs` lists real words that differ only in their marks (papa, floor; pāpā, dad). Anything else spelled two ways fails the check.
- `@story n | title`, after a unit's lessons, has `line: who | «words» | meaning` lines and at least 2 checks.

Language questions, on top of the usual ones:

| Type | Format |
| --- | --- |
| Hear it | `hear \| Question with «what's heard» \| right* \| wrong \| wrong` (the «» part is played, not shown) |
| Which did you hear? | `pair \| Question \| «one»* \| «other»` |
| Say it | `say \| «phrase» \| meaning` (practice: never marked, so not for checks) |
| Type it | `type \| Prompt \| answer \| hint` (Sprouts and Builders are let off missing macrons and accents) |
| Build it | `tiles \| Prompt \| answer` (the words of a phrase, or the letters of a word) |
| Trace it | `trace \| «字» \| meaning` (trace a character or a few kana over a faint copy; marked by how much of it the finger covered, without stroke order yet) |

The app also builds these language games itself (they aren't written in lesson files):
- **Does it mean this?** Hear a word, then answer yes or no to a picture and meaning.
- **Hear three.** Tap each of three spoken words, then pick the one that means the picture.
- **Fill the gap.** Put a new word back into one of the lesson's phrases, with its meaning as the clue.
- **Memory flip.** Match each word to its picture, with the cards face down.
- **Listen and pop.** Hear a word, then pop its bubble. There are five rounds.
- **Guess the word.** Spanish only: spell a new word letter by letter from its picture and meaning.

**Long lessons are built, not written.** A lesson file stays short: its words, phrases, rules, tries, game and checks. The app adds questions about the same words from every angle until the lesson reaches **40 for Sprouts, 45 for Builders and 50 for Makers** (counting the lesson's own tries, game and checks):
- **Listen:** hear it and pick what it means; hear it, does it mean this?
- **Read:** see what it means and pick the word; hear it and pick the written word; hear three and pick the one that means it; match them all; Memory flip; Listen and pop.
- **Characters first (Mandarin and Japanese):** right after a word is introduced, a card shows each character in it with its sound. New ones are marked, and Mandarin characters also get a short meaning. Japanese notes say how a kana works in that word: は said "wa" in こんにちは, う making an "o" long (おはよう, ohayō), a small っ stop, a small ゃ joining the kana before it, and ー. The lesson then asks about those characters ("What sound does よ make?", "Which one says “hǎo”?", "What does 好 mean?") before any "Build it". Build tiles show each character's sound underneath while rōmaji or pinyin is on. Each Mandarin character's sound comes from the word's own pinyin (一 in 一百 is yì), and its meaning comes from the `HAN` list in `chorecast-growth/16-chars.js`. A new character in a new stage needs a line there; `tests/lang-drill.test.mjs` fails until it has one, and it checks that every character on a build tile was taught first.
- **Make it:** build it from its letters, kana or characters; type it (Spanish, Builders and Makers) or trace it (Mandarin and Japanese); Guess the word (Spanish); say it.
- **Phrases:** hear a phrase and pick its meaning; build it from its words; fill the gap; pick the phrase (Builders and Makers).
- **Mix:** the new words again with fresh choices, then words and phrases from earlier lessons in the unit, then earlier units.

Every built question uses only words and phrases already in the course, so there's nothing new to check. A wrong choice never shares a meaning with the right one (meanings are compared without their brackets, so «amigo», friend (a boy), is never a wrong choice for «amiga»). It also never sounds the same: Spanish words that differ only by an accent, and Mandarin or Japanese words with the same reading (他 and 她), are never both choices in a listening question. Grammar words, whose meaning is only a note like "(a question word)", are never wrong choices. A lesson in a stage's first unit, with nothing earlier to mix in, can come out shorter (the first Spanish lesson, with one word, is about 20). `tests/lang-drill.test.mjs` builds every lesson for every band and checks each question has exactly one right answer.

How a course reaches each kid:
- **Every band takes the same lessons.** Sprouts take a lesson of more than 3 new words in two sittings, Makers can test out of a lesson by passing its questions, and placement ("Already know some?") counts the units a kid knows as learned.
- **Review cards.** Every word and phrase becomes a card that comes back after 1, 3, 7, 16, 35 and 90 days: first hear it and pick the meaning, then (from box 3) say, build or type it. Up to 20 a day per language, and a new lesson waits until the day's cards are done.
- **Kept out:** the same as every lesson, plus karakia and anything religious or tapu. Mandarin uses simplified characters and stays clear of politics.

The checker fails a course if a question or story uses a word that hasn't been taught yet (for Mandarin and Japanese, a character or kana; a story may have 1 new word in 20), a Mandarin or Japanese word or phrase has no reading, a word has no picture or meaning, a word is spelled two ways, or a stage isn't 10 units of 8 lessons. A live language with no device voice (te reo Māori) also needs a recording of every line (`growth/audio/<id>.json`). To try a parked course in the app, build with `node scripts/build-growth.mjs --preview`; the checker then fails until it's built again without it, so a preview build can't be committed by mistake.

**Recordings.** Te reo Māori has no voice on Apple devices and is never read by an English voice. A content editor who is a fluent speaker records each line under Grown-ups, then Character Growth, then Recording studio. The build lists every line in `growth/<id>.lines.json`. Until a line is recorded, kids see its words and "Recording on its way".

**Before a stage goes live:** a fluent speaker (for te reo, ideally a kaiako) reads every lesson, the te reo lines are recorded, and a grown-up reads a sample for suitability. Then move it out of `parked/` and add its id to `LANG_LIVE`. (Spanish, Mandarin and Japanese stage 1 went live on 4 November 2026 after a dictionary cross-check instead, at the owner's choice; te reo waits for its kaiako and recordings.) The checker fails if a course in `LANG_LIVE` isn't built, or a built course isn't in `LANG_LIVE`.

## Money Moments (`moments.txt`)

Parked for now: the file is `parked/moments.txt`, so none ship until it has been read and moved back.

One 30-second fact and question a day, from the kid's band, never repeated within 90 days.

```
@m m001 | sprouts,builders | | coins
The first coins were made about 2,600 years ago in Lydia, in what is now Türkiye.
mcq | About how old are the first coins? | About 2,600 years* | About 26 years | About 260,000 years
```

The header holds: an id, the bands (or `all`), an optional season as `MM-DD..MM-DD` (for example `12-01..12-31` for Christmas or `{nz:04-01..04-30~au:06-01..06-30}` for tax time), and skill tags. The fact goes on the next line and the question on the line after.

## Real stories (`cases.txt`)

Parked for now: the file is `parked/cases.txt`, so none ship until it has been read and moved back.

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
