# Number Quest — K-5 Math Diagnostic Platform

Built for the Nerdy AI Hackathon Challenge. Most math practice apps mark an
answer right or wrong and stop there. This one diagnoses *why* a wrong
answer happened and gives a hint aimed at that exact mistake.

It has two kinds of game, grouped on the home screen by grade band
(K–1, 2–3, 4–5):

- **Skill workshops** — column **subtraction, addition, multiplication and
  division**, one problem at a time.
- **Games against Robo** — card games from a K-5 game curriculum, played on
  one device against a computer opponent: **Decimal War** (grades 4–5), judge
  whose decimal is larger; **For Keeps** (grades 2–3), build two 2-digit
  numbers from four cards, subtract, and keep the lowest scores;
  **Multiplication Shootout** (grades 2–3), take turns with Robo answering
  times and division facts; **Fraction Spoons** (grades 4–5), draw and
  discard to collect four equal fractions and win a spoon; **The 24 Game**
  (grades 4–5), use all four cards with + − × ÷ and parentheses to make 24;
  and **Addition
  War** and **Take-Away War** (grades K–1), flip two cards, add them or take
  the smaller away, and say whose hand wins.

## How diagnosis works

Wrong answers and moves are diagnosed by pure, deterministic, pytest-covered
functions. An LLM never guesses the diagnosis.

