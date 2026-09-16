"""A student turn (roll, total, shut), Robo's turn, a finished box, the end of the game, and what the page sees."""

import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import Round


def _round(**update) -> Round:
    """A level 2 game: the student rolls 3 and 5, then 6 and 6; Robo rolls 2 and 6, then 1 and 1."""
    return Round(
        level=2,
        my_rolls=[(3, 5), (6, 6)] + [(1, 1)] * 7,
        robo_rolls=[(2, 6), (1, 1)] + [(1, 1)] * 7,
        my_open=list(range(1, 10)),
        robo_open=list(range(1, 10)),
    ).model_copy(update=update)


def _play(round_, *moves):
    results = []
    for move in moves:
        result = evaluate_move(round_, move)
        round_ = computer_move(result.round, round_.level)
        results.append(result)
    return round_, results


def test_rolling_shows_the_dice_and_four_answer_cards_and_is_not_graded():
    result = evaluate_move(_round(), {"type": "roll"})
    assert not result.counted
    state = visible_state(result.round)
    assert state["step"] == "total"
    assert state["my_dice"] == [3, 5]
    assert state["choices"] == [2, 6, 7, 8]
    assert state["my_total"] is None


def test_a_total_pick_is_graded_diagnosed_and_opens_the_shut_step_with_the_right_total():
    rolled = evaluate_move(_round(), {"type": "roll"}).round
    wrong = evaluate_move(rolled, {"type": "total", "pick": 7})
    assert (wrong.correct, wrong.misconception, wrong.counted) == (False, "counted_on_from_start", True)
    state = visible_state(wrong.round)
    assert (state["step"], state["total_pick"], state["my_total"], state["can_shut"]) == ("shut", 7, 8, True)
    assert evaluate_move(rolled, {"type": "total", "pick": 8}).correct


def test_a_right_shut_shuts_the_picked_tiles_and_hands_the_turn_to_robo():
    round_, results = _play(_round(), {"type": "roll"}, {"type": "total", "pick": 8}, {"type": "shut", "tiles": [5, 3]})
    assert results[-1].correct and results[-1].misconception is None
    assert round_.my_open == [1, 2, 4, 6, 7, 8, 9]
    state = visible_state(round_)
    assert (state["step"], state["picked_tiles"], state["shut_tiles"]) == ("pass", [3, 5], [3, 5])


def test_a_wrong_shut_is_diagnosed_and_the_fewest_highest_right_tiles_are_shut_instead():
    round_, results = _play(_round(), {"type": "roll"}, {"type": "total", "pick": 8}, {"type": "shut", "tiles": [4, 5]})
    assert (results[-1].correct, results[-1].misconception) == (False, "tiles_counted_on_from_start")
    assert round_.picked_tiles == [4, 5]
    assert round_.shut_tiles == [8]
    assert 8 not in round_.my_open and 4 in round_.my_open


def test_robo_plays_only_after_robo_turn_and_level_2_robo_shuts_the_fewest_highest_tiles():
    round_, _ = _play(_round(), {"type": "roll"}, {"type": "total", "pick": 8}, {"type": "shut", "tiles": [8]})
    assert round_.robo_last is None and round_.step == "pass"

    round_, results = _play(round_, {"type": "robo_turn"})
    assert not results[0].counted
    assert visible_state(round_)["robo_last"] == {"dice": (2, 6), "shut": [8]}
    assert round_.robo_open == [1, 2, 3, 4, 5, 6, 7, 9]
    assert round_.step == "roll"


def test_level_1_robo_shuts_the_most_tiles_it_can():
    round_ = Round(level=1, my_rolls=[(1, 1)] * 6, robo_rolls=[(3, 3)] * 6, my_open=[1, 2, 3, 4, 5, 6], robo_open=[1, 2, 3, 4, 5, 6], step="robo")
    assert computer_move(round_, 1).robo_last.shut == [1, 2, 3]


def test_when_no_open_tiles_make_the_total_the_students_box_is_done_after_the_total():
    round_ = _round(my_open=[1, 2, 4])
    round_, results = _play(round_, {"type": "roll"}, {"type": "total", "pick": 8})
    assert results[-1].correct
    state = visible_state(round_)
    assert state["my_done"] and state["step"] == "pass"
    assert state["can_shut"] is False


def test_once_the_student_is_done_robo_keeps_playing_until_its_box_is_done_then_the_game_ends():
    round_ = _round(my_open=[1, 2, 4], my_done=True, step="pass", robo_open=[8, 9])
    round_, _ = _play(round_, {"type": "robo_turn"})
    assert round_.robo_open == [9] and round_.step == "pass"
    round_, _ = _play(round_, {"type": "robo_turn"})
    assert round_.robo_done and round_.step == "over"
    assert visible_state(round_)["winner"] == "robo"


def test_once_robo_is_done_the_student_rolls_again_straight_away():
    round_ = _round(robo_done=True)
    round_, _ = _play(round_, {"type": "roll"}, {"type": "total", "pick": 8}, {"type": "shut", "tiles": [8]})
    assert round_.step == "roll"


def test_shutting_every_tile_ends_the_game_and_wins():
    round_ = _round(my_open=[3, 5])
    round_, _ = _play(round_, {"type": "roll"}, {"type": "total", "pick": 8}, {"type": "shut", "tiles": [3, 5]})
    state = visible_state(round_)
    assert (state["step"], state["winner"]) == ("over", "mine")


def test_the_same_number_of_open_tiles_is_a_tie():
    assert visible_state(_round(step="over", my_open=[1, 2], robo_open=[3, 4]))["winner"] == "same"


@pytest.mark.parametrize(
    "round_, move",
    [
        (_round(), {"type": "total", "pick": 8}),
        (_round(), {"type": "robo_turn"}),
        (_round(), {"type": "jump"}),
        (_round(step="total", my_dice=(3, 5)), {"type": "total", "pick": 9}),
        (_round(step="total", my_dice=(3, 5)), {"type": "total", "pick": "8"}),
        (_round(step="shut", my_dice=(3, 5)), {"type": "shut", "tiles": []}),
        (_round(step="shut", my_dice=(3, 5)), {"type": "shut", "tiles": [8, 8]}),
        (_round(step="shut", my_dice=(3, 5)), {"type": "shut", "tiles": [10]}),
        (_round(step="shut", my_dice=(3, 5), my_open=[1, 2, 3]), {"type": "shut", "tiles": [5, 3]}),
        (_round(step="shut", my_dice=(3, 5)), {"type": "shut", "tiles": "8"}),
    ],
)
def test_a_move_at_the_wrong_step_or_with_a_bad_pick_is_rejected(round_, move):
    with pytest.raises(ValueError):
        evaluate_move(round_, move)


def test_robos_rolls_and_future_rolls_never_reach_the_page():
    state = visible_state(_round())
    assert "robo_rolls" not in state and "my_rolls" not in state
    assert state["my_dice"] is None and state["choices"] is None
