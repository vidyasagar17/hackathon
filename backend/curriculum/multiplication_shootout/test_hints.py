from . import hints
from .rounds import Fact, Round


def test_general_hint_is_the_approved_wording():
    assert hints.GENERAL_HINT == (
        "A times fact counts equal groups: skip count by the second number. "
        "For a division fact, find the times fact that makes the bigger number."
    )


def test_prompt_asks_to_keep_the_numbers_and_signs_and_names_the_banned_words():
    for word in ["number", "×", "÷", "+", "−", "less", "more", *hints.BANNED_WORDS]:
        assert word in hints.SYSTEM_PROMPT


def test_hint_sentence_rewords_the_code_built_sentence_without_an_answer_check(monkeypatch):
    calls = []

    def fake_reword(sentence, system_prompt, answer, banned_words):
        calls.append((sentence, system_prompt, answer, banned_words))
        return "reworded"

    monkeypatch.setattr(hints, "reword_hint", fake_reword)
    round = Round(
        level=2,
        fact=Fact(operation="multiply", left=6, right=7),
        robo_fact=Fact(operation="multiply", left=3, right=4),
        answer=48,
    )

    assert hints.hint_sentence(round, "neighboring_fact") == "reworded"
    assert calls == [
        (
            "48 is 6 × 8. 6 × 7 is 6 less: 48 − 6 = 42.",
            hints.SYSTEM_PROMPT,
            None,
            hints.BANNED_WORDS,
        )
    ]
