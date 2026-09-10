from typing import Callable, Literal

from .problems import Problem

MisconceptionName = Literal[
    "added_instead_of_multiplied",
    "no_carry",
    "carry_always",
    "double_digit_write",
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


def _double_digit_write(problem: Problem) -> int:
    """Writes the full column product instead of carrying, e.g. 4x3=12 written as '12'."""
    t, o = _digits(problem.multiplicand)
    m = problem.multiplier
    return int(f"{t * m}{o * m}")


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
    "added_instead_of_multiplied": _added_instead_of_multiplied,
    "no_carry": _no_carry,
    "carry_always": _carry_always,
    "double_digit_write": _double_digit_write,
    "drops_final_carry": _drops_final_carry,
}


def diagnose(problem: Problem, submitted_answer: int) -> MisconceptionName | None:
    """Return the known buggy algorithm whose simulated answer matches what was submitted, if any."""
    for name, simulate in _SIMULATORS.items():
        if simulate(problem) == submitted_answer:
            return name
    return None
