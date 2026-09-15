from typing import Callable, Literal

from .problems import Problem

MisconceptionName = Literal[
    "no_carry",
    "carry_always",
    "reversed_carry",
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


def _reversed_carry(problem: Problem) -> int:
    """Writes the tens digit of a column sum and carries its ones digit; the last column's sum is written in full.

    e.g. 456 + 278: 6+8=14 writes 1 carries 4, 5+7+4=16 writes 1 carries 6, 4+2+6=12 -> 1211.
    """
    ah, at, ao = _digits(problem.addend1)
    bh, bt, bo = _digits(problem.addend2)

    def column(a: int, b: int, carry_in: int) -> tuple[int, int]:
        total = a + b + carry_in
        if total >= 10:
            return total // 10, total % 10
        return total, 0

    digit_o, carry_o = column(ao, bo, 0)
    digit_t, carry_t = column(at, bt, carry_o)
    sum_h = ah + bh + carry_t
    return sum_h * 100 + digit_t * 10 + digit_o


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


def _no_carry_full_last_column(problem: Problem) -> int:
    """Never carries, but writes the hundreds column's whole sum, e.g. 956 + 873 -> 1729."""
    ah, at, ao = _digits(problem.addend1)
    bh, bt, bo = _digits(problem.addend2)
    return (ah + bh) * 100 + (at + bt) % 10 * 10 + (ao + bo) % 10


def _carry_always_full_last_column(problem: Problem) -> int:
    """Carries 1 into every column and writes the hundreds column's whole sum, e.g. 520 + 610 -> 1240."""
    ah, at, ao = _digits(problem.addend1)
    bh, bt, bo = _digits(problem.addend2)
    return (ah + bh + 1) * 100 + (at + bt + 1) % 10 * 10 + (ao + bo) % 10


_SIMULATORS: list[tuple[MisconceptionName, Callable[[Problem], int]]] = [
    ("drops_final_carry", _drops_final_carry),
    ("no_carry", _no_carry),
    ("no_carry", _no_carry_full_last_column),
    ("carry_always", _carry_always),
    ("carry_always", _carry_always_full_last_column),
    ("reversed_carry", _reversed_carry),
    ("carry_drops_at_second_column", _carry_drops_at_second_column),
]


def diagnose(problem: Problem, submitted_answer: int) -> MisconceptionName | None:
    """Return the known buggy algorithm whose simulated answer matches what was submitted, if any.

    A misconception may have more than one simulator, one per way a student writes it down.
    When several simulators match, the first in `_SIMULATORS` wins, so the most
    specific explanation is listed first: an answer that is the correct one minus
    its leading digit is `drops_final_carry`, even if a broader bug also matches.
    """
    for name, simulate in _SIMULATORS:
        if simulate(problem) == submitted_answer:
            return name
    return None
