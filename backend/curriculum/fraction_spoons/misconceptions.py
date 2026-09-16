"""Rule-based diagnosis of Fraction Spoons moves: the fit tap on a drawn card, and a claim of four equal fractions.

A card keeps its face as written (2/4 is not 1/2), since the mistakes are about the face. Every move is
judged against the student's Collecting card. Research: same difference from Mitchell & Horne (2010) and
Clarke & Roche (2009); changing only the top or bottom from Biber, Tuna & Aktas (2013); bigger numbers
not equal from Braithwaite & Siegler (2018).
"""

from typing import Callable, Literal

from pydantic import BaseModel

MisconceptionName = Literal[
    "same_difference_means_equal",
    "changed_only_top_or_bottom",
    "bigger_numbers_not_equal",
]


class Card(BaseModel):
    """A fraction card as written: positive `top` and `bottom`."""

    top: int
    bottom: int


def same_value(first: Card, second: Card) -> bool:
    return first.top * second.bottom == second.top * first.bottom


def _same_difference(target: Card, card: Card) -> bool:
    """Gap thinking: top and bottom differ by the same amount, so both seem "one short" (1/2 and 2/3)."""
    return card.bottom - card.top == target.bottom - target.top


def _multiplied(part: int, target_part: int) -> bool:
    return part > target_part and part % target_part == 0


def _changed_only_top_or_bottom(target: Card, card: Card) -> bool:
    """Multiplies only the top or only the bottom of the Collecting card as written (1/2 -> 2/2 or 1/4)."""
    only_top = card.bottom == target.bottom and _multiplied(card.top, target.top)
    only_bottom = card.top == target.top and _multiplied(card.bottom, target.bottom)
    return only_top or only_bottom


_FIT_MISTAKES: list[tuple[MisconceptionName, Callable[[Card, Card], bool]]] = [
    ("same_difference_means_equal", _same_difference),
    ("changed_only_top_or_bottom", _changed_only_top_or_bottom),
]


def _mistake_behind_false_match(target: Card, card: Card) -> MisconceptionName | None:
    for name, shows in _FIT_MISTAKES:
        if shows(target, card):
            return name
    return None


def diagnose_fit(target: Card, card: Card, said_fits: bool) -> MisconceptionName | None:
    """Return the mistake behind a wrong Fits / Doesn't fit tap on `card` against the Collecting card `target`.

    None when the tap is correct or no known mistake gives it. Rejecting a true match is
    `bigger_numbers_not_equal` in either direction (4/8 against 1/2, or 1/2 against 4/8),
    except for a copy of `target`.
    """
    fits = same_value(target, card)
    if said_fits == fits:
        return None
    if fits:
        return None if card == target else "bigger_numbers_not_equal"
    return _mistake_behind_false_match(target, card)


def diagnose_claim(target: Card, hand: list[Card]) -> MisconceptionName | None:
    """Return the mistake behind a wrong claim that `hand` is four equal fractions, judged against `target`.

    Names the mistake most cards not equal to `target` show; on a tie the earlier one in `_FIT_MISTAKES`
    wins (same difference has the strongest evidence). None when the claim is correct or no odd card
    shows a known mistake.
    """
    shown = [
        name
        for card in hand
        if not same_value(target, card) and (name := _mistake_behind_false_match(target, card)) is not None
    ]
    if not shown:
        return None
    return max((name for name, _ in _FIT_MISTAKES), key=shown.count)
