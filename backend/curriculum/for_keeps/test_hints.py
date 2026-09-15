from . import hints
from .rounds import Hand, Round


def test_general_hint_is_the_approved_wording():
    assert hints.GENERAL_HINT == (
        "Work one column at a time, starting with the ones. If the top digit is smaller than "
        "the bottom digit, borrow from the tens column."
    )


def test_prompt_asks_to_keep_the_column_names_and_names_the_banned_words():
    for word in ["ones", "tens", *hints.BANNED_WORDS]:
        assert word in hints.SYSTEM_PROMPT


def test_hint_sentence_uses_the_last_hand_with_a_typed_difference_without_an_answer_check(monkeypatch):
    calls = []

    def fake_reword(sentence, system_prompt, answer, banned_words):
        calls.append((sentence, system_prompt, answer, banned_words))
        return "reworded"

    monkeypatch.setattr(hints, "reword_hint", fake_reword)
    hands = [
        Hand(my_cards=[9, 1, 2, 3], robo_cards=[1, 2, 3, 4], my_numbers=(91, 23), my_answer=68, my_kept=False),
        Hand(my_cards=[7, 3, 5, 8], robo_cards=[1, 2, 3, 4], my_numbers=(73, 58), my_answer=25, my_kept=True),
        Hand(my_cards=[4, 0, 2, 3], robo_cards=[1, 2, 3, 4]),
        Hand(my_cards=[1, 1, 1, 1], robo_cards=[1, 2, 3, 4]),
    ]
    round = Round(level=1, hands=hands, hand_number=3, step="arrange")

    assert hints.hint_sentence(round, "smaller_from_larger") == "reworded"
    assert calls == [
        (
            "In the ones column, 3 is smaller than 8, so you can't subtract yet: borrow from the tens column.",
            hints.SYSTEM_PROMPT,
            None,
            hints.BANNED_WORDS,
        )
    ]
