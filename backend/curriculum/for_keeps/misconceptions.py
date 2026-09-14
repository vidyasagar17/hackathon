"""Rule-based diagnosis of a wrong For Keeps difference, from two-digit versions of the
subtraction workshop's buggy algorithms (Brown & Burton, 1978).

Numbers are 0-99 with the larger one first, as the game orders them before subtracting.
Borrow-across-zero isn't here: two-digit numbers have no hundreds place to borrow from.
"""

from typing import Callable, Literal

MisconceptionName = Literal[
    "zero_minus_digit_gives_digit",
    "smaller_from_larger",
    "borrowed_without_decrementing",
    "always_borrow",
]


def _zero_minus_digit_gives_digit(larger: int, smaller: int) -> int:
    """Writes the bottom ones digit when the top ones digit is 0, instead of borrowing."""
    top_tens, top_ones = divmod(larger, 10)
    bottom_tens, bottom_ones = divmod(smaller, 10)
    if top_ones == 0 and bottom_ones > 0:
        return (top_tens - bottom_tens) * 10 + bottom_ones
    return larger - smaller


def _smaller_from_larger(larger: int, smaller: int) -> int:
    """Subtracts the smaller digit from the larger one in each column, ignoring borrowing."""
    top_tens, top_ones = divmod(larger, 10)
    bottom_tens, bottom_ones = divmod(smaller, 10)
    return abs(top_tens - bottom_tens) * 10 + abs(top_ones - bottom_ones)


def _borrowed_without_decrementing(larger: int, smaller: int) -> int:
    """Adds 10 to the ones when they need it, but never takes 1 from the tens."""
    top_tens, top_ones = divmod(larger, 10)
    bottom_tens, bottom_ones = divmod(smaller, 10)
    ones = top_ones - bottom_ones if top_ones >= bottom_ones else top_ones + 10 - bottom_ones
    return (top_tens - bottom_tens) * 10 + ones


def _always_borrow(larger: int, smaller: int) -> int:
    """Borrows from the tens even when the ones don't need it."""
    top_tens, top_ones = divmod(larger, 10)
    bottom_tens, bottom_ones = divmod(smaller, 10)
    return (top_tens - 1 - bottom_tens) % 10 * 10 + (top_ones - bottom_ones) % 10


_SIMULATORS: list[tuple[MisconceptionName, Callable[[int, int], int]]] = [
    ("zero_minus_digit_gives_digit", _zero_minus_digit_gives_digit),
    ("smaller_from_larger", _smaller_from_larger),
    ("borrowed_without_decrementing", _borrowed_without_decrementing),
    ("always_borrow", _always_borrow),
]


def diagnose(larger: int, smaller: int, answer: int) -> MisconceptionName | None:
    """Return the buggy algorithm whose answer matches the student's, or None when correct or unrecognized.

    When several match, the first in `_SIMULATORS` wins, in the subtraction workshop's order:
    40 - 23 -> 23 is `zero_minus_digit_gives_digit`, and 73 - 58 -> 25 is `smaller_from_larger`.
    """
    if answer == larger - smaller:
        return None
    for name, simulate in _SIMULATORS:
        if simulate(larger, smaller) == answer:
            return name
    return None
