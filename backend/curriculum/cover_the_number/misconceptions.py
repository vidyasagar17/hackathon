"""Rule-based diagnosis for Cover the Number: the number the student taps for the dots they rolled.

One die or one card of scattered dots: counting one too many (a dot counted twice, two number words for one dot, a
word left out) or one too few (a dot skipped, a word said twice) — Kobayashi et al. (2025) with Fuson et al.'s (1988)
categories, where one too many was far more common. Two dice: Addition War's counting-on mistakes (Siegler & Shrager,
1984; Secada, Fuson & Hall, 1983; Fuson, 1984), then one too many.
"""

from typing import Literal

from ..card_war.misconceptions import MisconceptionName as TwoDiceMisconception
from ..card_war.misconceptions import diagnose as card_war_diagnose

CountingMisconception = Literal["counted_one_too_many", "counted_one_too_few"]

MisconceptionName = CountingMisconception | TwoDiceMisconception


def total(values: list[int]) -> int:
    return sum(values)


def diagnose_tap(values: list[int], tapped: int) -> MisconceptionName | None:
    """The mistake behind tapping `tapped` for the dots of one die, one dot card (one value) or two dice (two values)."""
    right = total(values)
    if tapped == right:
        return None
    if len(values) == 2:
        named = card_war_diagnose(values[0], values[1], "add", tapped)
        if named:
            return named
    if tapped == right + 1:
        return "counted_one_too_many"
    if tapped == right - 1 and len(values) == 1:
        return "counted_one_too_few"
    return None
