from . import hints
from .rounds import Round


def test_general_hint_is_the_approved_wording():
    assert hints.GENERAL_HINT == (
        "Give both numbers the same number of digits, then compare them from the left: "
        "tenths first, then hundredths, then thousandths."
    )


def test_prompt_asks_to_keep_the_decimal_facts_and_names_the_banned_words():
    for word in ["tenths", "hundredths", "thousandths", "same", *hints.BANNED_WORDS]:
        assert word in hints.SYSTEM_PROMPT


def test_hint_sentence_rewords_the_code_built_sentence_without_an_answer_check(monkeypatch):
    calls = []

    def fake_reword(sentence, system_prompt, answer, banned_words):
        calls.append((sentence, system_prompt, answer, banned_words))
        return "reworded"

    monkeypatch.setattr(hints, "reword_hint", fake_reword)
    round = Round(level=2, comparison="shorter_larger", mine="45", robo="8", pick="mine")

    assert hints.hint_sentence(round, "longer_is_larger") == "reworded"
    assert calls == [
        (
            "Give both numbers the same number of digits: 0.45 and 0.80. "
            "80 hundredths is more than 45 hundredths, so 0.8 is larger.",
            hints.SYSTEM_PROMPT,
            None,
            hints.BANNED_WORDS,
        )
    ]
