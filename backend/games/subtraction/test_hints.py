from types import SimpleNamespace

from . import hints
from .problems import Problem, compute_columns

SENTENCE = (
    "In the ones column, 2 is smaller than 8, so you can't subtract yet: "
    "borrow from the tens column."
)


def _problem() -> Problem:
    return Problem(
        minuend=742, subtrahend=158, answer=584, columns=compute_columns(742, 158), difficulty=1
    )


def _llm_replies(monkeypatch, reply: str) -> None:
    response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=reply))])
    client = SimpleNamespace(chat_completion=lambda **kwargs: response)
    monkeypatch.setenv("HF_TOKEN", "test-token")
    monkeypatch.setattr(hints, "InferenceClient", lambda **kwargs: client)


def test_faithful_rewording_is_shown(monkeypatch):
    reply = "You're close! In the ones column, 2 is smaller than 8, so you can't subtract yet: borrow from the tens column."
    _llm_replies(monkeypatch, reply)
    assert hints.generate_hint(_problem(), "smaller_from_larger") == reply


def test_rewording_with_a_wrong_column_falls_back_to_the_sentence(monkeypatch):
    _llm_replies(monkeypatch, "In the ones column, 2 is smaller than 8, so borrow from the hundreds column.")
    assert hints.generate_hint(_problem(), "smaller_from_larger") == SENTENCE


def test_rewording_with_an_invented_number_falls_back_to_the_sentence(monkeypatch):
    _llm_replies(monkeypatch, "In the ones column, 2 is smaller than 8, so borrow from the tens column to make 12.")
    assert hints.generate_hint(_problem(), "smaller_from_larger") == SENTENCE


def test_llm_failure_falls_back_to_the_sentence(monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "test-token")

    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(hints, "InferenceClient", broken_client)
    assert hints.generate_hint(_problem(), "smaller_from_larger") == SENTENCE
