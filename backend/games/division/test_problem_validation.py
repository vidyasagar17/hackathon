import pytest
from pydantic import ValidationError

from .problems import ColumnBreakdown, Problem


def _data(**changes) -> dict:
    problem = Problem(
        dividend=84,
        divisor=4,
        answer=21,
        columns=[ColumnBreakdown(place="tens"), ColumnBreakdown(place="ones")],
        difficulty=2,
    )
    return {**problem.model_dump(), **changes}


def test_accepts_a_problem_that_follows_from_its_numbers():
    assert Problem.model_validate(_data()).answer == 21


def test_rejects_a_tampered_answer():
    with pytest.raises(ValidationError):
        Problem.model_validate(_data(answer=22))


def test_rejects_columns_that_do_not_match_the_answer():
    with pytest.raises(ValidationError):
        Problem.model_validate(_data(columns=[{"place": "ones"}]))


def test_rejects_a_zero_divisor():
    with pytest.raises(ValidationError):
        Problem.model_validate(_data(dividend=0, divisor=0, answer=0, columns=[{"place": "ones"}]))
