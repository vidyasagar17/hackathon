from .misconceptions import diagnose
from .problems import Problem, compute_columns


def _problem(minuend: int, subtrahend: int) -> Problem:
    return Problem(
        minuend=minuend,
        subtrahend=subtrahend,
        answer=minuend - subtrahend,
        columns=compute_columns(minuend, subtrahend),
        difficulty=1,
    )


def test_smaller_from_larger():
    problem = _problem(742, 158)
    assert diagnose(problem, 616) == "smaller_from_larger"


def test_borrowed_without_decrementing():
    problem = _problem(742, 158)
    assert diagnose(problem, 694) == "borrowed_without_decrementing"


def test_borrow_across_zero_failure():
    problem = _problem(302, 158)
    assert diagnose(problem, 244) == "borrow_across_zero_failure"


def test_always_borrow():
    problem = _problem(463, 241)
    assert diagnose(problem, 112) == "always_borrow"


def test_zero_minus_digit_gives_digit():
    problem = _problem(204, 168)
    assert diagnose(problem, 166) == "zero_minus_digit_gives_digit"


def test_unrecognized_wrong_answer_returns_none():
    problem = _problem(742, 158)
    assert diagnose(problem, 999) is None
