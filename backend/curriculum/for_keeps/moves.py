"""For Keeps' move functions for the curriculum engine (contract in `curriculum/engine.py`).

A hand is played in three moves: arrange the four cards, type the difference, keep or trash it.
After the last hand's keep or trash the step is "over".
"""

from itertools import permutations
from typing import Any

from ..engine import MoveResult
from .misconceptions import diagnose
from .rounds import CARDS_PER_HAND, HANDS, KEEPS, Hand, Round, Step


def _numbers(cards: tuple[int, ...] | list[int]) -> tuple[int, int]:
    """Cards in tens-ones-tens-ones order as two numbers, larger first."""
    first, second = cards[0] * 10 + cards[1], cards[2] * 10 + cards[3]
    return max(first, second), min(first, second)


def _arranged_numbers(cards: Any, dealt: list[int]) -> tuple[int, int]:
    """The student's arrangement as two numbers, larger first.

    Raises ValueError unless `cards` uses exactly the dealt cards.
    """
    if not isinstance(cards, list) or not all(type(card) is int for card in cards):
        raise ValueError("cards must be a list of digits")
    if len(cards) != CARDS_PER_HAND or sorted(cards) != sorted(dealt):
        raise ValueError("cards must use exactly the four cards dealt")
    return _numbers(cards)


def _require_step(round: Round, step: Step) -> None:
    if round.step != step:
        raise ValueError(f'This hand is not at the "{step}" step.')


def _update_hand(round: Round, hand_update: dict[str, Any], round_update: dict[str, Any]) -> Round:
    """A copy of the round with the current hand and the round's own fields updated."""
    index = round.hand_number - 1
    hands = list(round.hands)
    hands[index] = hands[index].model_copy(update=hand_update)
    return round.model_copy(update={"hands": hands, **round_update})


def _keep_choices(kept: int, hand_number: int) -> list[bool]:
    """A player keeps exactly two of the four differences.

    Keeping is forced when trashing would leave too few hands for two keeps; trashing is forced
    once two are kept.
    """
    hands_left = HANDS - hand_number + 1
    if kept >= KEEPS:
        return [False]
    if kept + hands_left <= KEEPS:
        return [True]
    return [True, False]


def allowed_keep_choices(round: Round) -> list[bool]:
    """The student's keep choices open on the current hand."""
    return _keep_choices(sum(1 for hand in round.hands if hand.my_kept), round.hand_number)


def keep_reason(round: Round) -> str | None:
    """Why only one keep choice is open on the current hand, or None when both are."""
    choices = allowed_keep_choices(round)
    if choices == [True]:
        return "You must keep this one."
    if choices == [False]:
        return "You have your two scores."
    return None


def _difference_of(numbers: tuple[int, int] | None) -> int | None:
    return None if numbers is None else numbers[0] - numbers[1]


def _visible_hand(hand: Hand) -> dict[str, Any]:
    """One dealt hand; Robo's arrangement and choice show only once the student has finished it."""
    finished = hand.my_kept is not None
    return {
        "my_cards": hand.my_cards,
        "robo_cards": hand.robo_cards,
        "my_numbers": None if hand.my_numbers is None else list(hand.my_numbers),
        "my_answer": hand.my_answer,
        "difference": _difference_of(hand.my_numbers) if hand.my_answer is not None else None,
        "my_kept": hand.my_kept,
        "robo_numbers": list(hand.robo_numbers) if finished and hand.robo_numbers else None,
        "robo_difference": _difference_of(hand.robo_numbers) if finished else None,
        "robo_kept": hand.robo_kept if finished else None,
    }


