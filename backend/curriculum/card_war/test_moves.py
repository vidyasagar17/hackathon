import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import Round


def _round(operation="add", mine=(3, 4), robo=(5, 1), answer_pick=None, winner_pick=None):
    return Round(
        operation=operation, level=1, mine=mine, robo=robo, answer_pick=answer_pick, winner_pick=winner_pick
    )


def _answer(pick):
    return {"type": "answer", "pick": pick}


def _winner(pick):
    return {"type": "winner", "pick": pick}


def test_a_new_hand_shows_both_hands_robos_total_and_the_answer_cards_but_not_the_results():
    assert visible_state(_round()) == {
        "operation": "add",
        "level": 1,
        "step": "answer",
        "mine": [3, 4],
        "robo": [5, 1],
        "robo_total": 6,
        "choices": [1, 5, 6, 7],
        "answer_pick": None,
        "my_total": None,
        "winner_pick": None,
        "winner": None,
    }


def test_a_correct_answer_is_counted_and_moves_to_the_winner_step():
    result = evaluate_move(_round(), _answer(7))

    assert (result.correct, result.misconception, result.counted) == (True, None, True)
    state = visible_state(result.round)
    assert (state["step"], state["answer_pick"], state["my_total"]) == ("winner", 7, 7)


def test_a_wrong_answer_is_diagnosed_counted_and_still_moves_on():
    result = evaluate_move(_round(), _answer(6))

    assert (result.correct, result.misconception, result.counted) == (False, "counted_on_from_start", True)
    assert visible_state(result.round)["step"] == "winner"


def test_a_filler_answer_is_wrong_and_undiagnosed():
    result = evaluate_move(_round(mine=(4, 3)), _answer(8))

    assert (result.correct, result.misconception) == (False, None)


@pytest.mark.parametrize("move", [_answer(9), _answer("7"), _answer(True), _answer(None), {"type": "answer"}])
def test_an_answer_that_is_not_one_of_the_cards_is_rejected(move):
    with pytest.raises(ValueError):
        evaluate_move(_round(), move)


@pytest.mark.parametrize(
    "mine, robo, winner",
    [((3, 4), (5, 1), "mine"), ((1, 2), (5, 1), "robo"), ((3, 4), (5, 2), "same")],
)
def test_the_winner_pick_is_checked_but_not_counted(mine, robo, winner):
    answered = _round(mine=mine, robo=robo, answer_pick=sum(mine))

    right = evaluate_move(answered, _winner(winner))
    wrong = evaluate_move(answered, _winner("robo" if winner != "robo" else "mine"))

    assert (right.correct, right.misconception, right.counted) == (True, None, False)
    assert (wrong.correct, wrong.misconception, wrong.counted) == (False, None, False)
    state = visible_state(right.round)
    assert (state["step"], state["winner_pick"], state["winner"]) == ("done", winner, winner)


def test_take_away_compares_differences():
    answered = _round(operation="take_away", mine=(3, 8), robo=(9, 2), answer_pick=5)

    assert visible_state(answered)["robo_total"] == 7
    assert evaluate_move(answered, _winner("robo")).correct


@pytest.mark.parametrize(
    "round, move",
    [
        (_round(), _winner("mine")),
        (_round(answer_pick=7), _answer(7)),
        (_round(answer_pick=7), _winner("banana")),
        (_round(answer_pick=7, winner_pick="mine"), _winner("mine")),
        (_round(), {"type": "banana", "pick": 7}),
    ],
)
def test_a_move_out_of_turn_or_of_an_unknown_kind_is_rejected(round, move):
    with pytest.raises(ValueError):
        evaluate_move(round, move)


def test_evaluating_does_not_change_the_round_it_was_given():
    round = _round()
    evaluate_move(round, _answer(7))

    assert round.answer_pick is None


def test_robo_has_nothing_to_decide():
    round = _round()

    assert computer_move(round, 2) == round
