import time
from types import SimpleNamespace

from . import rewording

SENTENCE = (
    "In the ones column, 2 is smaller than 8, so you can't subtract yet: "
    "borrow from the tens column."
)


def _llm_replies(monkeypatch, reply: str, delay: float = 0.0) -> None:
    def chat_completion(**kwargs):
        time.sleep(delay)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=reply))])

    monkeypatch.setenv("HF_TOKEN", "test-token")
    monkeypatch.setattr(
        rewording, "InferenceClient", lambda **kwargs: SimpleNamespace(chat_completion=chat_completion)
    )


def _reword() -> str:
    return rewording.reword_hint(SENTENCE, "Reword this hint.", 584, ["minuend"])


def test_faithful_rewording_is_shown(monkeypatch):
    reply = "You're close! In the ones column, 2 is smaller than 8, so you can't subtract yet: borrow from the tens column."
    _llm_replies(monkeypatch, reply)
    assert _reword() == reply


def test_rewording_with_a_wrong_column_falls_back_to_the_sentence(monkeypatch):
    _llm_replies(monkeypatch, "In the ones column, 2 is smaller than 8, so borrow from the hundreds column.")
    assert _reword() == SENTENCE


def test_llm_failure_falls_back_to_the_sentence(monkeypatch):
    def broken_client(**kwargs):
        raise TimeoutError("provider down")

    monkeypatch.setattr(rewording, "InferenceClient", broken_client)
    assert _reword() == SENTENCE


def test_slow_llm_falls_back_at_the_deadline(monkeypatch):
    monkeypatch.setattr(rewording, "DEADLINE_SECONDS", 0.2)
    _llm_replies(monkeypatch, SENTENCE, delay=2)

    start = time.perf_counter()
    result = _reword()
    elapsed = time.perf_counter() - start

    assert result == SENTENCE
    assert elapsed < 1


DECIMAL_SENTENCE = (
    "0.4 is 4 tenths and 0.3 is 3 tenths. 4 tenths is more than 3 tenths, so 0.4 is larger."
)


def test_a_hint_without_an_answer_shows_a_faithful_rewording(monkeypatch):
    reply = "Good thinking! 0.4 is 4 tenths and 0.3 is 3 tenths. 4 tenths is more than 3 tenths, so 0.4 is larger."
    _llm_replies(monkeypatch, reply)
    assert rewording.reword_hint(DECIMAL_SENTENCE, "Reword this hint.", None, []) == reply


def test_a_hint_without_an_answer_still_rejects_a_swapped_place_name(monkeypatch):
    _llm_replies(monkeypatch, "0.4 is 4 hundredths and 0.3 is 3 tenths. 4 tenths is more than 3 tenths, so 0.4 is larger.")
    assert rewording.reword_hint(DECIMAL_SENTENCE, "Reword this hint.", None, []) == DECIMAL_SENTENCE
