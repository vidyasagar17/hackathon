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
    hint: str | None


class MisconceptionCount(BaseModel):
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
    game = _get_game(game_id)
    problem = game.Problem.model_validate(request.problem)

    correct = request.submitted_answer == problem.answer
    misconception = None if correct else game.diagnose(problem, request.submitted_answer)
    hint = game.generate_hint(problem, misconception) if misconception else None

    log_attempt(
        session_id=request.session_id,
        game=game_id,
        difficulty=problem.difficulty,
        problem_data=request.problem,
        submitted_answer=request.submitted_answer,
        correct=correct,
        misconception=misconception,
    )

    return CheckResponse(correct=correct, misconception=misconception, hint=hint)


@app.get("/summary/{session_id}")
def get_session_summary(session_id: str) -> SessionSummary:
    total_attempts, correct_count, misconception_counts = get_summary(session_id)
    return SessionSummary(
        total_attempts=total_attempts,
        correct_count=correct_count,
        misconceptions=[
            MisconceptionCount(name=name, count=count)
            for name, count in misconception_counts.items()
        ],
    )
