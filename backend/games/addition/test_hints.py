from .. import rewording
from . import hints
from .problems import Problem, compute_columns
from .sentences import specific_hint


def test_generate_hint_falls_back_to_the_code_built_sentence(monkeypatch):
    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(rewording, "InferenceClient", broken_client)
    problem = Problem(
        addend1=456, addend2=278, answer=734, columns=compute_columns(456, 278), difficulty=1
    )
    assert hints.generate_hint(problem, "no_carry") == specific_hint(problem, "no_carry")
