from typing import Callable, Literal

from .problems import Problem

MisconceptionName = Literal[
    "no_carry",
    "carry_always",
    "double_digit_write",
    "carry_drops_at_second_column",
    "drops_final_carry",
]


def _digits(n: int) -> tuple[int, int, int]:
    hundreds, remainder = divmod(n, 100)
    tens, ones = divmod(remainder, 10)
    return hundreds, tens, ones


def _no_carry(problem: Problem) -> int:
    """Adds each column independently, never carrying into the next column."""
    ah, at, ao = _digits(problem.addend1)
    bh, bt, bo = _digits(problem.addend2)
    return (ah + bh) % 10 * 100 + (at + bt) % 10 * 10 + (ao + bo) % 10


def _carry_always(problem: Problem) -> int:
    """Carries 1 into every column, even ones that don't produce a carry."""
    ah, at, ao = _digits(problem.addend1)
    bh, bt, bo = _digits(problem.addend2)

    digit_o = (ao + bo) % 10
    digit_t = (at + bt + 1) % 10
    digit_h = (ah + bh + 1) % 10
    return digit_h * 100 + digit_t * 10 + digit_o


def _double_digit_write(problem: Problem) -> int:
    """Writes the full two-digit column sum instead of carrying, e.g. 6+8=14 written as '14'."""
    ah, at, ao = _digits(problem.addend1)
    bh, bt, bo = _digits(problem.addend2)
    return int(f"{ah + bh}{at + bt}{ao + bo}")


def _carry_drops_at_second_column(problem: Problem) -> int:
    """Carries correctly once, but fails to cascade a second consecutive carry further left."""
    ah, at, ao = _digits(problem.addend1)
    bh, bt, bo = _digits(problem.addend2)

    sum_o = ao + bo
    carry1 = 1 if sum_o >= 10 else 0
    digit_o = sum_o % 10

    sum_t = at + bt + carry1
    digit_t = sum_t % 10

    digit_h = (ah + bh) % 10
    return digit_h * 100 + digit_t * 10 + digit_o


def _drops_final_carry(problem: Problem) -> int:
    """Computes every column correctly but drops the leading digit when the total overflows to 4 digits."""
    ah, at, ao = _digits(problem.addend1)
    bh, bt, bo = _digits(problem.addend2)

    sum_o = ao + bo
    carry1, digit_o = divmod(sum_o, 10)

    sum_t = at + bt + carry1
    carry2, digit_t = divmod(sum_t, 10)

    sum_h = ah + bh + carry2
    _carry3, digit_h = divmod(sum_h, 10)

    return digit_h * 100 + digit_t * 10 + digit_o


_SIMULATORS: dict[MisconceptionName, Callable[[Problem], int]] = {
    "no_carry": _no_carry,
    "carry_always": _carry_always,
    "double_digit_write": _double_digit_write,
    "carry_drops_at_second_column": _carry_drops_at_second_column,
    "drops_final_carry": _drops_final_carry,
}


def diagnose(problem: Problem, submitted_answer: int) -> MisconceptionName | None:
    """Return the known buggy algorithm whose simulated answer matches what was submitted, if any."""
    for name, simulate in _SIMULATORS.items():
        if simulate(problem) == submitted_answer:
            return name
    return None
