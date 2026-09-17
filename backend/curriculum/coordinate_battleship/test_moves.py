"""A turn: aim, write the pair (graded; fires where it says), Robo's turn, read Robo's call (graded)."""

import pytest

from .moves import computer_move, evaluate_move, robo_target, visible_state, winner
from .rounds import TURNS, Round


def _round(**update) -> Round:
    """Level 2 (grid 0-5): my ships along y = 1 and up x = 5; Robo's ships along y = 4 and up x = 0."""
    return Round(
        level=2,
        seed=7,
        my_ships=[[(1, 1), (2, 1), (3, 1)], [(5, 3), (5, 4)]],
        robo_ships=[[(2, 4), (3, 4), (4, 4)], [(0, 0), (0, 1)]],
    ).model_copy(update=update)


def _play(round_, *moves):
    results = []
    for move in moves:
        result = evaluate_move(round_, move)
        round_ = computer_move(result.round, round_.level)
        results.append(result)
    return round_, results


def test_aiming_is_not_graded_and_can_change_before_writing():
    round_, results = _play(_round(), {"type": "aim", "x": 1, "y": 3}, {"type": "aim", "x": 3, "y": 4})
    assert not any(result.counted for result in results)
    assert (round_.step, round_.aim) == ("write", (3, 4))


def test_a_right_pair_fires_at_the_aim_and_hits():
    round_, results = _play(_round(), {"type": "aim", "x": 3, "y": 4}, {"type": "write", "x": 3, "y": 4})
    assert results[-1].correct and results[-1].misconception is None
    state = visible_state(round_)
    assert state["robo_ocean"]["shots"] == [{"x": 3, "y": 4, "hit": True}]
    assert (state["step"], state["my_hits"]) == ("pass", 1)
    assert state["robo_ocean"]["ships"] is None


def test_a_swapped_pair_is_diagnosed_and_fires_where_it_says():
    round_, results = _play(_round(), {"type": "aim", "x": 3, "y": 4}, {"type": "write", "x": 4, "y": 3})
    assert (results[-1].correct, results[-1].misconception) == (False, "swapped_x_and_y")
    assert visible_state(round_)["robo_ocean"]["shots"] == [{"x": 4, "y": 3, "hit": False}]


def test_robo_calls_only_after_robo_turn():
    round_, _ = _play(_round(), {"type": "aim", "x": 3, "y": 4}, {"type": "write", "x": 3, "y": 4})
    assert round_.robo_call is None
    round_, results = _play(round_, {"type": "robo_turn"})
    assert not results[0].counted
    assert round_.step == "read" and round_.robo_call is not None


@pytest.mark.parametrize(
    "tapped, correct, misconception",
    [((2, 4), True, None), ((4, 2), False, "swapped_x_and_y"), ((1, 3), False, "counted_from_one")],
)
def test_reading_robos_call_is_graded_and_its_shot_lands_at_the_call(tapped, correct, misconception):
    round_ = _round(step="read", robo_call=(2, 4))
    result = evaluate_move(round_, {"type": "read", "x": tapped[0], "y": tapped[1]})
    assert (result.correct, result.misconception) == (correct, misconception)
    assert result.round.robo_shots == [(2, 4)]
    assert (result.round.turn, result.round.step, result.round.tapped) == (2, "aim", tapped)


def test_robo_targets_the_points_next_to_an_unsunk_hit_at_level_2():
    round_ = _round(robo_shots=[(2, 1)], step="robo")
    assert robo_target(round_) in [(1, 1), (3, 1), (2, 2), (2, 0)]


def test_level_3_robo_hunts_on_a_checkerboard_and_level_1_anywhere():
    level_3 = [robo_target(_round(level=3, seed=seed)) for seed in range(40)]
    assert all((x + y) % 2 == 0 for x, y in level_3)
    level_1 = [robo_target(_round(level=1, seed=seed)) for seed in range(40)]
    assert any((x + y) % 2 == 1 for x, y in level_1)
    assert all(0 <= x <= 4 and 0 <= y <= 4 for x, y in level_1)


def test_robo_is_deterministic_for_a_saved_game():
    assert robo_target(_round()) == robo_target(_round())


def test_sinking_the_whole_fleet_ends_the_game_and_wins():
    round_ = _round(my_shots=[(2, 4), (3, 4), (4, 4), (0, 0)], step="write", aim=(0, 1))
    result = evaluate_move(round_, {"type": "write", "x": 0, "y": 1})
    state = visible_state(result.round)
    assert (state["step"], state["winner"], state["my_sunk"]) == ("over", "mine", 2)
    assert state["robo_ocean"]["ships"] == [[(2, 4), (3, 4), (4, 4)], [(0, 0), (0, 1)]]


def test_the_game_ends_after_the_last_turn_and_most_hits_wins():
    round_ = _round(turn=TURNS, step="read", robo_call=(5, 3), my_shots=[(2, 4), (3, 4)], robo_shots=[])
    result = evaluate_move(round_, {"type": "read", "x": 5, "y": 3})
    state = visible_state(result.round)
    assert (state["step"], state["my_hits"], state["robo_hits"], state["winner"]) == ("over", 2, 1, "mine")
    assert winner(_round(my_shots=[(2, 4)], robo_shots=[(1, 1)])) == "same"


@pytest.mark.parametrize(
    "round_, move",
    [
        (_round(), {"type": "write", "x": 1, "y": 1}),
        (_round(), {"type": "aim", "x": 6, "y": 1}),
        (_round(), {"type": "aim", "x": "1", "y": 1}),
        (_round(), {"type": "read", "x": 1, "y": 1}),
        (_round(), {"type": "robo_turn"}),
        (_round(), {"type": "sonar"}),
        (_round(step="write", aim=(1, 1)), {"type": "write", "x": -1, "y": 1}),
    ],
)
def test_a_move_at_the_wrong_step_or_off_the_grid_is_rejected(round_, move):
    with pytest.raises(ValueError):
        evaluate_move(round_, move)


def test_robos_ships_and_future_calls_stay_hidden_until_the_end():
    state = visible_state(_round())
    assert state["robo_ocean"]["ships"] is None
    assert state["robo_call"] is None and "seed" not in state
