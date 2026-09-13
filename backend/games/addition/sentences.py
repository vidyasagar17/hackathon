from typing import Callable

from .misconceptions import MisconceptionName
from .problems import ColumnBreakdown, Problem

_LEFT_OF = {"ones": "tens", "tens": "hundreds"}


def _column_sum(columns: list[ColumnBreakdown], index: int) -> str:
    """Say what a column adds, including the 1 carried in from the column to its right."""
    column = columns[index]
    carried_in = index < len(columns) - 1 and columns[index + 1].carries
    extra = " plus the 1 you carried" if carried_in else ""
    return f"{column.addend1_digit} + {column.addend2_digit}{extra}"


def _no_carry(problem: Problem) -> str:
    """Point at the rightmost column that makes 10 or more. Diagnosed only when ones or tens carries."""
    columns = problem.columns
    index = max(i for i, c in enumerate(columns) if c.carries)
    place = columns[index].place
    return (
        f"In the {place} column, {_column_sum(columns, index)} makes 10 or more, so write only "
        f"the ones digit and carry 1 to the {_LEFT_OF[place]} column."
    )


def _carry_always(problem: Problem) -> str:
    """Point at the rightmost ones or tens column that makes less than 10."""
    columns = problem.columns
    index = max(i for i in (1, 2) if not columns[i].carries)
    place = columns[index].place
    return (
        f"In the {place} column, {_column_sum(columns, index)} is less than 10, so don't carry "
        f"anything to the {_LEFT_OF[place]} column."
    )


def _reversed_carry(problem: Problem) -> str:
    """Point at the rightmost carrying column. Diagnosed only when ones or tens carries."""
    columns = problem.columns
    index = max(i for i, c in enumerate(columns) if c.carries)
    place = columns[index].place
    return (
        f"In the {place} column, {_column_sum(columns, index)} makes a two-digit number: write its "
        f"ones digit in the {place} column and carry its tens digit to the {_LEFT_OF[place]} column."
    )


def _carry_drops_at_second_column(problem: Problem) -> str:
    """Point at the tens column's own carry. Diagnosed only when both ones and tens carry."""
    return (
        f"In the tens column, {_column_sum(problem.columns, 1)} makes 10 or more, so carry 1 "
        "into the hundreds column too."
    )


def _drops_final_carry(problem: Problem) -> str:
    """Point at the hundreds column overflowing. Diagnosed only when the hundreds column carries."""
    return (
        f"In the hundreds column, {_column_sum(problem.columns, 0)} makes 10 or more, so your "
        "answer needs a new thousands place at the front."
    )


_BUILDERS: dict[MisconceptionName, Callable[[Problem], str]] = {
    "no_carry": _no_carry,
    "carry_always": _carry_always,
    "reversed_carry": _reversed_carry,
    "carry_drops_at_second_column": _carry_drops_at_second_column,
    "drops_final_carry": _drops_final_carry,
}


def specific_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return a correct hint sentence for the diagnosed misconception, built from the student's digits.

    Sentences describe the step to take, never a column's result, so they don't reveal the answer.
    """
    return _BUILDERS[misconception](problem)
