"""The student's answer move, Robo's cutoff-based answer, and what the student may see."""

import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import MULTIPLICATION_POOLS, Fact, Round


def _multiply(left: int, right: int) -> Fact:
    return Fact(operation="multiply", left=left, right=right)


def _divide(dividend: int, divisor: int) -> Fact:
    return Fact(operation="divide", left=dividend, right=divisor)


def _round(level: int = 2, fact: Fact | None = None, robo_fact: Fact | None = None, answer=None) -> Round:
    return Round(
        level=level,
        fact=fact or _multiply(6, 7),
        robo_fact=robo_fact or _multiply(3, 4),
        answer=answer,
    )


def test_a_correct_answer_is_correct_and_recorded():
    result = evaluate_move(_round(), {"answer": 42})
    assert result.correct and result.misconception is None
    assert result.round.answer == 42
    assert result.counted


def test_a_wrong_product_is_diagnosed():
    result = evaluate_move(_round(), {"answer": 48})
    assert not result.correct
    assert result.misconception == "neighboring_fact"


def test_a_wrong_quotient_is_diagnosed():
    result = evaluate_move(_round(level=3, fact=_divide(56, 8)), {"answer": 6})
    assert not result.correct
    assert result.misconception == "one_group_off"


def test_an_unrecognized_wrong_answer_has_no_misconception():
    result = evaluate_move(_round(), {"answer": 43})
    assert not result.correct and result.misconception is None


def test_a_fact_can_only_be_answered_once():
    with pytest.raises(ValueError):
        evaluate_move(_round(answer=42), {"answer": 42})


@pytest.mark.parametrize("answer", ["42", 4.2, True, -1, 101, None])
def test_an_answer_must_be_a_whole_number_from_0_to_100(answer):
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"answer": answer})


def test_robo_waits_until_the_student_has_answered():
    round = _round()
    assert computer_move(round, 2) == round


def test_robo_answers_only_once():
    round = _round(answer=42).model_copy(update={"robo_answer": 11})
    assert computer_move(round, 2) == round


def test_robo_answers_a_fact_at_the_level_one_cutoff_correctly():
    after = computer_move(_round(level=1, robo_fact=_multiply(2, 6), answer=1), 1)
    assert after.robo_answer == 12


def test_robo_misses_a_fact_above_the_level_one_cutoff_with_one_group_too_few():
    after = computer_move(_round(level=1, robo_fact=_multiply(5, 3), answer=1), 1)
    assert after.robo_answer == 10


def test_robo_misses_a_division_fact_above_the_level_three_cutoff_by_one():
    after = computer_move(_round(level=3, robo_fact=_divide(63, 7), answer=1), 3)
    assert after.robo_answer == 8


def _robo_share_correct(level: int, facts: list[Fact]) -> float:
    right = 0
    for fact in facts:
        robo_answer = computer_move(_round(level=level, robo_fact=fact, answer=0), level).robo_answer
        assert robo_answer is not None and robo_answer >= 0
        right += robo_answer == fact.correct_answer
    return right / len(facts)


def test_robo_is_right_on_70_80_and_91_percent_of_each_levels_facts():
    def multiplication(level):
        return [_multiply(a, b) for a, b in MULTIPLICATION_POOLS[level]]

    division = [_divide(divisor * quotient, divisor) for divisor in range(1, 10) for quotient in range(1, 10)]
    assert round(100 * _robo_share_correct(1, multiplication(1))) == 70
    assert round(100 * _robo_share_correct(2, multiplication(2))) == 80
    level_three = 2 / 3 * _robo_share_correct(3, multiplication(3)) + 1 / 3 * _robo_share_correct(3, division)
    assert round(100 * level_three) == 91


def test_before_answering_the_student_sees_only_their_own_fact():
    state = visible_state(_round())
    assert state["fact"] == {"operation": "multiply", "left": 6, "right": 7}
    assert state["answer"] is None
    assert state["correct_answer"] is None
    assert state["robo_fact"] is None and state["robo_answer"] is None


def test_after_robos_turn_the_student_sees_both_facts_and_answers():
    after = computer_move(evaluate_move(_round(), {"answer": 48}).round, 2)
    state = visible_state(after)
    assert state["answer"] == 48 and state["correct_answer"] == 42
    assert state["robo_fact"] == {"operation": "multiply", "left": 3, "right": 4}
    assert state["robo_answer"] == 12 and state["robo_correct_answer"] == 12
