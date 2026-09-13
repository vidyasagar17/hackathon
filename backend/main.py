from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import get_summary, get_tier_history, init_db, log_attempt
from games import GAMES
from tiering import next_tier

load_dotenv()
init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CheckRequest(BaseModel):
    session_id: str
    problem: dict[str, Any]
    submitted_answer: int


class CheckResponse(BaseModel):
    correct: bool
    misconception: str | None


class HintRequest(BaseModel):
    problem: dict[str, Any]
    submitted_answer: int


class HintResponse(BaseModel):
    misconception: str | None
    hint: str | None


class MisconceptionCount(BaseModel):
    game: str
    name: str
    count: int


class SessionSummary(BaseModel):
    total_attempts: int
    correct_count: int
    misconceptions: list[MisconceptionCount]


def _get_game(game_id: str):
    if game_id not in GAMES:
        raise HTTPException(status_code=404, detail=f"Unknown game: {game_id}")
    return GAMES[game_id]


def _diagnose(game, problem, submitted_answer: int) -> str | None:
    """Return the diagnosed misconception for a wrong answer, or None for a correct one."""
    if submitted_answer == problem.answer:
        return None
    return game.diagnose(problem, submitted_answer)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/games/{game_id}/problem")
def get_problem(game_id: str, session_id: str) -> dict[str, Any]:
    game = _get_game(game_id)
    history = get_tier_history(session_id, game_id)
    difficulty = next_tier(history)
    return game.generate_problem(difficulty).model_dump()


@app.post("/games/{game_id}/check")
def check_answer(game_id: str, request: CheckRequest) -> CheckResponse:
    """Log the attempt and return the diagnosis. Never calls the LLM, so it stays fast."""
    game = _get_game(game_id)
    problem = game.Problem.model_validate(request.problem)
    misconception = _diagnose(game, problem, request.submitted_answer)
    correct = request.submitted_answer == problem.answer

    log_attempt(
        session_id=request.session_id,
        game=game_id,
        difficulty=problem.difficulty,
        problem_data=request.problem,
        submitted_answer=request.submitted_answer,
        correct=correct,
        misconception=misconception,
    )

    return CheckResponse(correct=correct, misconception=misconception)


@app.post("/games/{game_id}/hint")
def get_hint(game_id: str, request: HintRequest) -> HintResponse:
    """Re-diagnose the answer server-side and phrase a hint, only when the UI is about to show one."""
    game = _get_game(game_id)
    problem = game.Problem.model_validate(request.problem)
    misconception = _diagnose(game, problem, request.submitted_answer)
    hint = game.generate_hint(problem, misconception) if misconception else None
    return HintResponse(misconception=misconception, hint=hint)


@app.get("/summary/{session_id}")
def get_session_summary(session_id: str) -> SessionSummary:
    total_attempts, correct_count, misconception_rows = get_summary(session_id)
    return SessionSummary(
        total_attempts=total_attempts,
        correct_count=correct_count,
        misconceptions=[
            MisconceptionCount(game=game, name=name, count=count)
            for game, name, count in misconception_rows
        ],
    )
