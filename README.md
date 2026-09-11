# Number Quest — K-5 Math Diagnostic Platform

Built for the Nerdy AI Hackathon Challenge. Most math practice apps mark an
answer right or wrong and stop there. This one diagnoses *why* a wrong
answer happened and generates a hint aimed at that exact mistake, across
four arithmetic games: **subtraction, addition, multiplication, and
division**.

## How it works

1. **Problem generation** — each game's backend module generates a random
   problem at one of three difficulty tiers (grounded in Common Core
   standards, e.g. 2.NBT.B.7 for subtraction/addition, 3.OA/4.NBT.B for
   multiplication/division), and traces the standard algorithm for that
   operation column by column, so the frontend and diagnosis logic share
   one source of truth for what "correct" looks like.

2. **Misconception detection** — when an answer is wrong, a set of pure,
   deterministic functions each simulate what answer a student *following
   a specific known buggy procedure* would produce, and the one whose
   output matches the student's actual answer is the diagnosis. This
   mirrors the methodology from Brown, J. S., & Burton, R. R. (1978),
   [*Diagnostic models for procedural bugs in basic mathematical
   skills*](https://doi.org/10.1207/s15516709cog0202_4), Cognitive
   Science, 2(2), 155-192 — which catalogued exactly these kinds of
   consistent "buggy algorithms." An LLM never guesses the diagnosis;
   only the hint's phrasing comes from the LLM. Each of the four games
   encodes its own 5 misconceptions (20 total), e.g. subtraction's
   "borrow-across-zero failure" or division's "only used the first
   digit of the dividend." Every one is tested against hand-derived
   wrong-answer examples (`test_misconceptions.py` in each game's
   folder) before being trusted anywhere else in the app.

3. **Adaptive difficulty** — a session-scoped tier tracker
   (`backend/tiering.py`) escalates a student to the next tier after 3
   correct answers in a row, and de-escalates when the *same*
   misconception is diagnosed twice in a row — using diagnostic data
   most practice apps don't have access to.

4. **Hint generation** — once a misconception is diagnosed, an LLM call
   (Qwen2.5-7B-Instruct, via Hugging Face's `featherless-ai` provider)
   phrases a short, kid-friendly hint describing that specific mistake.
   If the call fails or is slow, a canned hint for that misconception is
   shown instead, so a hint is always available. On a second consecutive
   wrong answer, subtraction/addition/multiplication also replay the
   correct borrow/carry visually on the student's own numbers before
   showing the hint (division uses a simpler display, since long
   division's "bring down" step doesn't fit that same visual honestly).

5. **Session summary dashboard** — tracks every attempt across all games
   in one session (SQLite) and surfaces accuracy plus a breakdown of
   which misconceptions came up, so the diagnostic layer stays visible
   rather than being a hidden backend detail.

6. **Onboarding tutorial** — a short, one-time interactive walkthrough
   (shown before a student's first game) that teaches the core loop
   using the real UI components, not a separate mockup.

## Tech stack

- **Backend:** FastAPI + Pydantic, SQLite for attempt logging
- **Frontend:** React + Vite + Tailwind, React Router
- **Misconception detection & adaptive tiering:** pure Python, no LLM
  involved
- **Hint phrasing:** Qwen2.5-7B-Instruct via Hugging Face's
  `InferenceClient` (`featherless-ai` provider)

## Project layout

```
backend/
  games/
    subtraction/   addition/   multiplication/   division/
      problems.py         - problem generator + difficulty tiers
      misconceptions.py   - 5 pure diagnosis functions
      hints.py             - LLM call + canned fallback
      test_*.py             - pytest coverage for the above
  tiering.py        - session-level adaptive difficulty
  db.py             - SQLite attempt logging
  main.py           - FastAPI routes (generic, game_id-parameterized)
frontend/
  src/pages/        - LandingPage (game picker), PracticePage, DashboardPage
  src/components/   - TutorialOverlay
```

## Running locally

**Backend**
```
cd backend
uv sync
uv run uvicorn main:app --port 8000
```
Hint generation works without any setup (falling back to canned hints).
To use real LLM-generated hints, add a Hugging Face token to
`backend/.env`:
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
