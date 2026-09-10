from .misconceptions import diagnose
from .problems import Problem, compute_columns


def _problem(multiplicand: int, multiplier: int) -> Problem:
    return Problem(
        multiplicand=multiplicand,
        multiplier=multiplier,
        answer=multiplicand * multiplier,
        columns=compute_columns(multiplicand, multiplier),
        difficulty=1,
    )


def test_added_instead_of_multiplied():
    problem = _problem(21, 3)
    assert diagnose(problem, 24) == "added_instead_of_multiplied"


def test_no_carry():
    problem = _problem(24, 3)
    assert diagnose(problem, 62) == "no_carry"


def test_carry_always():
    problem = _problem(21, 3)
    assert diagnose(problem, 73) == "carry_always"


def test_double_digit_write():
    problem = _problem(24, 3)
    assert diagnose(problem, 612) == "double_digit_write"


def test_drops_final_carry():
    problem = _problem(47, 6)
    assert diagnose(problem, 82) == "drops_final_carry"


def test_unrecognized_wrong_answer_returns_none():
    problem = _problem(21, 3)
    assert diagnose(problem, 999999) is None
