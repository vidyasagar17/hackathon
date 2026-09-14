import pytest
from pydantic import ValidationError

from .problems import Problem, compute_columns


def _data(**changes) -> dict:
    problem = Problem(
        minuend=742, subtrahend=158, answer=584, columns=compute_columns(742, 158), difficulty=2
    )
    return {**problem.model_dump(), **changes}


def test_accepts_a_problem_that_follows_from_its_numbers():
    assert Problem.model_validate(_data()).answer == 584


def test_rejects_a_tampered_answer():
    with pytest.raises(ValidationError):
        Problem.model_validate(_data(answer=616))


def test_rejects_columns_from_other_numbers():
    other_columns = [c.model_dump() for c in compute_columns(302, 158)]
    with pytest.raises(ValidationError):
        Problem.model_validate(_data(columns=other_columns))
