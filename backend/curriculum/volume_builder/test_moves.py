import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import LEVEL_BOXES, Round, new_round


def _round(**changes):
    return Round(level=1, box=(4, 3, 2), robo_box=(2, 3, 4)).model_copy(update=changes)


def test_a_new_turn_shows_the_box_and_asks_for_the_count():
    state = visible_state(_round())
    assert state["step"] == "count"
    assert state["box"] == [4, 3, 2]
    assert state["volume"] is None
    assert state["robo"] is None


def test_a_right_count_is_graded_and_moves_on_to_build():
    result = evaluate_move(_round(), {"type": "count", "answer": 24})
    assert result.correct and result.misconception is None and result.counted
    state = visible_state(result.round)
    assert state["step"] == "build"
    assert state["count"] == 24 and state["volume"] == 24


def test_a_wrong_count_is_diagnosed_and_still_moves_on():
    result = evaluate_move(_round(), {"type": "count", "answer": 26})
    assert not result.correct
    assert result.misconception == "counted_visible_faces"
    assert result.round.last_graded == "count"
    assert visible_state(result.round)["step"] == "build"


@pytest.mark.parametrize("answer", ["24", 24.0, True, -1, 1000, None])
def test_a_count_must_be_a_whole_number_from_0_to_999(answer):
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "count", "answer": answer})


def test_a_right_build_holds_the_same_cubes():
    result = evaluate_move(_round(count=24), {"type": "build", "box": [1, 4, 6]})
    assert result.correct and result.misconception is None
    state = visible_state(result.round)
    assert state["step"] == "done"
    assert state["built"] == [1, 4, 6] and state["built_volume"] == 24


def test_a_wrong_build_is_diagnosed_the_other_way():
    result = evaluate_move(_round(count=24), {"type": "build", "box": [2, 2, 5]})
    assert not result.correct
    assert result.misconception == "counted_visible_faces"
    assert result.round.last_graded == "build"
    assert visible_state(result.round)["built_volume"] == 20


@pytest.mark.parametrize("box", [[2, 3, 4], [4, 3, 2], [0, 4, 6], [1, 4, 11], [1, 4], "146", [1, 4, 6.0], [True, 4, 6]])
def test_a_build_must_be_a_different_box_with_edges_1_to_10(box):
    with pytest.raises(ValueError):
        evaluate_move(_round(count=24), {"type": "build", "box": box})


def test_moves_must_come_in_order():
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "build", "box": [1, 4, 6]})
    with pytest.raises(ValueError):
        evaluate_move(_round(count=24), {"type": "count", "answer": 24})
    with pytest.raises(ValueError):
        evaluate_move(_round(count=24, built=(1, 4, 6)), {"type": "build", "box": [1, 4, 6]})
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "shout"})


def test_robo_plays_only_after_the_student_builds():
    assert computer_move(_round(), 1) == _round()
    assert computer_move(_round(count=24), 1) == _round(count=24)
    played = computer_move(_round(count=24, built=(1, 4, 6)), 1)
    assert played.robo_played and played.robo_built == (2, 6, 2)
    robo = visible_state(played)["robo"]
    assert robo == {"box": [2, 3, 4], "layer": 6, "layers": 4, "volume": 24, "built": [2, 6, 2]}
    assert computer_move(played, 1) == played


def test_robo_says_so_when_it_finds_no_box():
    played = computer_move(Round(level=1, box=(4, 3, 2), robo_box=(2, 2, 4), count=24, built=(1, 4, 6)), 1)
    assert played.robo_played and played.robo_built is None
    assert visible_state(played)["robo"]["built"] is None


def test_whole_turns_at_every_level_finish():
    for level in (1, 2, 3):
        for _ in range(100):
            round = new_round(level)
            round = evaluate_move(round, {"type": "count", "answer": 7}).round
            other = next(box for box in LEVEL_BOXES[3] + [(1, 1, 1)] if sorted(box) != sorted(round.box))
            round = evaluate_move(round, {"type": "build", "box": list(other)}).round
            round = computer_move(round, level)
            assert visible_state(round)["step"] == "done" and round.robo_played
