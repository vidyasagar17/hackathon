import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import Round


def _round(level=2, mine="45", robo="8", comparison="shorter_larger"):
    return Round(level=level, comparison=comparison, mine=mine, robo=robo)


def test_before_judging_the_student_sees_both_numbers_and_two_choices():
    assert visible_state(_round()) == {
        "level": 2,
        "mine": "0.45",
        "robo": "0.8",
        "choices": ["mine", "robo"],
        "pick": None,
        "correct_pick": None,
    }


def test_level_three_adds_the_same_choice():
    round = _round(level=3, mine="4", robo="40", comparison="equal_pair")
    assert visible_state(round)["choices"] == ["mine", "robo", "same"]


def test_a_wrong_pick_is_diagnosed_and_recorded_on_the_round():
    result = evaluate_move(_round(), {"pick": "mine"})

    assert (result.correct, result.misconception) == (False, "longer_is_larger")
    assert result.round.pick == "mine"


def test_a_correct_pick_has_no_misconception():
    result = evaluate_move(_round(), {"pick": "robo"})

    assert (result.correct, result.misconception) == (True, None)


def test_after_judging_the_student_sees_their_pick_and_the_correct_pick():
    judged = evaluate_move(_round(), {"pick": "mine"}).round

    state = visible_state(judged)
    assert (state["pick"], state["correct_pick"]) == ("mine", "robo")


def test_evaluating_does_not_change_the_round_it_was_given():
    round = _round()
    evaluate_move(round, {"pick": "mine"})
    assert round.pick is None


@pytest.mark.parametrize("move", [{"pick": "same"}, {"pick": "banana"}, {}])
def test_a_pick_that_is_not_one_of_the_rounds_choices_is_rejected(move):
    with pytest.raises(ValueError):
        evaluate_move(_round(), move)


def test_a_round_can_only_be_judged_once():
    judged = evaluate_move(_round(), {"pick": "robo"}).round

    with pytest.raises(ValueError):
        evaluate_move(judged, {"pick": "robo"})


def test_the_computer_has_nothing_to_decide_in_a_judge_only_round():
    round = _round()
    assert computer_move(round, 2) == round
