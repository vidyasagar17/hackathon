from types import SimpleNamespace

from . import hints
from .problems import Problem, compute_columns

SENTENCE = (
    "In the ones column, 6 + 8 makes 10 or more, so write only the ones digit "
    "and carry 1 to the tens column."
)


def _problem() -> Problem:
    return Problem(
        addend1=456, addend2=278, answer=734, columns=compute_columns(456, 278), difficulty=1
    )


def _llm_replies(monkeypatch, reply: str) -> None:
    response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=reply))])
    client = SimpleNamespace(chat_completion=lambda **kwargs: response)
    monkeypatch.setenv("HF_TOKEN", "test-token")
    monkeypatch.setattr(hints, "InferenceClient", lambda **kwargs: client)


def test_faithful_rewording_is_shown(monkeypatch):
    reply = "Great work so far! In the ones column, 6 + 8 makes 10 or more, so keep just the ones digit and carry 1 over to the tens column."
    _llm_replies(monkeypatch, reply)
    assert hints.generate_hint(_problem(), "no_carry") == reply


def test_rewording_with_a_wrong_column_falls_back_to_the_sentence(monkeypatch):
    _llm_replies(monkeypatch, "In the ones column, 6 + 8 makes 10 or more, so carry 1 to the hundreds column.")
    assert hints.generate_hint(_problem(), "no_carry") == SENTENCE


def test_llm_failure_falls_back_to_the_sentence(monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "test-token")

    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(hints, "InferenceClient", broken_client)
    assert hints.generate_hint(_problem(), "no_carry") == SENTENCE
