"""Cover the Number moves for the curriculum engine (contract in `curriculum/engine.py`).

A student turn: roll (not graded), then tap the number of dots on your board (graded, one try). A right tap covers an
open number; a right tap on a covered number lets you roll again once; a wrong tap covers nothing. "Robo's turn" (not
graded) lets `computer_move` roll for Robo, which always counts right and rolls again 0-2 times by level when its
number is covered. Covering the whole board wins at once; after 10 turns each, more numbers covered wins.
"""

from typing import Any

from ..engine import MoveResult
from .misconceptions import diagnose_tap, total
from .rounds import BOARDS, ROBO_ROLLS_AGAIN, STUDENT_ROLLS_AGAIN, TURNS, RoboTurn, Round, Step


def _require_step(round: Round, step: Step) -> None:
    if round.step != step:
        raise ValueError(f'This game is not at the "{step}" step.')


def _full(round: Round, covered: list[int]) -> bool:
    return len(covered) == len(BOARDS[round.level])


def winner(round: Round) -> str:
    mine, robo = len(round.my_covered), len(round.robo_covered)
    return "mine" if mine > robo else "robo" if robo > mine else "same"


def visible_state(round: Round) -> dict[str, Any]:
    """Both boards, the turn, the student's roll, their tap, its result and the right number; Robo's latest turn;
    the winner at the end."""
    return {
        "level": round.level,
        "board": BOARDS[round.level],
        "turn": round.turn,
        "turns": TURNS,
        "step": round.step,
        "my_covered": round.my_covered,
        "robo_covered": round.robo_covered,
        "my_roll": round.my_roll.model_dump() if round.my_roll else None,
        "tapped": round.tapped,
        "result": round.tap_result,
        "right": total(round.tapped_roll.values) if round.tapped_roll else None,
        "robo_last": round.robo_last.model_dump() if round.robo_last else None,
        "winner": winner(round) if round.step == "over" else None,
    }


def _next_roll(round: Round, rolled_again: bool) -> Round:
    return round.model_copy(
        update={
            "step": "tap",
            "my_roll": round.my_rolls[round.my_next_roll],
            "my_next_roll": round.my_next_roll + 1,
            "rolled_again": rolled_again,
            "tapped": None,
            "tapped_roll": None,
            "tap_result": None,
        }
    )


def _roll(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "roll")
    rolled = _next_roll(round.model_copy(update={"robo_last": None}), False)
    return MoveResult(correct=True, misconception=None, round=rolled, counted=False)


def _roll_again(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "roll_again")
    return MoveResult(correct=True, misconception=None, round=_next_roll(round, True), counted=False)


def _tap(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "tap")
    number = move.get("number")
    if type(number) is not int or number not in BOARDS[round.level]:
        raise ValueError(f"number must be one of {BOARDS[round.level]}")
    right = total(round.my_roll.values)
    correct = number == right
    covered = [*round.my_covered, number] if correct and number not in round.my_covered else round.my_covered
    step: Step = "pass"
    if _full(round, covered):
        step = "over"
    elif correct and covered is round.my_covered and not round.rolled_again and STUDENT_ROLLS_AGAIN:
        step = "roll_again"
    result = "wrong" if not correct else "already" if covered is round.my_covered else "covered"
    tapped = round.model_copy(
        update={
            "my_covered": covered,
            "tapped": number,
            "tapped_roll": round.my_roll,
            "tap_result": result,
            "last_graded": (round.my_roll.values, number),
            "step": step,
        }
    )
    return MoveResult(correct=correct, misconception=diagnose_tap(round.my_roll.values, number), round=tapped)


def _robo_turn(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "pass")
    return MoveResult(correct=True, misconception=None, round=round.model_copy(update={"step": "robo"}), counted=False)


_MOVES = {"roll": _roll, "tap": _tap, "roll_again": _roll_again, "robo_turn": _robo_turn}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Apply one student move. Raises ValueError for an unknown move, the wrong step, or a number not on the board."""
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


def computer_move(round: Round, level: int) -> Round:
    """On Robo's turn: roll until a number is open or its rolls again run out, cover it, and end the turn."""
    if round.step != "robo":
        return round
    rolls, covered, next_roll = [], None, round.robo_next_roll
    for _ in range(1 + ROBO_ROLLS_AGAIN[level]):
        roll = round.robo_rolls[next_roll]
        next_roll += 1
        rolls.append(roll)
        if total(roll.values) not in round.robo_covered:
            covered = total(roll.values)
            break
    robo_covered = [*round.robo_covered, covered] if covered is not None else round.robo_covered
    over = _full(round, robo_covered) or round.turn == TURNS
    return round.model_copy(
        update={
            "robo_covered": robo_covered,
            "robo_next_roll": next_roll,
            "robo_last": RoboTurn(rolls=rolls, covered=covered),
            "step": "over" if over else "roll",
            "turn": round.turn if over else round.turn + 1,
        }
    )
