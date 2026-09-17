"""Volume Builder moves for the curriculum engine (contract in `curriculum/engine.py`).

A turn: count the cubes in the drawn box (graded, one try), then build a different box with the same number of
cubes (graded, one try). Once the student has built, Robo counts its own box by layers and builds another box in
`computer_move`; the page shows it only when the student presses "Robo's turn".
"""

from typing import Any

from ..engine import MoveResult
from .misconceptions import Box, diagnose_build, diagnose_count, layer_counts, same_box, volume
from .rounds import BUILD_EDGES, Round, robo_build

MAX_COUNT = 999


def step(round: Round) -> str:
    if round.count is None:
        return "count"
    return "build" if round.built is None else "done"


def _robo(round: Round) -> dict[str, Any] | None:
    """Robo's box counted by layers: cubes in the top layer, how many layers, and the box it built (or None)."""
    if not round.robo_played:
        return None
    return {
        "box": list(round.robo_box),
        "layer": layer_counts(round.robo_box)["top"],
        "layers": round.robo_box[2],
        "volume": volume(round.robo_box),
        "built": list(round.robo_built) if round.robo_built else None,
    }


def visible_state(round: Round) -> dict[str, Any]:
    """The student's box; its volume once counted; the built box and what it holds; Robo's turn once played."""
    counted = round.count is not None
    return {
        "level": round.level,
        "step": step(round),
        "box": list(round.box),
        "count": round.count,
        "volume": volume(round.box) if counted else None,
        "built": list(round.built) if round.built else None,
        "built_volume": volume(round.built) if round.built else None,
        "robo": _robo(round),
    }


def _whole(value: Any, low: int, high: int) -> bool:
    return type(value) is int and low <= value <= high


def _count(round: Round, move: dict[str, Any]) -> MoveResult:
    if step(round) != "count":
        raise ValueError("This box is already counted.")
    answer = move.get("answer")
    if not _whole(answer, 0, MAX_COUNT):
        raise ValueError(f"answer must be a whole number from 0 to {MAX_COUNT}")
    return MoveResult(
        correct=answer == volume(round.box),
        misconception=diagnose_count(round.box, answer),
        round=round.model_copy(update={"count": answer, "last_graded": "count"}),
    )


def _build(round: Round, move: dict[str, Any]) -> MoveResult:
    if step(round) != "build":
        raise ValueError("Count the box before building, and build once.")
    edges = move.get("box")
    if type(edges) is not list or len(edges) != 3 or not all(_whole(edge, BUILD_EDGES[0], BUILD_EDGES[-1]) for edge in edges):
        raise ValueError("box must be three whole-number edges from 1 to 10")
    built: Box = (edges[0], edges[1], edges[2])
    if same_box(built, round.box):
        raise ValueError("Build a different box, not the same one turned around.")
    target = volume(round.box)
    return MoveResult(
        correct=volume(built) == target,
        misconception=diagnose_build(target, built),
        round=round.model_copy(update={"built": built, "last_graded": "build"}),
    )


_MOVES = {"count": _count, "build": _build}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Count (graded) or build (graded). Raises ValueError for an unknown move, a move out of order, or a bad value."""
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


def computer_move(round: Round, level: int) -> Round:
    """Robo counts and builds once the student has built; otherwise the round is unchanged."""
    if step(round) != "done" or round.robo_played:
        return round
    return round.model_copy(update={"robo_played": True, "robo_built": robo_build(round.robo_box, level)})
