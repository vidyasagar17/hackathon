from typing import Callable

from .misconceptions import MisconceptionName
from .problems import Problem


def _tens_word(count: int) -> str:
    return "ten" if count == 1 else "tens"


def _subtracted_instead_of_divided(problem: Problem) -> str:
    """Restate what the division sign means with the student's numbers."""
    d, v = problem.dividend, problem.divisor
    return f"{d} ÷ {v} means sharing {d} into {v} equal groups, not taking {v} away from {d}."


def _multiplied_instead_of_divided(problem: Problem) -> str:
    """Restate what the division sign means with the student's numbers."""
    d, v = problem.dividend, problem.divisor
    return f"{d} ÷ {v} means sharing {d} into {v} equal groups, not {d} × {v}."


def _only_used_first_digit(problem: Problem) -> str:
    """Say to keep going past the tens, or to share the whole number when the tens digit is too small.

    The tens digit is smaller than the divisor exactly when the quotient has one digit.
    """
    tens, ones = divmod(problem.dividend, 10)
    v = problem.divisor
    if tens < v:
        return (
            f"{tens} is smaller than {v}, so you can't share the tens alone: "
            f"share all of {problem.dividend} at once."
        )
    return f"After you share the {tens} tens into {v} groups, bring down the {ones} ones and keep sharing."


def _no_regroup_in_division(problem: Problem) -> str:
    """Show the leftover tens joining the ones. Diagnosed only when sharing the tens leaves a leftover."""
    tens, ones = divmod(problem.dividend, 10)
    v = problem.divisor
    if tens < v:
        return (
            f"{tens} is smaller than {v}, so put the {tens} {_tens_word(tens)} with the {ones} ones "
            f"to make {problem.dividend}, then share {problem.dividend} into {v} groups."
        )
    leftover = tens % v
    return (
        f"Sharing {tens} tens into {v} groups leaves {leftover} {_tens_word(leftover)} left over. "
        f"Put the leftover with the {ones} ones to make {leftover * 10 + ones} before you share again."
    )


def _reversed_quotient_digits(problem: Problem) -> str:
    """Say which digit of the answer comes first, or that a one-digit answer has no tens digit."""
    tens = problem.dividend // 10
    v = problem.divisor
    if tens < v:
        return (
            f"{tens} {_tens_word(tens)} can't make a group of {v}, so your answer has no tens digit: "
            "write its only digit in the ones place."
        )
    return (
        f"The first digit of your answer comes from sharing the {tens} tens into {v} groups, "
        "so write that digit first."
    )


_BUILDERS: dict[MisconceptionName, Callable[[Problem], str]] = {
    "subtracted_instead_of_divided": _subtracted_instead_of_divided,
    "multiplied_instead_of_divided": _multiplied_instead_of_divided,
    "only_used_first_digit": _only_used_first_digit,
    "no_regroup_in_division": _no_regroup_in_division,
    "reversed_quotient_digits": _reversed_quotient_digits,
}


def specific_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return a correct hint sentence for the diagnosed misconception, built from the student's numbers.

    Sentences describe the step to take, never the quotient, so they don't reveal the answer.
    """
    return _BUILDERS[misconception](problem)
