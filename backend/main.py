import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

from curriculum import CURRICULUM_GAMES
from db import (
    get_last_move,
    get_move_history,
    get_round,
    get_summary,
    get_tier_history,
    init_db,
    log_attempt,
    log_move,
    save_round,
    update_round,
)
from games import GAMES
from tiering import ESCALATION_RUN, MAX_TIER, TierAttempt, correct_in_a_row, next_tier

load_dotenv()
init_db()

DEV_ORIGIN_REGEX = (
    r"^http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}"
    r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$"
)


def _cors_settings() -> dict[str, Any]:
    """Allow exactly the origins in ALLOWED_ORIGINS (comma-separated) when it is set.

    Otherwise allow the Vite dev server on this machine or on a private home network,
    so a phone on the same Wi-Fi can use the laptop's API.
    """
    origins = os.environ.get("ALLOWED_ORIGINS")
    if origins:
        return {"allow_origins": [origin.strip() for origin in origins.split(",")]}
    return {"allow_origin_regex": DEV_ORIGIN_REGEX}


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    **_cors_settings(),
    allow_methods=["*"],
    allow_headers=["*"],
)


class Progress(BaseModel):
    level: int
    correct_in_a_row: int
    needed: int
    top_level: int


class ProblemResponse(BaseModel):
    problem: dict[str, Any]
    progress: Progress


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


class RoundResponse(BaseModel):
    round_id: str
    visible_state: dict[str, Any]
    progress: Progress


class MoveRequest(BaseModel):
    move: dict[str, Any]


class MoveResponse(BaseModel):
    correct: bool
    misconception: str | None
    visible_state: dict[str, Any]


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


def _get_curriculum_game(game_id: str):
    if game_id not in CURRICULUM_GAMES:
        raise HTTPException(status_code=404, detail=f"Unknown curriculum game: {game_id}")
    return CURRICULUM_GAMES[game_id]


def _get_stored_round(round_id: str):
    stored = get_round(round_id)
    if stored is None:
        raise HTTPException(status_code=404, detail=f"Unknown round: {round_id}")
    return stored


def _parse_problem(game, data: dict[str, Any]):
    """Validate a client-sent problem; its answer and columns must follow from its own numbers."""
    try:
        return game.Problem.model_validate(data)
    except ValidationError as error:
        raise HTTPException(
            status_code=422, detail=[e["msg"] for e in error.errors()]
        ) from error


def _diagnose(game, problem, submitted_answer: int) -> str | None:
    """Return the diagnosed misconception for a wrong answer, or None for a correct one."""
    if submitted_answer == problem.answer:
        return None
    return game.diagnose(problem, submitted_answer)


def _progress(history: list[TierAttempt], level: int) -> Progress:
    """Progress toward the next level, from the same history that chose `level`."""
    return Progress(
        level=level,
        correct_in_a_row=correct_in_a_row(history, level),
        needed=ESCALATION_RUN,
        top_level=MAX_TIER,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/games/{game_id}/problem")
def get_problem(game_id: str, session_id: str) -> ProblemResponse:
    """Return the next problem at the session's tier, with progress toward the next tier."""
    game = _get_game(game_id)
    history = get_tier_history(session_id, game_id)
    difficulty = next_tier(history)
    return ProblemResponse(
        problem=game.generate_problem(difficulty).model_dump(),
        progress=_progress(history, difficulty),
    )


@app.post("/games/{game_id}/check")
def check_answer(game_id: str, request: CheckRequest) -> CheckResponse:
    """Log the attempt and return the diagnosis. Never calls the LLM, so it stays fast."""
    game = _get_game(game_id)
    problem = _parse_problem(game, request.problem)
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
    """Re-diagnose the answer server-side and phrase a hint, only when the UI is about to show one.

    A wrong answer with no diagnosed misconception gets the game's canned general hint,
    never an LLM hint, since the LLM must not guess what went wrong.
    """
    game = _get_game(game_id)
    problem = _parse_problem(game, request.problem)
    misconception = _diagnose(game, problem, request.submitted_answer)
    if request.submitted_answer == problem.answer:
        hint = None
    elif misconception:
        hint = game.generate_hint(problem, misconception)
    else:
        hint = game.GENERAL_HINT
    return HintResponse(misconception=misconception, hint=hint)


@app.post("/curriculum/{game_id}/rounds")
def new_round(game_id: str, session_id: str) -> RoundResponse:
    """Start a round at the session's level. The full round stays on the server; the browser sees only its visible state."""
    game = _get_curriculum_game(game_id)
    history = get_move_history(session_id, game_id)
    level = next_tier(history)
    round_state = game.new_round(level)
    round_id = save_round(session_id, game_id, level, round_state.model_dump())
    return RoundResponse(
        round_id=round_id,
        visible_state=game.visible_state(round_state),
        progress=_progress(history, level),
    )


@app.post("/rounds/{round_id}/moves")
def make_move(round_id: str, request: MoveRequest) -> MoveResponse:
    """Evaluate and log the student's move, then let the computer take its turn, and save the round.

    A move the game rejects (ValueError) returns 422 and is not logged, so it can't affect the level.
    """
    stored = _get_stored_round(round_id)
    game = CURRICULUM_GAMES[stored.game]

    try:
        result = game.evaluate_move(game.Round.model_validate(stored.state), request.move)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if result.counted:
        log_move(round_id, request.move, result.correct, result.misconception)
    after_computer = game.computer_move(result.round, stored.level)
    update_round(round_id, after_computer.model_dump())

    return MoveResponse(
        correct=result.correct,
        misconception=result.misconception,
        visible_state=game.visible_state(after_computer),
    )


@app.post("/rounds/{round_id}/hint")
def get_round_hint(round_id: str) -> HintResponse:
    """Phrase a hint for the round's latest move, only when the UI is about to show one.

    Uses the diagnosis the server logged for that move, so the browser can't change it. A wrong
    move with no diagnosed misconception gets the game's general hint, never an LLM hint.
    Returns 422 before the round has a move.
    """
    stored = _get_stored_round(round_id)
    last_move = get_last_move(round_id)
    if last_move is None:
        raise HTTPException(status_code=422, detail="This round has no move to give a hint for yet.")

    correct, misconception = last_move
    game = CURRICULUM_GAMES[stored.game]
    if correct:
        hint = None
    elif misconception:
        hint = game.hint_sentence(game.Round.model_validate(stored.state), misconception)
    else:
        hint = game.GENERAL_HINT
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
