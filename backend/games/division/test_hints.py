from .. import rewording
from . import hints
from .problems import ColumnBreakdown, Problem
from .sentences import specific_hint


def test_generate_hint_falls_back_to_the_code_built_sentence(monkeypatch):
    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(rewording, "InferenceClient", broken_client)
    problem = Problem(
        dividend=84,
        divisor=4,
        answer=21,
        columns=[ColumnBreakdown(place="tens"), ColumnBreakdown(place="ones")],
        difficulty=2,
    )
    assert hints.generate_hint(problem, "only_used_first_digit") == specific_hint(
        problem, "only_used_first_digit"
    )
