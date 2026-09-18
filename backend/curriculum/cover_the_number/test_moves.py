import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import BOARDS, Roll, Round, new_round


def _round(level=1, mine=(5, 5, 2), robo=(5, 5, 5, 6), **update) -> Round:
    """Level 1 dice rolls; the rest of each list is 1s."""
    return Round(
        level=level,
        my_rolls=[Roll(values=[value]) for value in list(mine) + [1] * 27],
        robo_rolls=[Roll(values=[value]) for value in list(robo) + [1] * 26],
    ).model_copy(update=update)


def _play(round, *moves):
    results = []
    for move in moves:
        result = evaluate_move(round, move)
        round = computer_move(result.round, round.level)
        results.append(result)
    return round, results


def test_rolling_shows_the_roll_and_is_not_graded():
    result = evaluate_move(_round(), {"type": "roll"})
    assert not result.counted
    state = visible_state(result.round)
    assert (state["step"], state["my_roll"], state["board"]) == ("tap", {"values": [5], "dots": None}, [1, 2, 3, 4, 5, 6])
    assert state["right"] is None


def test_a_right_tap_covers_the_number():
    round, (_, tap) = _play(_round(), {"type": "roll"}, {"type": "tap", "number": 5})
    assert (tap.correct, tap.misconception, tap.counted) == (True, None, True)
    state = visible_state(round)
    assert (state["my_covered"], state["step"], state["result"], state["right"]) == ([5], "pass", "covered", 5)


def test_a_wrong_tap_is_diagnosed_and_covers_nothing():
    round, (_, tap) = _play(_round(), {"type": "roll"}, {"type": "tap", "number": 6})
    assert (tap.correct, tap.misconception) == (False, "counted_one_too_many")
    state = visible_state(round)
    assert (state["my_covered"], state["step"], state["result"], state["tapped"], state["right"]) == ([], "pass", "wrong", 6, 5)


def test_a_right_tap_on_a_covered_number_rolls_again_once_then_passes():
    round, _ = _play(_round(mine=(5, 5, 5), my_covered=[5]), {"type": "roll"}, {"type": "tap", "number": 5})
    state = visible_state(round)
    assert (state["step"], state["result"]) == ("roll_again", "already")
    round, (again, tap) = _play(round, {"type": "roll_again"}, {"type": "tap", "number": 5})
    assert not again.counted and tap.correct
    assert visible_state(round)["step"] == "pass" and visible_state(round)["result"] == "already"


@pytest.mark.parametrize("number", [0, 7, "5", True, None])
def test_a_tap_must_be_a_number_on_the_board(number):
    rolled = evaluate_move(_round(), {"type": "roll"}).round
    with pytest.raises(ValueError):
        evaluate_move(rolled, {"type": "tap", "number": number})


def test_moves_come_in_order():
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "tap", "number": 5})
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "robo_turn"})
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "roll_again"})


def test_robo_rolls_again_by_level_when_its_number_is_covered():
    base = dict(mine=(5,), robo=(5, 5, 6), robo_covered=[5])
    for level, covered, rolls in ((1, None, 1), (2, None, 2), (3, 6, 3)):
        round = _round(**base).model_copy(update={"level": level})
        round, _ = _play(round, {"type": "roll"}, {"type": "tap", "number": 5}, {"type": "robo_turn"})
        state = visible_state(round)
        assert state["robo_last"]["covered"] == covered and len(state["robo_last"]["rolls"]) == rolls
        assert (state["step"], state["turn"]) == ("roll", 2)


def test_covering_the_whole_board_wins_at_once():
    round, _ = _play(_round(mine=(6,), my_covered=[1, 2, 3, 4, 5]), {"type": "roll"}, {"type": "tap", "number": 6})
    state = visible_state(round)
    assert (state["step"], state["winner"]) == ("over", "mine")


def test_after_ten_turns_more_covered_wins():
    round = _round(mine=(2,), robo=(1,), turn=10, my_covered=[1], robo_covered=[1, 3])
    round, _ = _play(round, {"type": "roll"}, {"type": "tap", "number": 2}, {"type": "robo_turn"})
    state = visible_state(round)
    assert (state["step"], state["winner"]) == ("over", "same")


def test_level_2_shows_the_dots_and_level_3_the_two_dice():
    for level in (2, 3):
        round = evaluate_move(new_round(level), {"type": "roll"}).round
        state = visible_state(round)
        assert state["board"] == BOARDS[level]
        if level == 2:
            assert len(state["my_roll"]["dots"]) == state["my_roll"]["values"][0]
        else:
            assert len(state["my_roll"]["values"]) == 2


def test_whole_games_at_every_level_finish_within_ten_turns():
    for level in (1, 2, 3):
        for _ in range(100):
            round = new_round(level)
            while round.step != "over":
                if round.step == "roll":
                    round = evaluate_move(round, {"type": "roll"}).round
                elif round.step == "roll_again":
                    round = evaluate_move(round, {"type": "roll_again"}).round
                elif round.step == "tap":
                    round = evaluate_move(round, {"type": "tap", "number": sum(round.my_roll.values)}).round
                else:
                    round = computer_move(evaluate_move(round, {"type": "robo_turn"}).round, level)
            assert round.turn <= 10 and visible_state(round)["winner"] in ("mine", "robo", "same")
