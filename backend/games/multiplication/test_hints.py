from .. import rewording
from . import hints
from .problems import Problem, compute_columns
from .sentences import specific_hint


def test_generate_hint_falls_back_to_the_code_built_sentence(monkeypatch):
    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(rewording, "InferenceClient", broken_client)
    problem = Problem(
        multiplicand=24, multiplier=3, answer=72, columns=compute_columns(24, 3), difficulty=1
    )
    assert hints.generate_hint(problem, "no_carry") == specific_hint(problem, "no_carry")
