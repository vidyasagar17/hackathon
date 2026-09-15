"""Each level deals only the facts it diagnoses; checked over many random deals."""

from .rounds import Fact, new_round

DEALS = 400
EASY = {0, 1, 2, 5}


def _facts(level: int) -> list[Fact]:
    facts = []
    for _ in range(DEALS):
        round = new_round(level)
        assert round.level == level
        facts += [round.fact, round.robo_fact]
    return facts


def test_a_fact_knows_its_correct_answer():
    assert Fact(operation="multiply", left=6, right=7).correct_answer == 42
    assert Fact(operation="divide", left=56, right=8).correct_answer == 7


def test_a_new_round_has_no_answers_yet():
    round = new_round(1)
    assert round.answer is None and round.robo_answer is None


def test_level_one_deals_multiplication_facts_with_a_0_1_2_or_5():
    for fact in _facts(1):
        assert fact.operation == "multiply"
        assert 0 <= fact.left <= 9 and 0 <= fact.right <= 9
        assert fact.left in EASY or fact.right in EASY


def test_level_two_deals_multiplication_facts_with_both_factors_3_to_9():
    for fact in _facts(2):
        assert fact.operation == "multiply"
        assert 3 <= fact.left <= 9 and 3 <= fact.right <= 9


def test_level_three_deals_any_multiplication_fact_and_division_facts():
    facts = _facts(3)
    assert {fact.operation for fact in facts} == {"multiply", "divide"}
    for fact in facts:
        if fact.operation == "multiply":
            assert 0 <= fact.left <= 9 and 0 <= fact.right <= 9
        else:
            assert 1 <= fact.right <= 9
            assert fact.left % fact.right == 0
            assert 1 <= fact.correct_answer <= 9


def test_level_three_calls_roughly_one_fact_in_three_as_division():
    facts = _facts(3)
    share = sum(fact.operation == "divide" for fact in facts) / len(facts)
    assert 0.25 < share < 0.42