def visible_state(round: Round) -> dict[str, Any]:
    """The hands dealt so far, never later ones, with keep choices at the keep step and kept totals.

    Totals add the correct differences of kept hands, never the typed answers; Robo's count
    only from hands the student has finished.
    """
    at_keep = round.step == "keep"
    finished = [hand for hand in round.hands if hand.my_kept is not None]
    return {
        "level": round.level,
        "hand_number": round.hand_number,
        "step": round.step,
        "hands": [_visible_hand(hand) for hand in round.hands[: round.hand_number]],
        "keep_choices": allowed_keep_choices(round) if at_keep else None,
        "keep_reason": keep_reason(round) if at_keep else None,
        "my_total": sum(_difference_of(hand.my_numbers) for hand in finished if hand.my_kept),
        "robo_total": sum(_difference_of(hand.robo_numbers) for hand in finished if hand.robo_kept),
    }


def _arrange(round: Round, move: dict[str, Any]) -> MoveResult:
    """Build the current hand's two numbers; not graded, since arranging is strategy, not subtraction."""
    _require_step(round, "arrange")
    numbers = _arranged_numbers(move.get("cards"), round.hands[round.hand_number - 1].my_cards)
    return MoveResult(
        correct=True,
        misconception=None,
        round=_update_hand(round, {"my_numbers": numbers}, {"step": "difference"}),
        counted=False,
    )


def _difference(round: Round, move: dict[str, Any]) -> MoveResult:
    """Grade the typed difference of the current hand's numbers; one try, then on to keep or trash."""
    _require_step(round, "difference")
    answer = move.get("answer")
    if type(answer) is not int:
        raise ValueError("answer must be a whole number")
    larger, smaller = round.hands[round.hand_number - 1].my_numbers
    return MoveResult(
        correct=answer == larger - smaller,
        misconception=diagnose(larger, smaller, answer),
        round=_update_hand(round, {"my_answer": answer}, {"step": "keep"}),
    )


def _keep(round: Round, move: dict[str, Any]) -> MoveResult:
    """Keep or trash the current hand's difference, then start the next hand or end the game; not graded."""
    _require_step(round, "keep")
    keep = move.get("keep")
    if type(keep) is not bool:
        raise ValueError("keep must be true or false")
    if keep not in allowed_keep_choices(round):
        raise ValueError(keep_reason(round))
    next_hand = {"step": "over"} if round.hand_number == HANDS else {"hand_number": round.hand_number + 1, "step": "arrange"}
    return MoveResult(
        correct=True,
        misconception=None,
        round=_update_hand(round, {"my_kept": keep}, next_hand),
        counted=False,
    )


_MOVES = {"arrange": _arrange, "difference": _difference, "keep": _keep}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Apply one student move to a copy of the round.

    Raises ValueError for an unknown move type or a move the round doesn't allow.
    """
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


ROBO_KEEPS_UNDER = {1: 30, 2: 20, 3: 10}


def _robo_numbers(cards: list[int], level: int) -> tuple[int, int]:
    """Level 1 pairs the cards in the order dealt; levels 2-3 take the smallest difference.

    Ties go to the first arrangement in `permutations` order, so Robo is deterministic.
    """
    if level == 1:
        return _numbers(cards)
    return min((_numbers(order) for order in permutations(cards)), key=lambda pair: pair[0] - pair[1])


def computer_move(round: Round, level: int) -> Round:
    """Robo plays the current hand if it hasn't yet: arranges its cards, then keeps or trashes.

    It keeps a difference under its level's limit unless a keep or trash is forced. Robo's play
    is hidden from the student until they finish the hand (see `visible_state`).
    """
    index = round.hand_number - 1
    hand = round.hands[index]
    if hand.robo_numbers is not None:
        return round
    numbers = _robo_numbers(hand.robo_cards, level)
    choices = _keep_choices(sum(1 for earlier in round.hands[:index] if earlier.robo_kept), round.hand_number)
    wants_keep = numbers[0] - numbers[1] < ROBO_KEEPS_UNDER[level]
    keep = wants_keep if wants_keep in choices else choices[0]
    hands = list(round.hands)
    hands[index] = hand.model_copy(update={"robo_numbers": numbers, "robo_kept": keep})
    return round.model_copy(update={"hands": hands})
