"""Target Number moves for the curriculum engine (contract in `curriculum/engine.py`).

The student starts a way with one card (not graded), then adds or takes away one card at a time, typing each new
total (graded, one try; the way goes on from the right total). Reaching the target makes the hand. "Start over" puts
the cards back and "Show me a way" gives up the point (neither graded). Once the hand is made or shown, Robo plays its
own cards in `computer_move`, and the equation question can be answered once (graded).
"""

from typing import Any

from ..engine import MoveResult
from .misconceptions import diagnose_equation, diagnose_step, equation_answer, step_total
from .rounds import TOPS, Round, Step, WayStep, find_way, robo_way

MAX_ANSWER = 999


def done(round: Round) -> bool:
    return round.made or round.shown_way


def _sign_text(sign: str) -> str:
    return "−" if sign == "-" else "+"


def way_text(cards: list[int], way: list[WayStep]) -> list[str]:
    """Each step of a way as its own equation: ["9 − 1 = 8", "8 + 8 = 16"]."""
    total, lines = cards[way[0][1]], []
    for sign, index in way[1:]:
        after = step_total(total, sign, cards[index])
        lines.append(f"{total} {_sign_text(sign)} {cards[index]} = {after}")
        total = after
    return lines


def _stuck(round: Round) -> bool:
    """A way is started, the target isn't made, and no card left makes a step that stays in range."""
    if not round.way or done(round):
        return False
    used = {index for _, index in round.way}
    return not any(
        0 <= step_total(round.total, sign, card) <= TOPS[round.level]
        for index, card in enumerate(round.cards)
        if index not in used
        for sign in ("+", "-")
    )


def visible_state(round: Round) -> dict[str, Any]:
    """The hand, the way so far with each graded step; once the hand is done, the shown way, Robo's turn and the
    equation question; the equation's value once answered."""
    current = round.steps[len(round.steps) - (len(round.way) - 1) :] if len(round.way) > 1 else []
    finished = done(round)
    return {
        "level": round.level,
        "top": TOPS[round.level],
        "cards": round.cards,
        "target": round.target,
        "way": [index for _, index in round.way],
        "total": round.total,
        "steps": [{**step.model_dump(), "after": step_total(step.before, step.sign, step.card)} for step in current],
        "stuck": _stuck(round),
        "made": round.made,
        "shown_way": way_text(round.cards, find_way(round.cards, round.target, TOPS[round.level])) if round.shown_way else None,
        "done": finished,
        "robo": {
            "cards": round.robo_cards,
            "way": way_text(round.robo_cards, round.robo_way) if round.robo_way else None,
        }
        if round.robo_played
        else None,
        "equation": round.equation.model_dump() if finished else None,
        "equation_answer": round.equation_answer,
        "equation_value": equation_answer(round.equation) if round.equation_answer is not None else None,
    }


def _whole(value: Any, low: int, high: int) -> bool:
    return type(value) is int and low <= value <= high


def _require_playing(round: Round) -> None:
    if done(round):
        raise ValueError("This hand is already done.")


def _card(round: Round, move: dict[str, Any]) -> int:
    index = move.get("card")
    if not _whole(index, 0, len(round.cards) - 1) or index in {used for _, used in round.way}:
        raise ValueError("card must be the place of a card not used yet")
    return index


def _start(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_playing(round)
    if round.way:
        raise ValueError("A way is already started; start over first.")
    index = _card(round, move)
    started = round.model_copy(update={"way": [(None, index)], "total": round.cards[index]})
    return MoveResult(correct=True, misconception=None, round=started, counted=False)


def _step(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_playing(round)
    if not round.way:
        raise ValueError("Start a way with a card first.")
    index, sign, answer = _card(round, move), move.get("sign"), move.get("answer")
    if sign not in ("+", "-"):
        raise ValueError('sign must be "+" or "-"')
    if not _whole(answer, 0, MAX_ANSWER):
        raise ValueError(f"answer must be a whole number from 0 to {MAX_ANSWER}")
    card = round.cards[index]
    right = step_total(round.total, sign, card)
    if not 0 <= right <= TOPS[round.level]:
        raise ValueError(f"The total must stay from 0 to {TOPS[round.level]}.")
    stepped = round.model_copy(
        update={
            "way": [*round.way, (sign, index)],
            "steps": [*round.steps, Step(before=round.total, sign=sign, card=card, answer=answer)],
            "total": right,
            "made": right == round.target,
            "last_graded": "step",
        }
    )
    return MoveResult(correct=answer == right, misconception=diagnose_step(round.total, sign, card, answer), round=stepped)


def _start_over(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_playing(round)
    return MoveResult(correct=True, misconception=None, round=round.model_copy(update={"way": [], "total": None}), counted=False)


def _show_way(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_playing(round)
    return MoveResult(correct=True, misconception=None, round=round.model_copy(update={"shown_way": True}), counted=False)


def _equation(round: Round, move: dict[str, Any]) -> MoveResult:
    if not done(round) or round.equation_answer is not None:
        raise ValueError("The equation comes once, after the hand.")
    answer = move.get("answer")
    if not _whole(answer, 0, MAX_ANSWER):
        raise ValueError(f"answer must be a whole number from 0 to {MAX_ANSWER}")
    return MoveResult(
        correct=answer == equation_answer(round.equation),
        misconception=diagnose_equation(round.equation, answer),
        round=round.model_copy(update={"equation_answer": answer, "last_graded": "equation"}),
    )


_MOVES = {"start": _start, "step": _step, "start_over": _start_over, "show_way": _show_way, "equation": _equation}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Apply one move. Raises ValueError for an unknown move, a move out of turn, or a bad card, sign or answer."""
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


def computer_move(round: Round, level: int) -> Round:
    """Robo plays its cards once the student's hand is done; otherwise the round is unchanged."""
    if not done(round) or round.robo_played:
        return round
    return round.model_copy(update={"robo_played": True, "robo_way": robo_way(round.robo_cards, round.target, level)})
