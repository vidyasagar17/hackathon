from . import hints
from .rounds import Round


def test_each_game_has_its_own_general_hint():
    assert hints.GENERAL_HINTS == {
        "add": "Start at the bigger card and count on the smaller card's number.",
        "take_away": "Start at the bigger card and count back the smaller card's number.",
    }


def test_hint_sentence_is_the_code_built_sentence_for_the_students_cards():
    round = Round(operation="add", level=1, mine=(3, 4), robo=(5, 1), answer_pick=5)

    assert hints.hint_sentence(round, "one_more_than_second") == "Start at 4 and count on 3 more: 5, 6, 7."


def test_k1_hints_never_call_the_llm():
    assert not hasattr(hints, "reword_hint")
