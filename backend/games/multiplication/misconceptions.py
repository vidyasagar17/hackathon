from typing import Callable, Literal

from .problems import Problem

MisconceptionName = Literal[
    "added_instead_of_multiplied",
    "no_carry",
    "carry_always",
    "added_carry_before_multiplying",
    "drops_final_carry",
]


def _digits(n: int) -> tuple[int, int]:
    tens, ones = divmod(n, 10)
    return tens, ones


def _added_instead_of_multiplied(problem: Problem) -> int:
    """Adds the two numbers instead of multiplying them."""
    return problem.multiplicand + problem.multiplier


def _no_carry(problem: Problem) -> int:
    """Multiplies each digit by the multiplier independently, never carrying into the next column."""
    t, o = _digits(problem.multiplicand)
    m = problem.multiplier
    return (t * m) % 10 * 10 + (o * m) % 10


def _carry_always(problem: Problem) -> int:
    """Carries 1 into the tens column even when the ones column didn't produce one."""
    t, o = _digits(problem.multiplicand)
    m = problem.multiplier
    digit_o = (o * m) % 10
    digit_t = (t * m + 1) % 10
    return digit_t * 10 + digit_o


def _added_carry_before_multiplying(problem: Problem) -> int:
    """Adds the carried digit to the tens digit before multiplying, so the carry gets multiplied too.

    e.g. 47 x 6: 7x6=42 writes 2 carries 4, then (4+4)x6=48 -> 482.
    """
    t, o = _digits(problem.multiplicand)
    m = problem.multiplier
    carry, digit_o = divmod(o * m, 10)
    return (t + carry) * m * 10 + digit_o


def _drops_final_carry(problem: Problem) -> int:
    """Computes every column correctly but drops the leading digit when the product needs a third digit."""
    t, o = _digits(problem.multiplicand)
    m = problem.multiplier

    product_o = o * m
    carry1, digit_o = divmod(product_o, 10)

    product_t = t * m + carry1
    _carry2, digit_t = divmod(product_t, 10)

    return digit_t * 10 + digit_o


_SIMULATORS: dict[MisconceptionName, Callable[[Problem], int]] = {
    "drops_final_carry": _drops_final_carry,
    "added_instead_of_multiplied": _added_instead_of_multiplied,
    "no_carry": _no_carry,
    "carry_always": _carry_always,
    "added_carry_before_multiplying": _added_carry_before_multiplying,
}


def diagnose(problem: Problem, submitted_answer: int) -> MisconceptionName | None:
    """Return the known buggy algorithm whose simulated answer matches what was submitted, if any.

    When several simulators match, the first in `_SIMULATORS` wins, so the most
    specific explanation is listed first: an answer that is the correct one minus
    its leading digit is `drops_final_carry`, even if a broader bug also matches.
    """
    for name, simulate in _SIMULATORS.items():
        if simulate(problem) == submitted_answer:
            return name
    return None
