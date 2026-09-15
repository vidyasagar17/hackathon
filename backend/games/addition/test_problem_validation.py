import pytest
from pydantic import ValidationError

from .problems import Problem, compute_columns


def _data(**changes) -> dict:
    problem = Problem(
        addend1=456, addend2=278, answer=734, columns=compute_columns(456, 278), difficulty=2
    )
    return {**problem.model_dump(), **changes}


def test_accepts_a_problem_that_follows_from_its_numbers():
    assert Problem.model_validate(_data()).answer == 734


def test_rejects_a_tampered_answer():
    with pytest.raises(ValidationError):
        Problem.model_validate(_data(answer=624))


def test_rejects_columns_from_other_numbers():
    other_columns = [c.model_dump() for c in compute_columns(950, 950)]
    with pytest.raises(ValidationError):
        Problem.model_validate(_data(columns=other_columns))
