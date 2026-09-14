# Number Quest — K-5 Math Diagnostic Platform

Built for the Nerdy AI Hackathon Challenge. Most math practice apps mark an
answer right or wrong and stop there. This one diagnoses *why* a wrong
answer happened and gives a hint aimed at that exact mistake.

It has two kinds of game, grouped on the home screen by grade band
(K–1, 2–3, 4–5):

- **Skill workshops** — column **subtraction, addition, multiplication and
  division**, one problem at a time.
- **Games against Robo** — card games from a K-5 game curriculum, played on
  one device against a computer opponent. The first is **Decimal War**
  (grades 4–5): judge whose decimal is larger.

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
is shown only if it keeps every number, place name (including tenths,
hundredths, thousandths), comparison word, "same", and carry/borrow word in
order, and uses no banned jargon (`backend/games/hint_check.py`). Otherwise
the student sees the code-built sentence. A hand review of live LLM-written
hints found wrong advice in 6 of 32 samples, which is why the LLM phrases but
never reasons. A wrong answer with no diagnosis gets a fixed general hint.

- **Workshops:** the first miss says "Not quite"; the second replays the
  correct borrow or carry on the student's own numbers, then shows the hint
  and the diagnosed pattern.
- **Decimal War:** a wrong pick outlines the larger number and offers
  "Show me why", which draws both numbers on hundredths grids beside the hint
  and diagnosed pattern. The hint is only fetched when the student asks.

## The move engine (games against Robo)

Curriculum games register in `backend/curriculum/` and provide `new_round`,
`visible_state`, `evaluate_move`, `computer_move`, `hint_sentence` and a
general hint. The server keeps each round (so hidden cards never reach the
browser) and logs every move with its diagnosis:

- `POST /curriculum/{game_id}/rounds` — start a round at the student's level
- `POST /rounds/{round_id}/moves` — evaluate, log and answer a move (422 for a
  move the game rejects, which is not logged)
- `POST /rounds/{round_id}/hint` — hint for the round's latest move

The session summary counts workshop attempts and moves together, per game.

## For students

- Grade-band picker on first visit; every game stays playable.
- Large tap targets (64 px), AAA text contrast (`npm run check:contrast`),
  read-aloud buttons, soft sound effects with a mute switch, reduced motion
  respected, and an on-screen keypad for grades 2–3.
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
  tiering.py             adaptive levels
  db.py                  SQLite: attempts, rounds, moves, summary
  main.py                FastAPI routes
frontend/src/
  pages/                 LandingPage, PracticePage, DecimalWarPage, DashboardPage
  components/            DigitChip, Keypad, ProgressMeter, HundredthsGrid, ...
  regroup.ts             borrow/carry animation steps
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
