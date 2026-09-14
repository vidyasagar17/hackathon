from .. import rewording
from . import hints
from .problems import Problem, compute_columns
from .sentences import specific_hint


def test_generate_hint_falls_back_to_the_code_built_sentence(monkeypatch):
    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(rewording, "InferenceClient", broken_client)
    problem = Problem(
        minuend=742, subtrahend=158, answer=584, columns=compute_columns(742, 158), difficulty=1
    )
    assert hints.generate_hint(problem, "smaller_from_larger") == specific_hint(
        problem, "smaller_from_larger"
    )
