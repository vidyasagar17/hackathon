from types import SimpleNamespace

from . import hints
from .problems import ColumnBreakdown, Problem

SENTENCE = "After you share the 8 tens into 4 groups, bring down the 4 ones and keep sharing."


def _problem() -> Problem:
    return Problem(
        dividend=84,
        divisor=4,
        answer=21,
        columns=[ColumnBreakdown(place="tens"), ColumnBreakdown(place="ones")],
        difficulty=2,
    )


def _llm_replies(monkeypatch, reply: str) -> None:
    response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=reply))])
    client = SimpleNamespace(chat_completion=lambda **kwargs: response)
    monkeypatch.setenv("HF_TOKEN", "test-token")
    monkeypatch.setattr(hints, "InferenceClient", lambda **kwargs: client)


def test_faithful_rewording_is_shown(monkeypatch):
    reply = "You're doing great! After you share the 8 tens into 4 groups, bring down the 4 ones and keep going."
    _llm_replies(monkeypatch, reply)
    assert hints.generate_hint(_problem(), "only_used_first_digit") == reply


def test_rewording_with_swapped_places_falls_back_to_the_sentence(monkeypatch):
    _llm_replies(monkeypatch, "After you share the 8 ones into 4 groups, bring down the 4 tens.")
    assert hints.generate_hint(_problem(), "only_used_first_digit") == SENTENCE


def test_llm_failure_falls_back_to_the_sentence(monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "test-token")

    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(hints, "InferenceClient", broken_client)
    assert hints.generate_hint(_problem(), "only_used_first_digit") == SENTENCE
