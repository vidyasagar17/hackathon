import pytest

from .misconceptions import Equation
from .moves import computer_move, evaluate_move, visible_state
from .rounds import Round, Step, new_round


def _round(**changes):
    """Cards 9 5 3 1 8, target 16; Robo's cards 7 9 2 6 4 (Robo makes 16 with 7 + 9 at level 1)."""
    base = Round(
        level=1,
        cards=[9, 5, 3, 1, 8],
        robo_cards=[7, 9, 2, 6, 4],
        target=16,
        equation=Equation(left=[16], right=2),
    )
    return base.model_copy(update=changes)


def _play(round, *moves):
    results = []
    for move in moves:
        result = evaluate_move(round, move)
        round = computer_move(result.round, round.level)
        results.append(result)
    return round, results


def test_a_new_hand_shows_the_cards_and_target_but_not_robo_or_the_equation():
    state = visible_state(_round())
    assert (state["cards"], state["target"], state["top"]) == ([9, 5, 3, 1, 8], 16, 20)
    assert state["way"] == [] and state["total"] is None and state["steps"] == []
    assert state["robo"] is None and state["equation"] is None and not state["done"]


def test_starting_a_way_is_not_graded():
    result = evaluate_move(_round(), {"type": "start", "card": 0})
    assert result.correct and not result.counted
    state = visible_state(result.round)
    assert state["way"] == [0] and state["total"] == 9


def test_a_right_step_goes_on_and_reaching_the_target_makes_it():
    round, (_, first, second) = _play(
        _round(),
        {"type": "start", "card": 0},
        {"type": "step", "sign": "+", "card": 4, "answer": 17},
        {"type": "step", "sign": "-", "card": 3, "answer": 16},
    )
    assert first.correct and first.counted and second.correct
    state = visible_state(round)
    assert state["steps"] == [
        {"before": 9, "sign": "+", "card": 8, "answer": 17, "after": 17},
        {"before": 17, "sign": "-", "card": 1, "answer": 16, "after": 16},
    ]
    assert state["made"] and state["done"] and state["total"] == 16
    assert state["robo"] == {"cards": [7, 9, 2, 6, 4], "way": ["7 + 9 = 16"]}
    assert state["equation"] == {"left": [16], "right": 2}


def test_a_wrong_step_is_diagnosed_and_the_way_goes_on_from_the_right_total():
    round, (_, wrong) = _play(_round(), {"type": "start", "card": 0}, {"type": "step", "sign": "+", "card": 4, "answer": 16})
    assert not wrong.correct and wrong.misconception == "counted_on_from_start"
    assert round.last_graded == "step"
    state = visible_state(round)
    assert state["total"] == 17 and state["steps"][-1]["answer"] == 16 and not state["made"]


@pytest.mark.parametrize(
    "move",
    [
        {"type": "step", "sign": "+", "card": 0, "answer": 18},
        {"type": "step", "sign": "+", "card": 9, "answer": 18},
        {"type": "step", "sign": "x", "card": 1, "answer": 18},
        {"type": "step", "sign": "+", "card": 1, "answer": "14"},
        {"type": "step", "sign": "+", "card": True, "answer": 14},
        {"type": "step", "sign": "+", "card": 4, "answer": 17.0},
    ],
)
def test_a_step_needs_an_unused_card_a_sign_and_a_whole_answer(move):
    started = evaluate_move(_round(), {"type": "start", "card": 0}).round
    with pytest.raises(ValueError):
        evaluate_move(started, move)


def test_a_step_may_not_leave_the_level_range():
    started = evaluate_move(_round(), {"type": "start", "card": 2}).round
    with pytest.raises(ValueError):
        evaluate_move(started, {"type": "step", "sign": "-", "card": 0, "answer": 0})
    high = evaluate_move(_round(), {"type": "start", "card": 0}).round
    high = evaluate_move(high, {"type": "step", "sign": "+", "card": 4, "answer": 17}).round
    with pytest.raises(ValueError):
        evaluate_move(high, {"type": "step", "sign": "+", "card": 1, "answer": 22})


def test_a_step_before_starting_is_refused():
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "step", "sign": "+", "card": 1, "answer": 14})


def test_start_over_puts_the_cards_back_and_keeps_the_graded_steps():
    round, _ = _play(_round(), {"type": "start", "card": 0}, {"type": "step", "sign": "+", "card": 1, "answer": 14})
    result = evaluate_move(round, {"type": "start_over"})
    assert not result.counted
    state = visible_state(result.round)
    assert state["way"] == [] and state["total"] is None and state["steps"] == []
    assert result.round.steps == [Step(before=9, sign="+", card=5, answer=14)]


def test_a_dead_end_is_reported():
    round, _ = _play(
        _round(cards=[9, 5], target=16),
        {"type": "start", "card": 0},
        {"type": "step", "sign": "+", "card": 1, "answer": 14},
    )
    assert visible_state(round)["stuck"]


def test_show_me_a_way_ends_the_hand_without_the_point():
    result = evaluate_move(_round(), {"type": "show_way"})
    assert not result.counted
    round = computer_move(result.round, 1)
    state = visible_state(round)
    assert state["done"] and not state["made"]
    assert state["shown_way"] == ["9 − 1 = 8", "8 + 8 = 16"]
    with pytest.raises(ValueError):
        evaluate_move(round, {"type": "start", "card": 0})


def test_the_equation_is_graded_once_after_the_hand():
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "equation", "answer": 14})
    done = computer_move(evaluate_move(_round(), {"type": "show_way"}).round, 1)
    result = evaluate_move(done, {"type": "equation", "answer": 18})
    assert not result.correct and result.misconception == "added_all_numbers"
    assert result.round.last_graded == "equation"
    state = visible_state(result.round)
    assert state["equation_answer"] == 18 and state["equation_value"] == 14
    with pytest.raises(ValueError):
        evaluate_move(result.round, {"type": "equation", "answer": 14})


def test_robo_says_so_when_it_finds_no_way_with_its_cards():
    round = computer_move(evaluate_move(_round(robo_cards=[1, 2, 3, 10, 5]), {"type": "show_way"}).round, 1)
    assert visible_state(round)["robo"] == {"cards": [1, 2, 3, 10, 5], "way": None}


def test_whole_hands_at_every_level_finish():
    for level in (1, 2, 3):
        for _ in range(40):
            round = new_round(level)
            round = computer_move(evaluate_move(round, {"type": "show_way"}).round, level)
            round = evaluate_move(round, {"type": "equation", "answer": 1}).round
            state = visible_state(round)
            assert state["done"] and state["robo"] and state["equation_value"] is not None
