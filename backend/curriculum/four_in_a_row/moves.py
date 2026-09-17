"""Four in a Row moves for the curriculum engine (contract in `curriculum/engine.py`).

A student turn is one graded tap: a space showing the sum of the dealt fact. A right tap covers it; a wrong tap covers
nothing. Then "Robo's turn" (not graded) lets `computer_move` deal Robo a fact, cover a space for it, and deal the
student's next fact. Four in a row wins at once; when no fact can be dealt, most spaces covered wins.
"""

from typing import Any

from ..engine import MoveResult
from .misconceptions import diagnose_tap
from .rounds import CELLS, Round, RoboTurn, deal_fact, line_for, robo_cell


def _over(round: Round) -> Round:
    return round.model_copy(update={"step": "over"})


def winner(round: Round) -> str:
    """The owner of a line of four, else whoever covered more spaces."""
    lined = line_for(round.owners)
    if lined:
        return lined[0]
    mine, robo = round.owners.count("mine"), round.owners.count("robo")
    return "mine" if mine > robo else "robo" if robo > mine else "same"


def _right_cells(round: Round) -> list[int] | None:
    """After a tap: the tapped space when it was right, else every open space showing the sum."""
    if round.tapped is None:
        return None
    total = sum(round.tapped_fact)
    if round.cells[round.tapped] == total and round.owners[round.tapped] == "mine":
        return [round.tapped]
    return [index for index, cell in enumerate(round.cells) if cell == total and round.owners[index] is None]


def visible_state(round: Round) -> dict[str, Any]:
    """The board and who covered what, the student's fact, their latest tap and its right spaces, Robo's latest
    turn, and at the end the winner and any line of four."""
    over = round.step == "over"
    lined = line_for(round.owners) if over else None
    return {
        "level": round.level,
        "cells": round.cells,
        "owners": round.owners,
        "step": round.step,
        "fact": list(round.fact) if round.fact else None,
        "tapped": round.tapped,
        "right_cells": _right_cells(round),
        "my_count": round.owners.count("mine"),
        "robo_count": round.owners.count("robo"),
        "robo_last": {"fact": list(round.robo_last.fact), "cell": round.robo_last.cell} if round.robo_last else None,
        "winner": winner(round) if over else None,
        "line": lined[1] if lined else None,
    }


def _tap(round: Round, move: dict[str, Any]) -> MoveResult:
    if round.step != "tap":
        raise ValueError("It isn't your turn to tap.")
    cell = move.get("cell")
    if type(cell) is not int or not 0 <= cell < CELLS or round.owners[cell] is not None:
        raise ValueError("cell must be an open space on the board")
    first, second = round.fact
    correct = round.cells[cell] == first + second
    owners = [*round.owners]
    if correct:
        owners[cell] = "mine"
    tapped = round.model_copy(
        update={"owners": owners, "tapped": cell, "tapped_fact": round.fact, "robo_last": None, "step": "pass"}
    )
    after = _over(tapped) if line_for(owners) else tapped
    return MoveResult(correct=correct, misconception=diagnose_tap(first, second, round.cells[cell]), round=after)


def _robo_turn(round: Round, move: dict[str, Any]) -> MoveResult:
    if round.step != "pass":
        raise ValueError("Tap a space before Robo's turn.")
    return MoveResult(correct=True, misconception=None, round=round.model_copy(update={"step": "robo"}), counted=False)


_MOVES = {"tap": _tap, "robo_turn": _robo_turn}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Tap a space (graded) or hand the turn to Robo (not graded). Raises ValueError for an unknown or out-of-turn
    move, or a space that isn't open."""
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


def computer_move(round: Round, level: int) -> Round:
    """On Robo's turn: deal Robo a fact, cover a space for it, then deal the student's next fact. The game ends on a
    line of four or when a fact can't be dealt. Otherwise the round is unchanged.

    Facts come from the game's own level, which built the board; `level` sets how well Robo plays.
    """
    if round.step != "robo":
        return round
    robo_fact = deal_fact(round.cells, round.owners, round.level, round.seed, round.deals)
    if robo_fact is None:
        return _over(round)
    cell = robo_cell(round.cells, round.owners, level, sum(robo_fact))
    owners = [*round.owners]
    owners[cell] = "robo"
    played = round.model_copy(
        update={
            "owners": owners,
            "robo_last": RoboTurn(fact=robo_fact, cell=cell),
            "tapped": None,
            "deals": round.deals + 2,
        }
    )
    if line_for(owners):
        return _over(played)
    next_fact = deal_fact(played.cells, owners, round.level, round.seed, round.deals + 1)
    if next_fact is None:
        return _over(played.model_copy(update={"fact": None}))
    return played.model_copy(update={"fact": next_fact, "step": "tap"})
