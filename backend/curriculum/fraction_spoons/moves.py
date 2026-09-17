"""Fraction Spoons' moves for the curriculum engine (contract in `curriculum/engine.py`).

A student turn: pick or keep a Collecting card, draw, tap Fits / Doesn't fit, discard, then take the spoon or
hand the turn to Robo. Only the fit tap and the claim are graded. Robo plays in `computer_move` and is never
wrong. An empty pile is refilled from the trash with a generator seeded by the round, so the same saved round
always shuffles the same way.
"""

import random
from typing import Any

from ..engine import MoveResult
from .misconceptions import Card, diagnose_claim, diagnose_fit, same_value
from .rounds import HAND_SIZE, SPOONS_TO_WIN, GradedMove, Hand, Round, Step


def _require_step(round: Round, *steps: Step) -> None:
    if round.step not in steps:
        raise ValueError(f"This move isn't allowed at the \"{round.step}\" step.")


def _hand(round: Round) -> Hand:
    return round.hands[round.hand_number - 1]


def _replace_hand(round: Round, hand: Hand, **round_update: Any) -> Round:
    hands = list(round.hands)
    hands[round.hand_number - 1] = hand
    return round.model_copy(update={"hands": hands, **round_update})


def _card_position(move: dict[str, Any], count: int) -> int:
    position = move.get("card")
    if type(position) is not int or not 0 <= position < count:
        raise ValueError(f"card must be a card position from 0 to {count - 1}")
    return position


def _ungraded(round: Round) -> MoveResult:
    return MoveResult(correct=True, misconception=None, round=round, counted=False)


def _with_pile(hand: Hand, seed: int, hand_number: int) -> Hand:
    """The hand, or when its pile is empty, the trash shuffled into a new pile by a seeded generator."""
    if hand.pile:
        return hand
    pile = list(hand.trash)
    random.Random(f"{seed}:{hand_number}:{hand.reshuffles}").shuffle(pile)
    return hand.model_copy(update={"pile": pile, "trash": [], "reshuffles": hand.reshuffles + 1})


def _after_spoon(round: Round) -> Round:
    """Start the next hand, or end the game once a player has `SPOONS_TO_WIN` spoons."""
    if SPOONS_TO_WIN in (round.my_spoons, round.robo_spoons):
        return round.model_copy(update={"step": "over"})
    return round.model_copy(update={"hand_number": round.hand_number + 1, "step": "collect"})


def _collect(round: Round, move: dict[str, Any]) -> MoveResult:
    """Pick the Collecting card from the hand, only at the start of a turn; not graded."""
    _require_step(round, "collect", "draw")
    hand = _hand(round)
    collecting = hand.my_cards[_card_position(move, HAND_SIZE)]
    return _ungraded(_replace_hand(round, hand.model_copy(update={"collecting": collecting}), step="draw"))


def _draw(round: Round, move: dict[str, Any]) -> MoveResult:
    """Take the top card of the pile, refilling it from the trash when empty; opens a new claim; not graded."""
    _require_step(round, "draw")
    hand = _with_pile(_hand(round), round.seed, round.hand_number)
    drawn = hand.model_copy(update={"drawn": hand.pile[0], "pile": hand.pile[1:], "claim_tried": False})
    return _ungraded(_replace_hand(round, drawn, step="fit"))


def _fit(round: Round, move: dict[str, Any]) -> MoveResult:
    """Grade Fits / Doesn't fit for the drawn card against the Collecting card."""
    _require_step(round, "fit")
    fits = move.get("fits")
    if type(fits) is not bool:
        raise ValueError("fits must be true or false")
    hand = _hand(round)
    graded = GradedMove(kind="fit", collecting=hand.collecting, cards=[hand.drawn], said_fits=fits)
    return MoveResult(
        correct=fits == same_value(hand.collecting, hand.drawn),
        misconception=diagnose_fit(hand.collecting, hand.drawn, fits),
        round=_replace_hand(round, hand.model_copy(update={"last_graded": graded}), step="discard"),
    )


def _discard(round: Round, move: dict[str, Any]) -> MoveResult:
    """Put one of the four cards or the drawn card in the trash; not graded.

    The Collecting card stays only while a copy of it is still held.
    """
    _require_step(round, "discard")
    hand = _hand(round)
    cards = [*hand.my_cards, hand.drawn]
    discarded = cards.pop(_card_position(move, HAND_SIZE + 1))
    discarded_hand = hand.model_copy(
        update={
            "my_cards": cards,
            "drawn": None,
            "trash": [*hand.trash, discarded],
            "collecting": hand.collecting if hand.collecting in cards else None,
        }
    )
    return _ungraded(_replace_hand(round, discarded_hand, step="choose"))


