import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import ROBO_KNOWS, Round, new_round


def _round(**update):
    return Round(level=3, kind="read", time=(2, 50), robo_kind="set", robo_time=(7, 45), robo_knows=True).model_copy(update=update)


def test_a_clock_to_read_hides_the_time_until_picked():
    state = visible_state(_round())
    assert state["time"] is None and state["clock"] == [2 * 60 + 50, 50]
    assert state["choices"] == [[2, 10], [2, 50], [3, 50], [10, 15]]
    assert state["pick"] is None and state["right"] is None and state["robo"] is None


def test_a_wrong_reading_is_diagnosed_and_shows_the_right_card_and_robo():
    result = evaluate_move(_round(), {"type": "pick", "choice": 2})
    assert (result.correct, result.misconception, result.counted) == (False, "read_the_next_hour", True)
    state = visible_state(computer_move(result.round, 3))
    assert (state["pick"], state["right"], state["time"]) == (2, 1, [2, 50])
    assert state["robo"] == {"kind": "set", "time": [7, 45], "clock": [465, 45], "knows": True}


def test_a_time_to_set_shows_the_time_and_four_clocks():
    round = _round(kind="set")
    state = visible_state(round)
    assert state["time"] == [2, 50] and state["clock"] is None
    assert [170, 50] in state["choices"]
    wrong = state["choices"].index([120, 50])
    assert evaluate_move(round, {"type": "pick", "choice": wrong}).misconception == "hour_hand_on_the_numeral"


@pytest.mark.parametrize("move", [{"type": "pick", "choice": 4}, {"type": "pick", "choice": "1"}, {"type": "pick", "choice": True}, {"type": "guess"}])
def test_bad_picks_are_refused(move):
    with pytest.raises(ValueError):
        evaluate_move(_round(), move)


def test_a_card_is_answered_once_and_robo_plays_only_after():
    assert computer_move(_round(), 3) == _round()
    picked = evaluate_move(_round(), {"type": "pick", "choice": 0}).round
    with pytest.raises(ValueError):
        evaluate_move(picked, {"type": "pick", "choice": 0})


def test_dealt_turns_fit_the_level_and_robo_knows_more_at_higher_levels():
    for level in (1, 2, 3):
        rounds = [new_round(level) for _ in range(2000)]
        assert {round.kind for round in rounds} == {"read", "set"}
        known = sum(round.robo_knows for round in rounds) / len(rounds)
        assert abs(known - ROBO_KNOWS[level]) < 0.05
        for round in rounds[:200]:
            state = visible_state(evaluate_move(round, {"type": "pick", "choice": 0}).round)
            assert len(state["choices"]) == 4
