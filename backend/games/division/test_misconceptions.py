from .misconceptions import diagnose
from .problems import ColumnBreakdown, Problem


def _problem(dividend: int, divisor: int) -> Problem:
    answer = dividend // divisor
    places = ["ones"] if answer < 10 else ["tens", "ones"]
    return Problem(
        dividend=dividend,
        divisor=divisor,
        answer=answer,
        columns=[ColumnBreakdown(place=p) for p in places],
        difficulty=1,
    )


def test_subtracted_instead_of_divided():
    problem = _problem(84, 4)
    assert diagnose(problem, 80) == "subtracted_instead_of_divided"


def test_multiplied_instead_of_divided():
    problem = _problem(84, 4)
    assert diagnose(problem, 336) == "multiplied_instead_of_divided"


def test_only_used_first_digit():
    problem = _problem(84, 4)
    assert diagnose(problem, 2) == "only_used_first_digit"


def test_reversed_quotient_digits():
    problem = _problem(84, 4)
    assert diagnose(problem, 12) == "reversed_quotient_digits"


def test_no_regroup_in_division():
    problem = _problem(78, 3)
    assert diagnose(problem, 22) == "no_regroup_in_division"


def test_unrecognized_wrong_answer_returns_none():
    problem = _problem(84, 4)
    assert diagnose(problem, 999999) is None
