"""Shut the Box moves for the curriculum engine (contract in `curriculum/engine.py`).

A student turn: roll (not graded), pick how many dots in all from four answer cards (graded, one try), then
tap tiles and shut (graded, one try). A wrong shut still shuts a right way — the fewest, highest tiles — so
the student sees one. When no open tiles make the total, the student's box is done. Robo plays its turn in
`computer_move` after the student presses "Robo's turn"; it never adds or shuts wrongly.
"""

from typing import Any

from ..engine import MoveResult
from .misconceptions import (
    diagnose_shut,
    diagnose_total,
    fewest_highest,
    most_tiles,
    total_choices,
    ways_to_shut,
)
from .rounds import LEVELS, GradedMove, Round, RoboTurn, Step


def _require_step(round: Round, step: Step) -> None:
    if round.step != step:
        raise ValueError(f'This game is not at the "{step}" step.')


def _over(round: Round) -> bool:
    return not round.my_open or not round.robo_open or (round.my_done and round.robo_done)


def _after_student(round: Round) -> Round:
    """Hand the turn to Robo, or keep rolling when Robo's box is done, or end the game."""
    step: Step = "over" if _over(round) else "roll" if round.robo_done else "pass"
    return round.model_copy(update={"step": step})


def winner(round: Round) -> str:
    """Fewest open tiles wins."""
    mine, robo = len(round.my_open), len(round.robo_open)
    return "mine" if mine < robo else "robo" if robo < mine else "same"


def visible_state(round: Round) -> dict[str, Any]:
    """Both boxes, the student's roll and answer cards; the total once picked; Robo's latest turn; the winner at the end."""
    faces, tiles = LEVELS[round.level]
    total = sum(round.my_dice) if round.my_dice else None
    picked = round.total_pick is not None
    return {
        "level": round.level,
        "faces": faces,
        "tiles": tiles,
        "step": round.step,
        "my_open": round.my_open,
        "robo_open": round.robo_open,
        "my_dice": list(round.my_dice) if round.my_dice else None,
        "choices": total_choices(round.my_dice) if round.my_dice else None,
        "total_pick": round.total_pick,
        "my_total": total if picked else None,
        "can_shut": bool(ways_to_shut(round.my_open, total)) if picked and round.picked_tiles is None else None,
        "picked_tiles": round.picked_tiles,
        "shut_tiles": round.shut_tiles,
        "my_done": round.my_done,
        "robo_done": round.robo_done,
        "robo_last": round.robo_last.model_dump() if round.robo_last else None,
        "winner": winner(round) if round.step == "over" else None,
    }


def _roll(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "roll")
    rolled = round.model_copy(
        update={
            "step": "total",
            "my_dice": round.my_rolls[round.my_turns],
            "total_pick": None,
            "picked_tiles": None,
            "shut_tiles": None,
        }
    )
    return MoveResult(correct=True, misconception=None, round=rolled, counted=False)


def _total(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "total")
    pick = move.get("pick")
    choices = total_choices(round.my_dice)
    if type(pick) is not int or pick not in choices:
        raise ValueError(f"pick must be one of {choices}")
    total = sum(round.my_dice)
    graded = GradedMove(kind="total", dice=round.my_dice, total=total)
    picked = round.model_copy(update={"total_pick": pick, "last_graded": graded})
    if ways_to_shut(round.my_open, total):
        after = picked.model_copy(update={"step": "shut"})
    else:
        after = _after_student(picked.model_copy(update={"my_done": True}))
    return MoveResult(correct=pick == total, misconception=diagnose_total(round.my_dice, pick), round=after)


def _shut(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "shut")
    tiles = move.get("tiles")
    if (
        type(tiles) is not list
        or not tiles
        or any(type(tile) is not int or tile not in round.my_open for tile in tiles)
        or len(set(tiles)) != len(tiles)
    ):
        raise ValueError("tiles must be different open tiles")
    total = sum(round.my_dice)
    correct = sum(tiles) == total
    shut = sorted(tiles) if correct else list(fewest_highest(ways_to_shut(round.my_open, total)))
    after = round.model_copy(
        update={
            "my_open": [tile for tile in round.my_open if tile not in shut],
            "my_turns": round.my_turns + 1,
            "picked_tiles": sorted(tiles),
            "shut_tiles": shut,
            "last_graded": GradedMove(kind="shut", dice=round.my_dice, total=total, tiles=sorted(tiles)),
        }
    )
    return MoveResult(correct=correct, misconception=diagnose_shut(total, tiles), round=_after_student(after))


def _robo_turn(round: Round, move: dict[str, Any]) -> MoveResult:
    """Hand the turn to Robo, which plays in `computer_move`; not graded."""
    _require_step(round, "pass")
    return MoveResult(correct=True, misconception=None, round=round.model_copy(update={"step": "robo"}), counted=False)


_MOVES = {"roll": _roll, "total": _total, "shut": _shut, "robo_turn": _robo_turn}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Apply one student move. Raises ValueError for an unknown move, the wrong step, or a bad pick."""
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


def computer_move(round: Round, level: int) -> Round:
    """Robo rolls and shuts tiles once the student has handed it the turn; otherwise the round is unchanged.

    Level 1 Robo shuts the most tiles it can (weaker); levels 2-3 the fewest, highest tiles (stronger).
    """
    if round.step != "robo":
        return round
    dice = round.robo_rolls[round.robo_turns]
    ways = ways_to_shut(round.robo_open, sum(dice))
    if not ways:
        played = round.model_copy(update={"robo_done": True, "robo_last": RoboTurn(dice=dice, shut=None)})
    else:
        shut = list(most_tiles(ways) if level == 1 else fewest_highest(ways))
        played = round.model_copy(
            update={
                "robo_open": [tile for tile in round.robo_open if tile not in shut],
                "robo_turns": round.robo_turns + 1,
                "robo_last": RoboTurn(dice=dice, shut=shut),
            }
        )
    step: Step = "over" if _over(played) else "pass" if played.my_done else "roll"
    return played.model_copy(update={"step": step})
