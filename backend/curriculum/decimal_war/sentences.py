"""Code-built Decimal War hint sentences from the round's own numbers.

Sentences use the "same number of digits" expert strategy (Steinle & Stacey, 2001): write both
numbers with equal digits so they count parts of the same size, then compare those counts.
Each side's number is its digits after "0." ("45" is 0.45).
"""

from typing import Callable

from .misconceptions import MisconceptionName

_PLACES = {1: "tenth", 2: "hundredth", 3: "thousandth"}


def _decimal(digits: str) -> str:
    return f"0.{digits}"


def _amount(digits: str, places: int) -> str:
    """How many parts of one size the digits count, e.g. ("045", 3) -> "45 thousandths"."""
    count = int(digits)
    return f"{count} {_PLACES[places]}{'' if count == 1 else 's'}"


def _same_number_of_digits(mine: str, robo: str) -> str:
    """For longer- and shorter-is-larger: pad both to equal digits, then compare the counts."""
    places = max(len(mine), len(robo))
    mine_padded, robo_padded = mine.ljust(places, "0"), robo.ljust(places, "0")
    intro = (
        f"Give both numbers the same number of digits: "
        f"{_decimal(mine_padded)} and {_decimal(robo_padded)}. "
    )
    if int(mine_padded) == int(robo_padded):
        return (
            intro + f"{_amount(mine_padded, places)} is the same as "
            f"{_amount(robo_padded, places)}, so they are the same size."
        )
    (larger, larger_padded), (_, smaller_padded) = sorted(
        [(mine, mine_padded), (robo, robo_padded)], key=lambda side: int(side[1]), reverse=True
    )
    return (
        intro + f"{_amount(larger_padded, places)} is more than "
        f"{_amount(smaller_padded, places)}, so {_decimal(larger)} is larger."
    )


def _same_length(mine: str, robo: str) -> str:
    """For reciprocal thinking: both numbers already count parts of the same size."""
    larger, smaller = sorted((mine, robo), key=int, reverse=True)
    places = len(larger)
    return (
        f"{_decimal(larger)} is {_amount(larger, places)} and {_decimal(smaller)} is "
        f"{_amount(smaller, places)}. {_amount(larger, places)} is more than "
        f"{_amount(smaller, places)}, so {_decimal(larger)} is larger."
    )


def _zero_after_the_point(mine: str, robo: str) -> str:
    """For ignores_zero: only diagnosed when one number is the other's digits after zeros."""
    zeroed, plain = (mine, robo) if len(mine) > len(robo) else (robo, mine)
    places = len(zeroed)
    return (
        f"The 0 after the point matters: {_decimal(zeroed)} is {_amount(zeroed, places)}, "
        f"but {_decimal(plain)} is {_amount(plain, len(plain))}, which is "
        f"{_amount(plain.ljust(places, '0'), places)}. So {_decimal(plain)} is larger."
    )


_BUILDERS: dict[MisconceptionName, Callable[[str, str], str]] = {
    "longer_is_larger": _same_number_of_digits,
    "shorter_is_larger": _same_number_of_digits,
    "reciprocal_thinking": _same_length,
    "ignores_zero": _zero_after_the_point,
}


def specific_hint(mine: str, robo: str, misconception: MisconceptionName) -> str:
    """Return a correct hint sentence for the diagnosed misconception, built from the round's numbers.

    Shown after the round is judged, so a sentence may name the larger number.
    """
    return _BUILDERS[misconception](mine, robo)
