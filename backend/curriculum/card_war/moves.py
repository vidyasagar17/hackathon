"""Addition War and Take-Away War move functions for the curriculum engine (contract in `curriculum/engine.py`).

A hand is two moves: pick your own sum or difference from four answer cards (graded, diagnosed,
counted, one try), then pick whose hand wins — mine, robo or same (graded on screen but not counted,
so an undiagnosed comparison never sits between two answer mistakes in the level rule).
"""

from typing import Any, Literal

from ..engine import MoveResult
from .misconceptions import answer_choices, correct_answer, diagnose
from .rounds import Round, Winner

Step = Literal["answer", "winner", "done"]

WINNERS: list[Winner] = ["mine", "robo", "same"]


def _step(round: Round) -> Step:
    if round.answer_pick is None:
        return "answer"
    return "winner" if round.winner_pick is None else "done"


def correct_winner(round: Round) -> Winner:
    mine = correct_answer(*round.mine, round.operation)
    robo = correct_answer(*round.robo, round.operation)
    return "mine" if mine > robo else "robo" if robo > mine else "same"


def visible_state(round: Round) -> dict[str, Any]:
    """Both hands, Robo's total and the answer cards; the student's total and the winner show once picked."""
    return {
        "operation": round.operation,
        "level": round.level,
        "step": _step(round),
        "mine": list(round.mine),
        "robo": list(round.robo),
        "robo_total": correct_answer(*round.robo, round.operation),
        "choices": answer_choices(*round.mine, round.operation),
        "answer_pick": round.answer_pick,
        "my_total": correct_answer(*round.mine, round.operation) if round.answer_pick is not None else None,
        "winner_pick": round.winner_pick,
        "winner": correct_winner(round) if round.winner_pick is not None else None,
    }


def _require_step(round: Round, step: Step) -> None:
    if _step(round) != step:
        raise ValueError(f'This hand is not at the "{step}" step.')


def _answer(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "answer")
    pick = move.get("pick")
    choices = answer_choices(*round.mine, round.operation)
    if type(pick) is not int or pick not in choices:
        raise ValueError(f"pick must be one of {choices}")
    return MoveResult(
        correct=pick == correct_answer(*round.mine, round.operation),
        misconception=diagnose(*round.mine, round.operation, pick),
        round=round.model_copy(update={"answer_pick": pick}),
    )


def _winner(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "winner")
    pick = move.get("pick")
    if pick not in WINNERS:
        raise ValueError(f"pick must be one of {WINNERS}")
    return MoveResult(
        correct=pick == correct_winner(round),
        misconception=None,
        round=round.model_copy(update={"winner_pick": pick}),
        counted=False,
    )


_MOVES = {"answer": _answer, "winner": _winner}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Apply one student move to a copy of the round.

    Raises ValueError for an unknown move type or a move the round doesn't allow.
    """
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


def computer_move(round: Round, level: int) -> Round:
    """Robo's cards are dealt with the hand and its total is always right, so it has nothing to decide."""
    return round
