"""Placing (not graded) with Robo placing the same roll, the graded sum and distance, Robo's turn and the winner."""

import pytest

from .moves import computer_move, evaluate_move, lookahead_spot, robo_spot, visible_state
from .rounds import LEVELS, Round

ROLLS = [4, 5, 6, 3, 6, 5, 1, 6, 3]


def _round(**update) -> Round:
    """A level 2 game with fixed rolls and empty boards."""
    return Round(level=2, rolls=ROLLS, my_board=[None] * 9, robo_board=[None] * 9).model_copy(update=update)


def _play(round_, *moves):
    results = []
    for move in moves:
        result = evaluate_move(round_, move)
        round_ = computer_move(result.round, round_.level)
        results.append(result)
    return round_, results


def _fill(round_, spots=range(9)):
    return _play(round_, *({"type": "place", "spot": spot} for spot in spots))


def test_placing_puts_the_current_roll_in_the_spot_and_robo_places_the_same_roll():
    round_, results = _play(_round(), {"type": "place", "spot": 4})
    assert not results[0].counted
    assert round_.my_board[4] == 4
    assert sum(digit is not None for digit in round_.robo_board) == 1
    assert round_.robo_board[round_.robo_last_spot] == 4
    state = visible_state(round_)
    assert (state["roll"], state["rolls_left"], state["step"]) == (5, 8, "place")


def test_the_next_roll_hides_until_it_is_the_students_turn_to_place_it():
    state = visible_state(_round())
    assert state["roll"] == 4
    assert "rolls" not in state


def test_a_full_board_asks_for_the_sum_and_shows_the_numbers():
    round_, _ = _fill(_round())
    state = visible_state(round_)
    assert state["step"] == "sum"
    assert state["my_numbers"] == [456, 365, 163]
    assert state["roll"] is None and state["my_total"] is None
    assert None not in round_.robo_board


def test_a_wrong_sum_is_graded_and_diagnosed_then_the_distance_is_asked():
    round_, _ = _fill(_round())
    wrong = evaluate_move(round_, {"type": "sum", "answer": 874})
    assert (wrong.correct, wrong.misconception, wrong.counted) == (False, "no_carry", True)
    state = visible_state(wrong.round)
    assert (state["step"], state["my_total"], state["broke"]) == ("distance", 984, False)


def test_a_wrong_distance_is_graded_and_diagnosed():
    round_, _ = _fill(_round(rolls=[6, 8, 7, 0, 0, 0, 0, 0, 0], level=3))
    round_, _ = _play(round_, {"type": "sum", "answer": 687})
    result = evaluate_move(round_, {"type": "distance", "answer": 413})
    assert (result.correct, result.misconception) == (False, "borrow_across_zero_failure")
    state = visible_state(result.round)
    assert (state["step"], state["my_distance"]) == ("pass", 313)


def test_a_sum_over_the_bank_skips_the_distance_question():
    round_, _ = _fill(_round(rolls=[6, 6, 6, 5, 5, 5, 1, 1, 1]))
    result = evaluate_move(round_, {"type": "sum", "answer": 1332})
    state = visible_state(result.round)
    assert result.correct
    assert (state["step"], state["broke"], state["my_total"]) == ("pass", True, 1332)


def test_robos_turn_shows_its_result_and_the_winner():
    round_, _ = _fill(_round())
    round_, results = _play(round_, {"type": "sum", "answer": 984}, {"type": "distance", "answer": 16}, {"type": "robo_turn"})
    assert not results[-1].counted
    state = visible_state(round_)
    robo_total = sum(state["robo_numbers"])
    assert state["step"] == "over"
    assert state["robo_total"] == robo_total
    assert state["robo_distance"] == (1000 - robo_total if robo_total <= 1000 else None)
    assert state["winner"] in ("mine", "robo", "same")


@pytest.mark.parametrize(
    "my_board, robo_board, winner",
    [
        ([4, 5, 6, 3, 6, 5, 1, 6, 3], [1, 1, 1, 1, 1, 1, 1, 1, 1], "mine"),  # 984 beats 333
        ([1, 1, 1, 1, 1, 1, 1, 1, 1], [4, 5, 6, 3, 6, 5, 1, 6, 3], "robo"),
        ([6, 6, 6, 5, 5, 5, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1], "robo"),  # 1332 broke the bank
        ([6, 6, 6, 5, 5, 5, 1, 1, 1], [6, 6, 6, 5, 5, 5, 1, 1, 1], "nobody"),
        ([1, 1, 1, 2, 2, 2, 3, 3, 3], [3, 3, 3, 2, 2, 2, 1, 1, 1], "same"),
        ([3, 3, 3, 3, 3, 3, 3, 3, 4], [1, 1, 1, 1, 1, 1, 1, 1, 1], "mine"),  # exactly 1000 is allowed
    ],
)
def test_the_winner_is_closest_without_going_over(my_board, robo_board, winner):
    state = visible_state(_round(my_board=my_board, robo_board=robo_board, step="over"))
    assert state["winner"] == winner


def test_robo_puts_a_small_first_roll_in_the_hundreds_and_a_big_one_lower():
    config = LEVELS[2]
    assert robo_spot([None] * 9, 1, config) % 3 == 0
    assert robo_spot([None] * 9, 6, config) % 3 != 0


@pytest.mark.parametrize("level", [2, 3])
def test_looking_ahead_robo_never_puts_the_biggest_first_roll_in_the_hundreds_and_repeats_itself(level):
    config = LEVELS[level]
    assert lookahead_spot([None] * 9, config.highest, config) % 3 != 0
    assert lookahead_spot([None] * 9, config.lowest + 1, config) % 3 == 0
    board = [2, None, None, None, 5, None, None, None, None]
    assert lookahead_spot(board, 3, config) == lookahead_spot(list(board), 3, config)


def test_level_1_robo_uses_the_aim_rule_and_levels_2_and_3_look_ahead():
    assert [config.looks_ahead for config in LEVELS.values()] == [False, True, True]


def test_robo_is_deterministic():
    round_, _ = _fill(_round())
    again, _ = _fill(_round())
    assert round_.robo_board == again.robo_board


@pytest.mark.parametrize(
    "round_, move",
    [
        (_round(), {"type": "sum", "answer": 10}),
        (_round(), {"type": "place", "spot": 9}),
        (_round(), {"type": "place", "spot": "0"}),
        (_round(my_board=[4] + [None] * 8), {"type": "place", "spot": 0}),
        (_round(), {"type": "robo_turn"}),
        (_round(), {"type": "cheat"}),
        (_round(step="sum", my_board=ROLLS), {"type": "sum", "answer": -1}),
        (_round(step="sum", my_board=ROLLS), {"type": "sum", "answer": 1_000_000}),
        (_round(step="sum", my_board=ROLLS), {"type": "sum", "answer": "984"}),
        (_round(step="sum", my_board=ROLLS), {"type": "distance", "answer": 16}),
    ],
)
def test_a_move_at_the_wrong_step_or_with_a_bad_value_is_rejected(round_, move):
    with pytest.raises(ValueError):
        evaluate_move(round_, move)
