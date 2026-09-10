# K-5 Math Diagnostic Game

Built for the Nerdy AI Hackathon Challenge. Most math practice apps mark an
answer right or wrong and stop there. This one diagnoses *why* a wrong
answer happened, for multi-digit subtraction with borrowing/regrouping
(grades 2-3), and generates a hint aimed at that exact mistake instead of a
generic "try again."

## How it works

1. **Problem generation** — the backend generates a random 3-digit
   subtraction problem that requires at least one borrow, and traces the
   standard right-to-left borrowing algorithm column by column (hundreds,
   tens, ones) so the frontend and diagnosis logic share one source of
   truth for what "correct" looks like.

2. **Misconception detection** — when an answer is wrong, a set of pure,
   deterministic functions each simulate what answer a student *following
   a specific known buggy procedure* would produce, and the one whose
   output matches the student's actual answer is the diagnosis. This
   mirrors the methodology from Brown, J. S., & Burton, R. R. (1978),
   [*Diagnostic models for procedural bugs in basic mathematical
   skills*](https://doi.org/10.1207/s15516709cog0202_4), Cognitive
   Science, 2(2), 155-192 — which catalogued exactly these kinds of
   consistent "buggy algorithms" behind subtraction errors. An LLM never
   guesses the diagnosis; only the hint's phrasing comes from the LLM.
   Five misconceptions are currently encoded:
   - **smaller-from-larger** — subtracts the smaller digit from the
     larger one in every column, ignoring borrowing entirely
   - **borrowed without decrementing** — borrows correctly but forgets to
     reduce the column borrowed from
   - **borrow-across-zero failure** — mishandles borrowing from a column
     that itself contains a zero
   - **always-borrow** — borrows even in columns that don't need it
   - **zero-minus-digit-gives-digit** — writes the bottom digit as the
     answer when the top digit is zero, instead of borrowing

   Every one of these is tested against hand-constructed wrong-answer
   examples in `backend/test_misconceptions.py` before being trusted
   anywhere else in the app.

3. **Hint generation** — once a misconception is diagnosed, an LLM call
   (Qwen2.5-7B-Instruct, via Hugging Face) phrases a short, kid-friendly
   hint describing that specific mistake. If the call fails or is slow, a
   canned hint for that misconception is shown instead, so a hint is
   always available.

4. **Session summary dashboard** — tracks every attempt in a session
   (SQLite) and surfaces accuracy plus a breakdown of which
   misconceptions came up, so the diagnostic layer stays visible rather
   than being a hidden backend detail.

## Tech stack

- **Backend:** FastAPI + Pydantic, SQLite for attempt logging
- **Frontend:** React + Vite + Tailwind, React Router
- **Misconception detection:** pure Python, no LLM involved
- **Hint phrasing:** Qwen2.5-7B-Instruct via Hugging Face's `InferenceClient`

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
