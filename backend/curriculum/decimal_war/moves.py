"""Decimal War's move functions for the curriculum engine (contract in `curriculum/engine.py`)."""

from typing import Any

from ..engine import MoveResult
from .misconceptions import Pick, correct_pick, diagnose
from .rounds import Round


def _choices(round: Round) -> list[Pick]:
    """Levels 1-2 offer the two numbers; level 3 adds "same", since its deals include equal pairs."""
    return ["mine", "robo", "same"] if round.level == 3 else ["mine", "robo"]


def visible_state(round: Round) -> dict[str, Any]:
    """Both numbers and the choices; the correct pick is shown only once the student has judged."""
    return {
        "level": round.level,
        "mine": f"0.{round.mine}",
        "robo": f"0.{round.robo}",
        "choices": _choices(round),
        "pick": round.pick,
        "correct_pick": correct_pick(round.mine, round.robo) if round.pick else None,
    }


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Judge the student's pick and return the round with the pick recorded.

    Raises ValueError when the round was already judged or the pick is not one of its choices.
    """
    if round.pick is not None:
        raise ValueError("This round has already been judged.")
    pick = move.get("pick")
    if pick not in _choices(round):
        raise ValueError(f"pick must be one of {_choices(round)}")
    return MoveResult(
        correct=pick == correct_pick(round.mine, round.robo),
        misconception=diagnose(round.mine, round.robo, pick),
        round=round.model_copy(update={"pick": pick}),
    )


def computer_move(round: Round, level: int) -> Round:
    """Robo's cards are dealt with the round, so in a judge-only game the computer has nothing to decide."""
    return round
