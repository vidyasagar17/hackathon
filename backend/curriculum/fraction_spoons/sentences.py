"""Code-built Fraction Spoons hint sentences from the student's own cards.

Every size relation is said with bigger, smaller or same, which `games/hint_check.keeps_facts` protects,
never "not equal" or "different", which it doesn't: a rewording could flip those and still pass.
Same difference is explained by how far each fraction is short of a whole, since a shared bottom can be
far too big to show (up to 3,300 at level 3). No sentence shows a bottom over `MAX_MISTAKE_BOTTOM`.
"""

from math import gcd
from typing import Callable

from .misconceptions import Card, MisconceptionName, diagnose_fit
from .rounds import MAX_MISTAKE_BOTTOM, GradedMove


def _text(card: Card) -> str:
    return f"{card.top}/{card.bottom}"


def _same_difference(collecting: Card, card: Card) -> str:
    """Both are short of 1 by the same top; the bigger bottom is the smaller piece, so that fraction is bigger."""
    gap = collecting.bottom - collecting.top
    collecting_short = Card(top=gap, bottom=collecting.bottom)
    card_short = Card(top=gap, bottom=card.bottom)
    card_bigger = card.bottom > collecting.bottom
    return (
        f"{_text(collecting)} is {_text(collecting_short)} short of 1, and {_text(card)} is {_text(card_short)} short of 1. "
        f"{_text(card_short)} is {'smaller' if card_bigger else 'bigger'} than {_text(collecting_short)}, "
        f"so {_text(card)} is {'bigger' if card_bigger else 'smaller'} than {_text(collecting)}."
    )


def _changed_only_top_or_bottom(collecting: Card, card: Card) -> str:
    """Multiplying only the top makes the fraction bigger; only the bottom makes it smaller.

    The example equal fraction is left out when its bottom would pass `MAX_MISTAKE_BOTTOM` (50/100 = 100/200).
    """
    only_top = card.bottom == collecting.bottom
    times = card.top // collecting.top if only_top else card.bottom // collecting.bottom
    equal = Card(top=collecting.top * times, bottom=collecting.bottom * times)
    example = f": {_text(collecting)} = {_text(equal)}" if equal.bottom <= MAX_MISTAKE_BOTTOM else ""
    return (
        f"Equal fractions have the top and the bottom × the same number{example}. "
        f"{_text(card)} has only the {'top' if only_top else 'bottom'} × {times}, "
        f"so {_text(card)} is {'bigger' if only_top else 'smaller'} than {_text(collecting)}."
    )


def _bigger_numbers_not_equal(collecting: Card, card: Card) -> str:
    """Show one card as the other with top and bottom multiplied, or both as their simplest fraction."""
    divisor = gcd(collecting.top, collecting.bottom)
    simplest = Card(top=collecting.top // divisor, bottom=collecting.bottom // divisor)
    collecting_times = collecting.bottom // simplest.bottom
    card_times = card.bottom // simplest.bottom
    if collecting_times == 1:
        return (
            f"{_text(card)} is {_text(collecting)} with the top and the bottom × {card_times}, "
            f"so {_text(card)} and {_text(collecting)} are the same size."
        )
    if card_times == 1:
        return (
            f"{_text(collecting)} is {_text(card)} with the top and the bottom × {collecting_times}, "
            f"so {_text(card)} and {_text(collecting)} are the same size."
        )
    return (
        f"{_text(collecting)} and {_text(card)} are both {_text(simplest)} with the top and the bottom "
        f"× {collecting_times} and × {card_times}, so they are the same size."
    )


_BUILDERS: dict[MisconceptionName, Callable[[Card, Card], str]] = {
    "same_difference_means_equal": _same_difference,
    "changed_only_top_or_bottom": _changed_only_top_or_bottom,
    "bigger_numbers_not_equal": _bigger_numbers_not_equal,
}


def claim_card(claim: GradedMove, misconception: MisconceptionName) -> Card:
    """The first claimed card that doesn't match the Collecting card and shows the named mistake."""
    return next(card for card in claim.cards if diagnose_fit(claim.collecting, card, said_fits=True) == misconception)


def hint_card(move: GradedMove, misconception: MisconceptionName) -> Card:
    """The card the hint compares with the Collecting card: the tapped card, or the claimed card with the mistake."""
    return move.cards[0] if move.kind == "fit" else claim_card(move, misconception)


def specific_hint(move: GradedMove, misconception: MisconceptionName) -> str:
    """Return a correct hint sentence for the diagnosed mistake, built from the graded move's own cards."""
    return _BUILDERS[misconception](move.collecting, hint_card(move, misconception))
