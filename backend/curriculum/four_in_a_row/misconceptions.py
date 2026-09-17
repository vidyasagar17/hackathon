"""Rule-based diagnosis for Four in a Row: the number the student taps on the board for an addition fact.

A teen sum tapped with its digits the other way round (41 for 14) follows the English teen word, which says the ones
first (Clayton et al., 2020; Steiner et al., 2021). The counting mistakes are Addition War's (Siegler & Shrager, 1984;
Secada, Fuson & Hall, 1983; Fuson, 1984), with the fact's two cards as the cards.
"""

from typing import Literal

from ..card_war.misconceptions import MisconceptionName as CountingMisconception
from ..card_war.misconceptions import diagnose as card_war_diagnose

MisconceptionName = Literal["reversed_teen_digits"] | CountingMisconception


def reversed_teen(total: int) -> int | None:
    """12-19 with the digits the other way round (14 -> 41); None for other totals and for 11."""
    return total % 10 * 10 + 1 if 12 <= total <= 19 else None


def diagnose_tap(first: int, second: int, tapped: int) -> MisconceptionName | None:
    """The mistake behind tapping `tapped` for first + second, or None when it is the sum or no mistake gives it."""
    if tapped == first + second:
        return None
    if tapped == reversed_teen(first + second):
        return "reversed_teen_digits"
    return card_war_diagnose(first, second, "add", tapped)


def mistake_numbers(first: int, second: int) -> set[int]:
    """Every number a researched mistake gives for first + second, never the sum itself."""
    return {number for number in range(0, 100) if diagnose_tap(first, second, number)}