**Workshops.** Each workshop generates a problem at one of three levels
(grounded in Common Core, e.g. 2.NBT.B.7, 4.NBT.B.5) and simulates the answer
a student *following a specific known buggy procedure* would write; the
simulator that matches the student's answer is the diagnosis. This follows
Brown, J. S., & Burton, R. R. (1978), [*Diagnostic models for procedural bugs
in basic mathematical skills*](https://doi.org/10.1207/s15516709cog0202_4),
Cognitive Science, 2(2), 155-192. Each workshop has 5 misconceptions, e.g.
subtraction's "borrow across zero failure"; a misconception can have more
than one simulator for different ways of writing it (e.g. a carry bug with the
last column written in full), and when two bugs give the same answer the more
specific one wins. The server rejects a problem the browser has edited.

**Decimal War.** Each round deals both sides 1–3 digit cards after "0." and
the student picks the larger number. The detectors follow decimal-comparison
research — Steinle, V., & Stacey, K. (1998), *The incidence of misconceptions
of decimal notation amongst students in Grades 5 to 10* (32% of Grade 5
students chose longer decimals as larger); Steinle & Stacey (2001), *Visible
and invisible zeros*; and Resnick, L. B., et al. (1989), *Conceptual bases of
arithmetic errors: The case of decimal fractions*:

| Diagnosis | Wrong pick |
|---|---|
| `longer_is_larger` | picks the number with more decimal places (0.45 over 0.8) |
| `shorter_is_larger` | picks the number with fewer decimal places (0.8 over 0.85) |
| `reciprocal_thinking` | picks the smaller of two same-length numbers (0.3 over 0.4) |
| `ignores_zero` | says 0.3 and 0.03 are the same |

Each level deals only the comparison types that reveal its misconceptions
(level 1 same length, level 2 different lengths, level 3 zeros and equal
pairs with a "They're the same" choice).

**For Keeps.** Four hands; in each, the student arranges four digit cards into
two 2-digit numbers, types the difference, then keeps or trashes it. Each
player keeps exactly two scores and the lowest total wins (rules from Kristin
Raia, "5 Rich Math Activities," Edutopia, learned from Jennifer Bay-Williams
and Dan Meyer). Only the typed difference is graded, against two-digit versions
of the subtraction workshop's buggy procedures (Brown & Burton, 1978);
arranging and keep/trash change the game but are not logged, so they never
affect levels or the summary.

| Diagnosis | Wrong difference |
|---|---|
| `zero_minus_digit_gives_digit` | writes the bottom digit under a 0 (40 − 23 → 23) |
| `smaller_from_larger` | takes the smaller digit from the larger in each column (73 − 58 → 25) |
| `borrowed_without_decrementing` | borrows but leaves the tens digit unchanged (62 − 38 → 34) |
| `always_borrow` | borrows even when the ones don't need it (57 − 32 → 15) |

A kept score is always the correct difference, so a wrong answer never lowers
a total. Robo plays by level: level 1 pairs its cards in the order dealt and
keeps any difference under 30; levels 2–3 build the smallest difference and
keep under 20 and under 10. When a keep or trash is forced (every player ends
with exactly two keeps), the other button is disabled and the reason shown.

**Multiplication Shootout.** A duel of ten turns: Robo calls a single-digit
fact, the student answers it on the keypad, then Robo answers a fact of its
own. Level 1 deals ×0, ×1, ×2 and ×5 facts; level 2 facts with both numbers
3–9; level 3 any fact, about a third of them as division facts. The detectors
follow fact-retrieval error research — LeFevre, J., et al. (1996), *Multiple
routes to solution of single-digit multiplication problems* (72–76% of errors
share a number with the correct fact, and errors on ×0 facts answer with the
other number), and Campbell, J. I. D. (1997), *On the relation between skilled
performance of simple division and multiplication* (division is solved
through the multiplication fact):

| Diagnosis | Wrong answer |
|---|---|
| `times_zero_is_the_other_number` | answers with the other number on a ×0 fact (7 × 0 → 7) |
| `added_instead_of_multiplied` | adds the two numbers (4 × 6 → 10) |
| `neighboring_fact` | gives the answer to the fact one step away (6 × 7 → 48) |
| `one_group_off` | a division answer one away from the right one (56 ÷ 8 → 6) |

When two diagnoses fit, zero wins, then adding (on small facts most slips are
addition, LeFevre et al.). Robo misses every fact above its level's size
cutoff (12, 49, 54 — right on about 70%, 80% and 91% of each level's facts)
by answering the fact one step down, and a wrong Robo answer always shows
the right one.

**Addition War and Take-Away War.** Everyday Mathematics' *Addition Top-It*,
one hand at a time: the student and Robo each flip two cards, Robo's total is
shown, the student taps their own total from four answer cards, then taps whose
hand wins (You, Robo or Same). Take-Away War takes the smaller card from the
larger. Every wrong answer card comes from a researched mistake:

| Diagnosis | Wrong answer card |
|---|---|
| `one_more_than_second` | one more than the second card, when it is the larger (3 + 4 → 5) — the most frequent preschool error in Siegler, R. S., & Shrager, J. (1984), *A model of strategy choice* |
| `counted_on_from_start` | counting on while saying the start number again (3 + 4 → 6) — Secada, W. G., Fuson, K. C., & Hall, J. W. (1983), *The transition from counting-all to counting-on in addition* |
| `subtracted_instead` | the difference instead of the sum (3 + 4 → 1) |
| `counted_down_off_by_one` | counting back ends one step early or late (8 take away 3 → 4 or 6) — Fuson, K. C. (1984, 1986) |
| `added_instead` | the sum instead of the difference (8 take away 3 → 11) |

When two mistakes give the same number, the nearest numbers that are not
researched mistakes fill the row to four cards and are not diagnosed. Only the
answer tap is graded and logged; the winner tap is checked on screen but not
logged, so an undiagnosed move never sits between two answer mistakes in the
level rule. Levels follow the standards: cards 0–5 (K.OA.A.5), then 0–10
(K.OA.A.2; addition sums within 10), then sums to 20 or a teen card minus a card
to 10 (1.OA.C.6).

**Fraction Spoons.** The classroom *Spoons* game (Games 4 Gains) made
turn-based, with no grabbing race: the student and Robo each hold four
fraction cards, and a hand is won by the first correct claim that all four
equal the card being collected; first to 3 spoons wins. Each turn the student
picks a Collecting card, draws, taps **Fits** or **Doesn't fit** for the
drawn card, discards one card, then takes the spoon or hands the turn to
Robo. The fit tap and the claim are graded; picking and discarding are
strategy and not logged. Every set is a simple fraction times 1–4 (1/3, 2/6,
3/9, 4/12), and the deck adds mistake cards built from the student's own
Collecting cards:

| Diagnosis | Wrong move |
|---|---|
| `same_difference_means_equal` | says 2/3 fits with 1/2 (top and bottom 1 apart in both) — "gap thinking", Mitchell, A., & Horne, M. (2010), *Gap thinking in fraction pair comparisons*; adding the same number to top and bottom always makes this card, so additive scaling is the same diagnosis |
| `changed_only_top_or_bottom` | says 1/4 or 2/2 fits with 1/2 (only one part × 2) — Biber, Tuna & Aktaş (2013) |
| `bigger_numbers_not_equal` | says 4/8 doesn't fit with 1/2 — Braithwaite, D. W., & Siegler, R. S. (2018), *Developmental changes in the whole number bias* (the fraction with larger numbers judged larger 62.7% of the time) |

A wrong claim names the mistake most of its odd cards show. Level 1 deals
sets from 1/2, 1/3 and 1/4 with same-difference cards (3.NF.A.3.b); level 2
adds non-unit fractions, fifths and sixths, and one-part-only cards
(4.NF.A.1); level 3 skips multipliers and reaches hundredths (3/4 = 75/100).
Robo is never wrong: it collects what it holds most of, and the level only
sets how close to a set its starting hand is.

**The 24 Game.** The classroom 24 Game (Robert Sun, 1988) made turn-based: a
duel of five hands. Each hand the student taps their four cards, + − × ÷ and
parentheses into an expression (each card once) and presses **Check**; the
server works it out exactly and shows what it makes, step by step by the
order of operations (5.OA.A.1). Every check is graded, and the student can
edit and check again or press **Show me a way** (not graded, no point). Then
Robo shows its own hand. A wrong check is diagnosed only when the student's
expression makes 24 under a mistaken order:

| Diagnosis | Wrong expression |
|---|---|
| `left_to_right` | works every operation in the order written: 3 + 5 × 3 × 1 as if it were (3 + 5) × 3 × 1 — Bye, J. K., et al. (2024), *Perceiving precedence: Order of operations errors are predicted by perception of equivalent expressions* (15–22% of 837 middle schoolers kept going left to right); Blando et al. (1989); Tabak (2019) |
| `pemdas_letter_order` | does × before ÷ or + before −: 6 × 8 ÷ 1 × 2 as if it were 6 × 8 ÷ (1 × 2) — Glidden, P. L. (2008), *Prospective elementary teachers' understanding of order of operations* (38.0% multiplied before dividing) |

Hands are dealt by what their ways to 24 need, one new idea per level: level 1
a way with no parentheses and no ÷, level 2 parentheses but no ÷, level 3 ÷
(cards 1–9, then 1–10). Every way the game shows uses whole-number steps.
Robo finds 24 with only the kinds of way its level allows (no parentheses; at
most one pair and no ÷; at most one pair) — about 48%, 91% and 97% of its
hands — and never shows wrong math.

## Adaptive difficulty

`backend/tiering.py` moves a student up a level after 3 correct in a row and
down when the *same* misconception is diagnosed twice in a row, per game.
Stars on the page show progress; there are no timers.

## Hints

Hints start as a sentence **built by code from the student's own numbers**
(`sentences.py` in each game), e.g. *"Give both numbers the same number of
digits: 0.45 and 0.80. 80 hundredths is more than 45 hundredths, so 0.8 is
larger."* An LLM (Qwen2.5-7B-Instruct via Hugging Face) may only **reword**
it to sound friendlier, within a 4-second total deadline, and the rewording
is shown only if it keeps every number, operation (× ÷ + −, or the words
times, divided by, plus, minus), place name (including tenths, hundredths,
thousandths), comparison word, "same", and carry/borrow word in order, and
uses no banned jargon (`backend/games/hint_check.py`). Otherwise
the student sees the code-built sentence. A hand review of live LLM-written
hints found wrong advice in 6 of 32 samples, which is why the LLM phrases but
never reasons. A wrong answer with no diagnosis gets a fixed general hint.

- **Workshops:** the first miss says "Not quite"; the second replays the
  correct borrow or carry on the student's own numbers, then shows the hint
  and the diagnosed pattern.
- **Decimal War:** a wrong pick outlines the larger number and offers
  "Show me why", which draws both numbers on hundredths grids beside the hint
  and diagnosed pattern. The hint is only fetched when the student asks.
- **For Keeps:** a wrong difference shows the right one and "Show me why"; the
  hint and diagnosed pattern appear in a panel beside the numbers, next to
  Keep it / Trash it, so nothing the student needs falls below the table.
- **Multiplication Shootout:** a wrong answer shows the right one and "Show me
  why" (e.g. *"48 is 6 × 8. 6 × 7 is 6 less: 48 − 6 = 42."*). Robo's own turn
  appears only when the student presses "Robo's turn", and the duel's result
  only on "See who won", so one new thing shows at a time; a win gets one
  short ring pulse, skipped under reduced motion.
- **Addition War and Take-Away War (K–1):** hints are never reworded by the
  LLM — they are read aloud to pre-readers and the counting sequence is the
  whole hint (e.g. *"Start at 4 and count on 3 more: 5, 6, 7."*). A wrong
  answer card wobbles once, the right card is outlined, and the hint is shown
  and spoken; there is no red text.
- **Fraction Spoons:** hints are never reworded by the LLM (live rewordings
  of its size relations failed the fact check or read misleadingly). "Show
  me why" draws the Collecting card and the card the hint is about as two
  fraction bars of the same length, each cut into its parts, with a dashed
  line where the Collecting card's shading ends: equal fractions reach it,
  2/3 passes 1/2. The server picks both cards, so the picture always matches
  the sentence.
- **The 24 Game:** hints are never reworded by the LLM (a moved parenthesis
  changes the math). A wrong check always lists its steps by the rule; "Show
  me why" adds the rule that was missed and the parentheses that make the
  student's order work, e.g. *"In 3 + 5 × 3 × 1, × and ÷ come before + and −,
  so it makes 18. Parentheses show the order you used: (3 + 5) × 3 × 1 = 24."*

## The move engine (games against Robo)

Curriculum games register in `backend/curriculum/` and provide `new_round`,
`visible_state`, `evaluate_move`, `computer_move`, `hint_sentence` and a
general hint, and optionally `hint_cards` for a hint picture. The server keeps
each round (so hidden cards never reach the browser) and logs every graded move
with its diagnosis; a move the game marks
as not graded (`MoveResult.counted`, e.g. arranging cards) is applied but not
logged:

- `POST /curriculum/{game_id}/rounds` — start a round at the student's level
- `POST /rounds/{round_id}/moves` — evaluate, log and answer a move (422 for a
  move the game rejects, which is not logged)
- `POST /rounds/{round_id}/hint` — hint for the round's latest move, with the
  two cards the hint compares when the game provides them

The session summary counts workshop attempts and moves together, per game.

## For students

- Grade-band picker on first visit; every game stays playable.
- Large tap targets (64 px), AAA text contrast (`npm run check:contrast`),
  read-aloud buttons, soft sound effects with a mute switch, reduced motion
  respected, and an on-screen keypad for grades 2–3 (always shown in For
  Keeps).
- **K–1 games:** card and picture taps only, no typing; each step's words are
  spoken automatically once the browser allows it, with a "Hear it again"
  button; after answering, the hint, winner buttons and Next sit beside the
  answer cards so nothing falls below the table.
- **Game-table design:** games are played on a felt table with real-looking
  digit cards; the home screen is a set of grade-band shelves of game boxes.
  Animation is used only for the math itself (the carry/borrow badge) and
  short feedback cues.

## Tech stack

- **Backend:** FastAPI + Pydantic, SQLite (attempts, rounds, moves)
- **Frontend:** React + Vite + Tailwind, React Router; Vitest + Testing Library
- **Diagnosis, dealing, tiering, hint sentences:** pure Python, no LLM
- **Hint rewording:** Qwen2.5-7B-Instruct via Hugging Face's
  `InferenceClient` (`featherless-ai` provider)

## Project layout

```
backend/
  games/                         skill workshops
    subtraction/ addition/ multiplication/ division/
      problems.py        problem generator, levels, validation
      misconceptions.py  buggy-procedure simulators and diagnose()
      sentences.py       code-built hint sentence per misconception
      hints.py           rewording prompt, banned words, general hint
    hint_check.py        rules an LLM rewording must pass
    rewording.py         LLM call with a 4-second total deadline
  curriculum/                    games against Robo
    engine.py            MoveResult and the game contract
    decimal_war/         rounds.py, misconceptions.py, moves.py,
                         sentences.py, hints.py (+ tests)
    for_keeps/           the same files: dealing, two-digit detectors,
                         moves and Robo, hint sentences (+ tests)
    card_war/            shared Addition War / Take-Away War rules: the
                         same files, with answer cards from mistakes
    addition_war/        fixes card_war to adding for the engine
    take_away_war/       fixes card_war to taking away for the engine
    fraction_spoons/     the same files: dealing with mistake cards,
                         fit and claim detectors, moves and Robo, hints
    twenty_four/         expressions.py (work out tokens under any order),
                         the same files: solver and dealing, detectors,
                         moves and Robo, hints
  tiering.py             adaptive levels
  db.py                  SQLite: attempts, rounds, moves, summary
  main.py                FastAPI routes
frontend/src/
  pages/                 LandingPage, PracticePage, DecimalWarPage, ForKeepsPage,
                         CardWarPage, MultiplicationShootoutPage,
                         FractionSpoonsPage, TwentyFourPage, DashboardPage
  components/            DigitChip, Keypad, AnswerBox, PlayingCard, GameTable,
                         ProgressMeter, HundredthsGrid, FractionCard,
                         FractionBars, ...
  regroup.ts             borrow/carry animation steps
  expressionEntry.ts     which 24 Game tile can be tapped next
```

## Running locally

**Backend**
```
cd backend
uv sync
uv run uvicorn main:app --port 8000
```
Hints work without any setup (students see the code-built sentences). To
enable LLM rewording, add a Hugging Face token to `backend/.env`:
```
HF_TOKEN=your_token_here
```

**Frontend**
```
cd frontend
npm install
npm run dev
```
Then open http://localhost:5173.

**Test on your phone** (phone on the same Wi-Fi as the laptop)
```
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```
```
cd frontend
npm run dev -- --host
```
Open the "Network" address Vite prints (e.g. `http://192.168.1.23:5173`) on
the phone. The frontend calls the API on the same host automatically. Windows
may ask to allow Python and Node through the firewall the first time.

**Hosted deployment:** build the frontend with `VITE_API_URL` set to the
backend's URL, and set `ALLOWED_ORIGINS` on the backend to the frontend's URL
(comma-separated for more than one).

**Tests and checks**
```
cd backend
uv run pytest
```
```
cd frontend
npm test
npm run check:contrast
npm run check:tap-targets
```