def can_claim(round: Round) -> bool:
    """Take the spoon is open after discarding, with a Collecting card held and no claim yet this turn."""
    hand = _hand(round)
    return round.step == "choose" and hand.collecting is not None and not hand.claim_tried


def _claim(round: Round, move: dict[str, Any]) -> MoveResult:
    """Grade a claim that the four cards equal the Collecting card; a correct one wins the spoon."""
    _require_step(round, "choose")
    if not can_claim(round):
        raise ValueError("Taking the spoon needs a Collecting card and one try per turn.")
    hand = _hand(round)
    correct = all(same_value(hand.collecting, card) for card in hand.my_cards)
    graded = GradedMove(kind="claim", collecting=hand.collecting, cards=hand.my_cards)
    claimed = _replace_hand(round, hand.model_copy(update={"last_graded": graded, "claim_tried": True}))
    if correct:
        claimed = _after_spoon(claimed.model_copy(update={"my_spoons": round.my_spoons + 1}))
    return MoveResult(
        correct=correct,
        misconception=diagnose_claim(hand.collecting, hand.my_cards),
        round=claimed,
    )


def _robo_turn(round: Round, move: dict[str, Any]) -> MoveResult:
    """Hand the turn to Robo, which plays in `computer_move`; not graded."""
    _require_step(round, "choose")
    return _ungraded(round.model_copy(update={"step": "robo"}))


_MOVES = {
    "collect": _collect,
    "draw": _draw,
    "fit": _fit,
    "discard": _discard,
    "claim": _claim,
    "robo_turn": _robo_turn,
}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Apply one student move to a copy of the round; the set Robo last won with stops showing.

    Raises ValueError for an unknown move type or a move the round doesn't allow.
    """
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    result = apply(round, move)
    return result.model_copy(update={"round": result.round.model_copy(update={"robo_spoon_cards": None})})


def _is_mistake_card(card: Card, sets: list[Card]) -> bool:
    return not any(same_value(card, value) for value in sets)


def _robo_value(cards: list[Card]) -> Card:
    """The value Robo holds most of; a tie goes to its earliest card."""
    return max(cards, key=lambda card: sum(same_value(card, other) for other in cards))


def _robo_discard_position(cards: list[Card], sets: list[Card]) -> int:
    """Among Robo's four cards and the drawn one (last): a mistake card first, then the drawn card if it isn't
    Robo's value, then Robo's first card that isn't.
    """
    for position, card in enumerate(cards):
        if _is_mistake_card(card, sets):
            return position
    value = _robo_value(cards)
    drawn = len(cards) - 1
    if not same_value(cards[drawn], value):
        return drawn
    return next(position for position, card in enumerate(cards) if not same_value(card, value))


def computer_move(round: Round, level: int) -> Round:
    """Robo's turn, only once the student taps Robo's turn: draw, discard, and take the spoon with four equal cards.

    Robo keeps every card equal to the value it holds most of, so it never shows wrong fraction math; its
    level only set its starting hand (`rounds.py`). The student's next turn starts at draw while they hold a
    Collecting card, else at collect.
    """
    if round.step != "robo":
        return round
    hand = _with_pile(_hand(round), round.seed, round.hand_number)
    cards = [*hand.robo_cards, hand.pile[0]]
    discarded = cards.pop(_robo_discard_position(cards, hand.sets))
    played_hand = hand.model_copy(
        update={"robo_cards": cards, "pile": hand.pile[1:], "trash": [*hand.trash, discarded], "robo_discard": discarded}
    )
    played = _replace_hand(round, played_hand)
    if all(same_value(cards[0], card) for card in cards):
        return _after_spoon(played.model_copy(update={"robo_spoons": round.robo_spoons + 1, "robo_spoon_cards": cards}))
    return played.model_copy(update={"step": "draw" if hand.collecting is not None else "collect"})


def _shown(card: Card | None) -> dict[str, int] | None:
    return None if card is None else card.model_dump()


def visible_state(round: Round) -> dict[str, Any]:
    """The student's side of the current hand plus Robo's last discard, and the set Robo just won with.

    Never the pile, Robo's cards or the values in play.
    """
    hand = _hand(round)
    return {
        "level": round.level,
        "hand_number": round.hand_number,
        "step": round.step,
        "my_cards": [card.model_dump() for card in hand.my_cards],
        "collecting": _shown(hand.collecting),
        "drawn": _shown(hand.drawn),
        "trash_top": _shown(hand.trash[-1] if hand.trash else None),
        "pile_count": len(hand.pile),
        "my_spoons": round.my_spoons,
        "robo_spoons": round.robo_spoons,
        "can_claim": can_claim(round),
        "robo_discard": _shown(hand.robo_discard),
        "robo_spoon_cards": None if round.robo_spoon_cards is None else [card.model_dump() for card in round.robo_spoon_cards],
    }
