"""Checking expressions, showing a way, Robo's turn, and what the student may see."""

import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import Round


def _round(**update) -> Round:
    """The student holds 3, 5, 3, 1 (a level 2 hand); Robo holds 1, 2, 7, 7, which needs ÷."""
    return Round(level=2, cards=[3, 5, 3, 1], robo_cards=[1, 2, 7, 7]).model_copy(update=update)


def _check(round_, *tokens):
    return evaluate_move(round_, {"type": "check", "tokens": list(tokens)})


def test_a_check_that_makes_24_is_correct_and_ends_the_students_part():
    result = _check(_round(), "(", 0, "+", 1, ")", "*", 2, "*", 3)
    assert result.correct and result.misconception is None and result.counted
    assert result.round.made_24
    assert result.round.checks == [["(", 3, "+", 5, ")", "*", 3, "*", 1]]


def test_a_wrong_check_is_diagnosed_and_the_student_can_check_again():
    wrong = _check(_round(), 0, "+", 1, "*", 2, "*", 3)
    assert not wrong.correct and wrong.misconception == "left_to_right"
    assert not wrong.round.made_24
    again = _check(wrong.round, "(", 0, "+", 1, ")", "*", 2, "*", 3)
    assert again.correct
    assert len(again.round.checks) == 2


def test_show_way_is_not_graded_and_ends_the_students_part():
    result = evaluate_move(_round(), {"type": "show_way"})
    assert result.round.shown_way and not result.counted
    assert visible_state(result.round)["shown_way"] == {
        "text": "(3 + 5) × 3 × 1",
        "steps": ["3 + 5 = 8", "8 × 3 = 24", "24 × 1 = 24"],
        "value": "24",
    }


@pytest.mark.parametrize("move", [{"type": "check", "tokens": [0, "+", 1]}, {"type": "show_way"}])
def test_no_move_is_allowed_once_the_students_part_is_done(move):
    with pytest.raises(ValueError):
        evaluate_move(_round(made_24=True), move)
    with pytest.raises(ValueError):
        evaluate_move(_round(shown_way=True), move)


@pytest.mark.parametrize(
    "move",
    [
        {"type": "guess"},
        {"type": "check"},
        {"type": "check", "tokens": "0+1*2*3"},
        {"type": "check", "tokens": [0, "+", 1, "*", 2]},
        {"type": "check", "tokens": ["("] * 14 + [0, "+", 1, "*", 2, "*", 3] + [")"] * 14},
    ],
)
def test_a_bad_move_is_rejected(move):
    with pytest.raises(ValueError):
        evaluate_move(_round(), move)


def test_the_last_check_is_shown_worked_out_by_the_rule():
    wrong = _check(_round(), 0, "+", 1, "*", 2, "*", 3)
    state = visible_state(wrong.round)
    assert state["checks"] == 1
    assert state["last_check"] == {
        "text": "3 + 5 × 3 × 1",
        "steps": ["5 × 3 = 15", "15 × 1 = 15", "3 + 15 = 18"],
        "value": "18",
    }
    assert state["done"] is False


def test_a_division_by_zero_shows_its_steps_and_no_value():
    state = visible_state(_check(_round(), 1, "/", "(", 0, "-", 2, ")", "+", 3).round)
    assert state["last_check"] == {"text": "5 ÷ (3 − 3) + 1", "steps": ["3 − 3 = 0"], "value": None}


def test_robo_waits_for_the_student_then_shows_a_way_it_can_find_at_its_level():
    assert computer_move(_round(), 3) == _round()
    assert visible_state(_round())["robo_cards"] is None

    played = computer_move(_round(made_24=True), 3)
    state = visible_state(played)
    assert state["robo_cards"] == [1, 2, 7, 7]
    assert state["robo_way"] == {
        "text": "(7 × 7 − 1) ÷ 2",
        "steps": ["7 × 7 = 49", "49 − 1 = 48", "48 ÷ 2 = 24"],
        "value": "24",
    }
    assert computer_move(played, 3) == played


def test_robo_says_nothing_about_a_way_it_cant_find():
    played = computer_move(_round(shown_way=True), 2)
    state = visible_state(played)
    assert state["robo_cards"] == [1, 2, 7, 7]
    assert state["robo_way"] is None
