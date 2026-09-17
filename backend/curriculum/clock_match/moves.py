"""Clock Match moves for the curriculum engine (contract in `curriculum/engine.py`).

The student's one move is picking a card (graded, one try): a time card for a clock to read, or a clock for a time to
set. Once they have picked, Robo plays its own card in `computer_move`; the page shows it on "Robo's turn".
"""

from typing import Any

from ..engine import MoveResult
from .misconceptions import clock_choices, clock_for, diagnose_read, diagnose_set, time_choices
from .rounds import Round


def choices(round: Round) -> list:
    return time_choices(round.time) if round.kind == "read" else clock_choices(round.time)


def right_choice(round: Round) -> int:
    right = round.time if round.kind == "read" else clock_for(round.time)
    return choices(round).index(right)


def visible_state(round: Round) -> dict[str, Any]:
    """The card (its clock for reading, its time for setting) and four choices; once picked, the pick, the right
    choice and Robo's card."""
    picked = round.pick is not None
    return {
        "level": round.level,
        "kind": round.kind,
        "time": list(round.time) if round.kind == "set" or picked else None,
        "clock": list(clock_for(round.time)) if round.kind == "read" else None,
        "choices": [list(choice) for choice in choices(round)],
        "pick": round.pick,
        "right": right_choice(round) if picked else None,
        "robo": {
            "kind": round.robo_kind,
            "time": list(round.robo_time),
            "clock": list(clock_for(round.robo_time)),
            "knows": round.robo_knows,
        }
        if round.robo_played
        else None,
    }


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Pick one of the four choices. Raises ValueError for another move, a second pick, or a bad choice."""
    if move.get("type") != "pick":
        raise ValueError('type must be "pick"')
    if round.pick is not None:
        raise ValueError("This card is already answered.")
    pick = move.get("choice")
    if type(pick) is not int or not 0 <= pick < len(choices(round)):
        raise ValueError("choice must be 0, 1, 2 or 3")
    chosen = tuple(choices(round)[pick])
    diagnose = diagnose_read if round.kind == "read" else diagnose_set
    return MoveResult(
        correct=pick == right_choice(round),
        misconception=diagnose(round.time, chosen),
        round=round.model_copy(update={"pick": pick}),
    )


def computer_move(round: Round, level: int) -> Round:
    """Robo plays its card once the student has picked; otherwise the round is unchanged."""
    if round.pick is None or round.robo_played:
        return round
    return round.model_copy(update={"robo_played": True})
