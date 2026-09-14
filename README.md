# Number Quest — K-5 Math Diagnostic Platform

Built for the Nerdy AI Hackathon Challenge. Most math practice apps mark an
answer right or wrong and stop there. This one diagnoses *why* a wrong
answer happened and gives a hint aimed at that exact mistake, across four
arithmetic games: **subtraction, addition, multiplication, and division**.

## How it works

1. **Problem generation** — each game's backend module generates a random
   problem at one of three difficulty tiers (grounded in Common Core
   standards, e.g. 2.NBT.B.7 for subtraction/addition, 3.OA/4.NBT.B for
   multiplication/division) and traces the standard algorithm column by
   column. Every problem validates that its answer and columns follow from
   its own numbers, so the server rejects a problem the browser has edited.

2. **Misconception detection** — when an answer is wrong, a set of pure,
   deterministic functions each simulate the answer a student *following a
   specific known buggy procedure* would produce; the one that matches the
   student's answer is the diagnosis. This mirrors the methodology of
   Brown, J. S., & Burton, R. R. (1978), [*Diagnostic models for procedural
   bugs in basic mathematical skills*](https://doi.org/10.1207/s15516709cog0202_4),
   Cognitive Science, 2(2), 155-192, which catalogued these consistent
   "buggy algorithms." Each game encodes 5 misconceptions (20 total), e.g.
   subtraction's "borrow across zero failure" or addition's "reversed
   carry" (writing the tens digit and carrying the ones). When two bugs
   produce the same answer, the more specific one wins. An LLM never
   guesses the diagnosis.

3. **Adaptive difficulty** — a session-scoped tracker (`backend/tiering.py`)
   moves a student up a tier after 3 correct answers in a row, and down
   when the *same* misconception is diagnosed twice in a row.

4. **Hints** — the first wrong answer only says "Not quite." On the second,
   subtraction, addition, and multiplication replay the correct borrow or
   carry on the student's own numbers (division uses a simpler display,
   since long division's "bring down" step doesn't fit that visual), then
   the hint and diagnosed pattern appear, with a "Next problem" button.
   - The hint starts as a sentence **built by code from the student's
     digits** (`sentences.py` in each game), e.g. *"In the ones column, 2 is
     smaller than 8, so you can't subtract yet: borrow from the tens
     column."* These sentences are pytest-covered and never state a
     column's result.
   - An LLM (Qwen2.5-7B-Instruct via Hugging Face) may only **reword** that
     sentence to sound friendlier, within a 4-second total deadline. The
     rewording is shown only if it keeps every number, place name,
     comparison word, and carry/borrow word in the same order, and doesn't
     state the answer or use banned jargon (`backend/games/hint_check.py`).
     Otherwise the student sees the code-built sentence.
   - Why: a hand review of live LLM-written hints found wrong advice in 6
     of 32 samples (e.g. "make the 5 in the hundreds column into a 4" for
     356 − 297). Letting the LLM phrase but never reason keeps every hint
     correct.
   - A wrong answer that matches no known misconception gets a fixed
     general hint for that game.

5. **Session summary dashboard** — every attempt is logged in SQLite and
   summarized per game: accuracy plus which misconceptions came up, so the
   diagnostic layer stays visible rather than hidden in the backend.

6. **Onboarding tutorial** — a short, one-time walkthrough shown before a
   student's first game, using the real UI components.

## Tech stack

- **Backend:** FastAPI + Pydantic, SQLite for attempt logging
- **Frontend:** React + Vite + Tailwind, React Router
- **Misconception detection, tiering, hint sentences:** pure Python, no LLM
- **Hint rewording:** Qwen2.5-7B-Instruct via Hugging Face's
  `InferenceClient` (`featherless-ai` provider)

## Project layout

```
backend/
  games/
    subtraction/   addition/   multiplication/   division/
      problems.py         - problem generator, difficulty tiers, validation
      misconceptions.py   - 5 pure diagnosis functions
      sentences.py        - code-built hint sentence per misconception
      hints.py            - game prompt, banned words, general hint
      test_*.py           - pytest coverage for the above
    hint_check.py   - rules an LLM rewording must pass
    rewording.py    - LLM call with a 4-second total deadline
  tiering.py        - session-level adaptive difficulty
  db.py             - SQLite attempt logging and summary
  main.py           - FastAPI routes: /problem, /check, /hint, /summary
frontend/
  src/pages/        - LandingPage (game picker), PracticePage, DashboardPage
  src/components/   - DigitChip, TutorialOverlay
  src/regroup.ts    - borrow/carry animation steps
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

**Tests**
```
cd backend
uv run pytest
```
