from types import SimpleNamespace

from . import hints
from .problems import Problem, compute_columns

SENTENCE = (
    "In the ones column, 4 × 3 makes 10 or more, "
    "so write only its ones digit and carry the 1 to the tens column."
)


def _problem() -> Problem:
    return Problem(
        multiplicand=24, multiplier=3, answer=72, columns=compute_columns(24, 3), difficulty=1
    )


def _llm_replies(monkeypatch, reply: str) -> None:
    response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=reply))])
    client = SimpleNamespace(chat_completion=lambda **kwargs: response)
    monkeypatch.setenv("HF_TOKEN", "test-token")
    monkeypatch.setattr(hints, "InferenceClient", lambda **kwargs: client)


def test_faithful_rewording_is_shown(monkeypatch):
    reply = "Nice effort! In the ones column, 4 × 3 makes 10 or more, so keep only its ones digit and carry the 1 to the tens column."
    _llm_replies(monkeypatch, reply)
    assert hints.generate_hint(_problem(), "no_carry") == reply


def test_rewording_with_a_wrong_column_falls_back_to_the_sentence(monkeypatch):
    _llm_replies(monkeypatch, "In the ones column, 4 × 3 makes 10 or more, so carry the 1 to the hundreds column.")
    assert hints.generate_hint(_problem(), "no_carry") == SENTENCE


def test_llm_failure_falls_back_to_the_sentence(monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "test-token")

    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(hints, "InferenceClient", broken_client)
    assert hints.generate_hint(_problem(), "no_carry") == SENTENCE
