from typing import Callable, Literal

from problems import Problem

MisconceptionName = Literal[
    "smaller_from_larger",
    "borrowed_without_decrementing",
    "borrow_across_zero_failure",
    "always_borrow",
    "zero_minus_digit_gives_digit",
]


def _digits(n: int) -> tuple[int, int, int]:
    hundreds, remainder = divmod(n, 100)
    tens, ones = divmod(remainder, 10)
    return hundreds, tens, ones


def _smaller_from_larger(problem: Problem) -> int:
    """Subtracts the smaller digit from the larger one in every column, ignoring borrowing."""
    mh, mt, mo = _digits(problem.minuend)
    sh, st, so = _digits(problem.subtrahend)
    return abs(mh - sh) * 100 + abs(mt - st) * 10 + abs(mo - so)


def _borrowed_without_decrementing(problem: Problem) -> int:
    """Adds 10 when a column needs to borrow, but never reduces the column borrowed from."""

    def column(m: int, s: int) -> int:
        return m - s if m >= s else m + 10 - s

    mh, mt, mo = _digits(problem.minuend)
    sh, st, so = _digits(problem.subtrahend)
    return column(mh, sh) * 100 + column(mt, st) * 10 + column(mo, so)


def _borrow_across_zero_failure(problem: Problem) -> int:
    """When borrowing from a column that is 0, treats it as 9 without cascading to the next column."""
    mh, mt, mo = _digits(problem.minuend)
    sh, st, so = _digits(problem.subtrahend)

    if mo < so:
        digit_o = mo + 10 - so
        if mt == 0:
            lent_tens_digit = 9
        else:
            lent_tens_digit = mt - 1
    else:
        digit_o = mo - so
        lent_tens_digit = mt

    if lent_tens_digit < st:
        digit_t = lent_tens_digit + 10 - st
        hundreds_adjustment = 1
    else:
        digit_t = lent_tens_digit - st
        hundreds_adjustment = 0

    digit_h = mh - hundreds_adjustment - sh
    return digit_h * 100 + digit_t * 10 + digit_o


def _always_borrow(problem: Problem) -> int:
    """Borrows in every column, even ones that don't need it."""
    mh, mt, mo = _digits(problem.minuend)
    sh, st, so = _digits(problem.subtrahend)

    digit_o = (mo - so) % 10
    adjusted_mt = (mt - 1) % 10
    digit_t = (adjusted_mt - st) % 10
    adjusted_mh = (mh - 1) % 10
    digit_h = (adjusted_mh - sh) % 10
    return digit_h * 100 + digit_t * 10 + digit_o


def _zero_minus_digit_gives_digit(problem: Problem) -> int:
    """Writes the subtrahend digit itself when the minuend digit is 0, instead of borrowing."""
    mh, mt, mo = _digits(problem.minuend)
    sh, st, so = _digits(problem.subtrahend)

    def column(m: int, s: int, borrow_in: int) -> tuple[int, int]:
        if m == 0 and s > 0:
            return s, 0
        adjusted = m - borrow_in
        if adjusted < s:
            return adjusted + 10 - s, 1
        return adjusted - s, 0

    digit_o, borrow_out_o = column(mo, so, 0)
    digit_t, borrow_out_t = column(mt, st, borrow_out_o)
    digit_h, _ = column(mh, sh, borrow_out_t)
    return digit_h * 100 + digit_t * 10 + digit_o


_SIMULATORS: dict[MisconceptionName, Callable[[Problem], int]] = {
    "smaller_from_larger": _smaller_from_larger,
    "borrowed_without_decrementing": _borrowed_without_decrementing,
    "borrow_across_zero_failure": _borrow_across_zero_failure,
    "always_borrow": _always_borrow,
    "zero_minus_digit_gives_digit": _zero_minus_digit_gives_digit,
}


def diagnose(problem: Problem, submitted_answer: int) -> MisconceptionName | None:
    """Return the known buggy algorithm whose simulated answer matches what was submitted, if any."""
    for name, simulate in _SIMULATORS.items():
        if simulate(problem) == submitted_answer:
            return name
    return None
