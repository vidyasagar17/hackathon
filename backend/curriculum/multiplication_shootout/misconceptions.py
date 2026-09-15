"""Rule-based diagnosis of a wrong Multiplication Shootout answer to a single-digit fact.

Rules follow the fact-error research: operand-related, operation and zero errors
(LeFevre et al., 1996; Campbell, 1995) and division solved through the neighboring
multiplication fact (Campbell, 1997). Factors are 0-9; division facts never divide by 0.
"""

from typing import Callable, Literal

MisconceptionName = Literal[
    "zero_gives_other_operand",
    "added_instead_of_multiplied",
    "operand_related",
    "quotient_off_by_one",
]


def _zero_gives_other_operand(a: int, b: int, answer: int) -> bool:
    """Answers n for n x 0 or 0 x n, applying adding's zero rule."""
    return 0 in (a, b) and answer == a + b


def _added_instead_of_multiplied(a: int, b: int, answer: int) -> bool:
    """Answers a + b."""
    return answer == a + b


def _operand_related(a: int, b: int, answer: int) -> bool:
    """Answers the fact one step away in either operand: a x (b +/- 1) or (a +/- 1) x b."""
    return answer in (a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b)


_PRODUCT_RULES: list[tuple[MisconceptionName, Callable[[int, int, int], bool]]] = [
    ("zero_gives_other_operand", _zero_gives_other_operand),
    ("added_instead_of_multiplied", _added_instead_of_multiplied),
    ("operand_related", _operand_related),
]


def diagnose_product(a: int, b: int, answer: int) -> MisconceptionName | None:
    """Return the fact error that explains an answer to a x b, or None when correct or unrecognized.

    When several match, the first in `_PRODUCT_RULES` wins: 0 x 7 -> 7 is `zero_gives_other_operand`,
    and 1 x 7 -> 8 and 3 x 3 -> 6 are `added_instead_of_multiplied` (on small facts most errors
    are addition intrusions, LeFevre et al., 1996).
    """
    if answer == a * b:
        return None
    for name, matches in _PRODUCT_RULES:
        if matches(a, b, answer):
            return name
    return None


def diagnose_quotient(dividend: int, divisor: int, answer: int) -> MisconceptionName | None:
    """Return `quotient_off_by_one` when the answer is the quotient +/- 1, else None.

    56 / 8 -> 6 or 8 recalls 8 x 6 or 8 x 8 instead of 8 x 7.
    """
    if abs(answer - dividend // divisor) == 1:
        return "quotient_off_by_one"
    return None
