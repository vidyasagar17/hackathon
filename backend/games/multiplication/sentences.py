from typing import Callable

from .misconceptions import MisconceptionName
from .problems import Problem


def _drops_final_carry(problem: Problem) -> str:
    """Point at the tens column needing a hundreds place. Diagnosed only for three-digit products."""
    tens, ones = problem.columns
    carried = f" plus the {ones.carry} you carried" if ones.carries else ""
    return (
        f"In the tens column, {tens.multiplicand_digit} × {problem.multiplier}{carried} makes "
        "10 or more, so your answer needs a hundreds place at the front."
    )


def _added_instead_of_multiplied(problem: Problem) -> str:
    """Restate what the multiplication sign means with the student's numbers."""
    a, m = problem.multiplicand, problem.multiplier
    return f"{a} × {m} means {m} groups of {a} added together, not {a} + {m}."


def _no_carry(problem: Problem) -> str:
    """Point at the ones column's carry. Diagnosed only when the ones column carries."""
    ones = problem.columns[1]
    return (
        f"In the ones column, {ones.multiplicand_digit} × {problem.multiplier} makes 10 or more, "
        f"so write only its ones digit and carry the {ones.carry} to the tens column."
    )


def _carry_always(problem: Problem) -> str:
    """Say whether the ones column carries at all, or carries more than 1.

    A carry of exactly 1 matches the correct answer, so when the ones column carries here,
    its carry is at least 2.
    """
    ones = problem.columns[1]
    product = f"{ones.multiplicand_digit} × {problem.multiplier}"
    if not ones.carries:
        return (
            f"In the ones column, {product} is less than 10, so don't carry anything "
            "to the tens column."
        )
    return (
        f"In the ones column, {product} makes 10 or more, so carry its tens digit, "
        f"{ones.carry}, to the tens column, not just 1."
    )


def _added_carry_before_multiplying(problem: Problem) -> str:
    """Put multiply-then-add in order. Diagnosed only when the ones column carries."""
    tens, ones = problem.columns
    return (
        f"In the tens column, multiply first: {tens.multiplicand_digit} × {problem.multiplier}. "
        f"Then add the {ones.carry} you carried, instead of adding it before you multiply."
    )


_BUILDERS: dict[MisconceptionName, Callable[[Problem], str]] = {
    "drops_final_carry": _drops_final_carry,
    "added_instead_of_multiplied": _added_instead_of_multiplied,
    "no_carry": _no_carry,
    "carry_always": _carry_always,
    "added_carry_before_multiplying": _added_carry_before_multiplying,
}


def specific_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return a correct hint sentence for the diagnosed misconception, built from the student's digits.

    Sentences describe the step to take, never a column's result, so they don't reveal the answer.
    """
    return _BUILDERS[misconception](problem)
