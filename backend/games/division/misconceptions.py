from typing import Callable, Literal

from .problems import Problem

MisconceptionName = Literal[
    "subtracted_instead_of_divided",
    "multiplied_instead_of_divided",
    "only_used_first_digit",
    "no_regroup_in_division",
    "reversed_quotient_digits",
]


def _subtracted_instead_of_divided(problem: Problem) -> int:
    """Subtracts the divisor from the dividend instead of dividing."""
    return problem.dividend - problem.divisor


def _multiplied_instead_of_divided(problem: Problem) -> int:
    """Multiplies the dividend by the divisor instead of dividing."""
    return problem.dividend * problem.divisor


def _only_used_first_digit(problem: Problem) -> int:
    """Divides only the tens digit by the divisor, ignoring the ones digit entirely."""
    tens_digit = problem.dividend // 10
    return tens_digit // problem.divisor


def _no_regroup_in_division(problem: Problem) -> int:
    """Divides each digit of the dividend independently, dropping the remainder instead of combining it forward."""
    tens_digit, ones_digit = divmod(problem.dividend, 10)
    return (tens_digit // problem.divisor) * 10 + (ones_digit // problem.divisor)


def _reversed_quotient_digits(problem: Problem) -> int:
    """Computes the correct quotient but writes its digits in reversed order."""
    tens, ones = divmod(problem.answer, 10)
    return ones * 10 + tens


_SIMULATORS: dict[MisconceptionName, Callable[[Problem], int]] = {
    "subtracted_instead_of_divided": _subtracted_instead_of_divided,
    "multiplied_instead_of_divided": _multiplied_instead_of_divided,
    "only_used_first_digit": _only_used_first_digit,
    "no_regroup_in_division": _no_regroup_in_division,
    "reversed_quotient_digits": _reversed_quotient_digits,
}


def diagnose(problem: Problem, submitted_answer: int) -> MisconceptionName | None:
    """Return the known buggy algorithm whose simulated answer matches what was submitted, if any."""
    for name, simulate in _SIMULATORS.items():
        if simulate(problem) == submitted_answer:
            return name
    return None
