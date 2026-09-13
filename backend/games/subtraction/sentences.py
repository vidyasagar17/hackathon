from typing import Callable

from .misconceptions import MisconceptionName
from .problems import ColumnBreakdown, Problem


def _borrow_source(columns: list[ColumnBreakdown], index: int) -> str:
    """Say where a column borrows from, skipping a 0 to its left the way the procedure does."""
    left = columns[index - 1]
    if left.minuend_digit != 0:
        return f"borrow from the {left.place} column"
    return f"the {left.place} column has a 0, so borrow from the {columns[index - 2].place} column first"


def _smaller_from_larger(problem: Problem) -> str:
    """Point at the rightmost column whose top digit is smaller than its bottom digit."""
    columns = problem.columns
    index = max(i for i, c in enumerate(columns) if c.minuend_digit < c.subtrahend_digit)
    column = columns[index]
    return (
        f"In the {column.place} column, {column.minuend_digit} is smaller than "
        f"{column.subtrahend_digit}, so you can't subtract yet: {_borrow_source(columns, index)}."
    )


def _borrowed_without_decrementing(problem: Problem) -> str:
    """Show the lending column's digit going down by 1 for the rightmost borrow."""
    columns = problem.columns
    index = max(i for i, c in enumerate(columns) if c.borrows)
    left = columns[index - 1]
    if left.minuend_digit != 0:
        return (
            f"When the {columns[index].place} column borrows from the {left.place} column, "
            f"the {left.place} column goes down by 1: cross out the {left.minuend_digit} "
            f"and write {left.minuend_digit - 1}."
        )
    lender = columns[index - 2]
    return (
        "When you borrow, the column you borrow from goes down by 1. "
        f"The {left.place} column has a 0, so borrow from the {lender.place} column: "
        f"cross out the {lender.minuend_digit} and write {lender.minuend_digit - 1}."
    )


def _borrow_across_zero_failure(problem: Problem) -> str:
    """Walk through refilling a 0 in the tens column. Only diagnosed when the tens digit is 0."""
    hundreds = problem.columns[0].minuend_digit
    return (
        "The tens column has a 0, so it has nothing to lend. First borrow from the hundreds "
        f"column: the {hundreds} becomes {hundreds - 1} and the 0 becomes 10. "
        "Then the tens column lends to the ones column and becomes 9."
    )


def _always_borrow(problem: Problem) -> str:
    """Point at the rightmost column that does not need a borrow."""
    column = next(c for c in reversed(problem.columns) if not c.borrows)
    return (
        f"In the {column.place} column, {column.minuend_digit} is not smaller than "
        f"{column.subtrahend_digit}, so you don't need to borrow there."
    )


def _zero_minus_digit_gives_digit(problem: Problem) -> str:
    """Point at the rightmost column with a 0 on top and a non-zero digit below."""
    columns = problem.columns
    index = max(
        i for i, c in enumerate(columns) if c.minuend_digit == 0 and c.subtrahend_digit > 0
    )
    column = columns[index]
    return (
        f"In the {column.place} column, the top digit is 0, so don't just write the "
        f"{column.subtrahend_digit}: {_borrow_source(columns, index)}."
    )


_BUILDERS: dict[MisconceptionName, Callable[[Problem], str]] = {
    "smaller_from_larger": _smaller_from_larger,
    "borrowed_without_decrementing": _borrowed_without_decrementing,
    "borrow_across_zero_failure": _borrow_across_zero_failure,
    "always_borrow": _always_borrow,
    "zero_minus_digit_gives_digit": _zero_minus_digit_gives_digit,
}


def specific_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return a correct hint sentence for the diagnosed misconception, built from the student's digits.

    Sentences describe the step to take, never a column's result, so they don't reveal the answer.
    """
    return _BUILDERS[misconception](problem)
