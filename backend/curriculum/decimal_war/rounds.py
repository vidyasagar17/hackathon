"""Dealing Decimal War rounds: each level deals only the comparison types it diagnoses.

Numbers are the digits after "0." ("45" is 0.45), 1 to 3 digits a side.
"""

import random
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from .misconceptions import Pick

Comparison = Literal[
    "same_length",
    "shorter_larger",
    "longer_larger",
    "zero_trap",
    "equal_pair",
    "interspersed_zero",
]

COMPARISONS_BY_LEVEL: dict[int, list[Comparison]] = {
    1: ["same_length"],
    2: ["shorter_larger", "longer_larger"],
    3: ["zero_trap", "equal_pair", "interspersed_zero"],
}


class Round(BaseModel):
    level: int
    comparison: Comparison
    mine: str
    robo: str
    pick: Pick | None = None


def _nonzero_digits(length: int) -> str:
    return "".join(random.choice("123456789") for _ in range(length))


def _value(digits: str) -> Decimal:
    return Decimal(f"0.{digits}")


def _same_length() -> tuple[str, str]:
    """Two different numbers of equal length, e.g. 0.3 vs 0.4 (reveals reciprocal thinking)."""
    length = random.randint(1, 3)
    while True:
        first, second = _nonzero_digits(length), _nonzero_digits(length)
        if first != second:
            return first, second


def _different_lengths(shorter_is_larger: bool) -> tuple[str, str]:
    """A shorter and a longer number without zeros, e.g. 0.8 vs 0.45 or 0.85 vs 0.8."""
    while True:
        shorter_length = random.randint(1, 2)
        shorter = _nonzero_digits(shorter_length)
        longer = _nonzero_digits(random.randint(shorter_length + 1, 3))
        if (_value(shorter) > _value(longer)) == shorter_is_larger:
            return shorter, longer


def _zero_trap() -> tuple[str, str]:
    """A number and the same digits after zeros, e.g. 0.3 vs 0.03 (reveals ignores_zero)."""
    digits = _nonzero_digits(random.randint(1, 2))
    return digits, "0" * random.randint(1, 3 - len(digits)) + digits


def _equal_pair() -> tuple[str, str]:
    """Equal values written with trailing zeros, e.g. 0.4 vs 0.40 (the answer is "same")."""
    digits = _nonzero_digits(random.randint(1, 2))
    return digits, digits + "0" * random.randint(1, 3 - len(digits))


def _interspersed_zero() -> tuple[str, str]:
    """Two digits and the same digits with a zero between, e.g. 0.45 vs 0.405."""
    digits = _nonzero_digits(2)
    return digits, digits[0] + "0" + digits[1]


_DEALERS = {
    "same_length": _same_length,
    "shorter_larger": lambda: _different_lengths(shorter_is_larger=True),
    "longer_larger": lambda: _different_lengths(shorter_is_larger=False),
    "zero_trap": _zero_trap,
    "equal_pair": _equal_pair,
    "interspersed_zero": _interspersed_zero,
}


def new_round(level: int) -> Round:
    """Deal a round at `level` (1-3): a comparison type with equal odds, random digits, random sides."""
    comparison = random.choice(COMPARISONS_BY_LEVEL[level])
    first, second = _DEALERS[comparison]()
    mine, robo = (first, second) if random.random() < 0.5 else (second, first)
    return Round(level=level, comparison=comparison, mine=mine, robo=robo)
