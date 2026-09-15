"""Code-built For Keeps hint sentences from the hand's own two numbers, larger first.

Two-digit versions of the subtraction workshop's sentences. Every diagnosed mistake is about the
ones column: the tens column never needs a borrow, and whenever the ones borrow the tens digit is
at least 1, so borrowing never crosses a 0.
"""

from typing import Callable

from .misconceptions import MisconceptionName


def _ones(number: int) -> int:
    return number % 10


def _smaller_from_larger(larger: int, smaller: int) -> str:
    """Only diagnosed when the top ones digit is smaller than the bottom one."""
    return (
        f"In the ones column, {_ones(larger)} is smaller than {_ones(smaller)}, "
        "so you can't subtract yet: borrow from the tens column."
    )


def _borrowed_without_decrementing(larger: int, smaller: int) -> str:
    """Show the tens digit going down by 1 when the ones borrow."""
    tens = larger // 10
    return (
        "When the ones column borrows from the tens column, the tens column goes down by 1: "
        f"cross out the {tens} and write {tens - 1}."
    )


def _zero_minus_digit_gives_digit(larger: int, smaller: int) -> str:
    """Only diagnosed when the top ones digit is 0 and the bottom one isn't."""
    return (
        f"In the ones column, the top digit is 0, so don't just write the {_ones(smaller)}: "
        "borrow from the tens column."
    )


def _always_borrow(larger: int, smaller: int) -> str:
    """Only diagnosed when the ones column doesn't need a borrow."""
    return (
        f"In the ones column, {_ones(larger)} is not smaller than {_ones(smaller)}, "
        "so you don't need to borrow there."
    )


_BUILDERS: dict[MisconceptionName, Callable[[int, int], str]] = {
    "smaller_from_larger": _smaller_from_larger,
    "borrowed_without_decrementing": _borrowed_without_decrementing,
    "zero_minus_digit_gives_digit": _zero_minus_digit_gives_digit,
    "always_borrow": _always_borrow,
}


def specific_hint(larger: int, smaller: int, misconception: MisconceptionName) -> str:
    """Return a correct hint sentence for the diagnosed misconception, built from the hand's numbers.

    Sentences describe the step to take, never a column's result.
    """
    return _BUILDERS[misconception](larger, smaller)
