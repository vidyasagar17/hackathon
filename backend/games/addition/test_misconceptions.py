from .misconceptions import diagnose
from .problems import Problem, compute_columns


def _problem(addend1: int, addend2: int) -> Problem:
    return Problem(
        addend1=addend1,
        addend2=addend2,
        answer=addend1 + addend2,
        columns=compute_columns(addend1, addend2),
        difficulty=1,
    )


def test_no_carry():
    problem = _problem(456, 278)
    assert diagnose(problem, 624) == "no_carry"


def test_carry_always():
    problem = _problem(143, 251)
    assert diagnose(problem, 404) == "carry_always"


def test_double_digit_write():
    problem = _problem(456, 278)
    assert diagnose(problem, 61214) == "double_digit_write"


def test_carry_drops_at_second_column():
    problem = _problem(269, 156)
    assert diagnose(problem, 325) == "carry_drops_at_second_column"


def test_drops_final_carry():
    problem = _problem(950, 950)
    assert diagnose(problem, 900) == "drops_final_carry"


def test_unrecognized_wrong_answer_returns_none():
    problem = _problem(456, 278)
    assert diagnose(problem, 999999) is None
