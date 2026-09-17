import random

import pytest

from .expressions import RULE, expression_text, work_out
from .rounds import CARD_RANGES, HAND_SIZE, fits_level, new_round, robo_way, ways

DEALS_PER_LEVEL = 60


def _texts(cards):
    return [expression_text(way) for way in ways(cards)]


def test_ways_are_written_with_only_needed_parentheses_simplest_first():
    texts = _texts([3, 5, 3, 1])
    assert texts[0] == "(3 + 5) × 3 × 1"
    assert "(5 + 3) × 3 × 1" in texts
    assert all(text.count("(") >= 1 for text in texts)


def test_a_plain_way_comes_before_one_with_parentheses_or_division():
    texts = _texts([4, 6, 1, 1])
    assert texts[0].count("(") == 0 and "÷" not in texts[0]


def test_a_hand_that_needs_fractions_has_no_whole_step_way():
    # 8 ÷ (3 − 8 ÷ 3) = 24 goes through 8/3.
    assert ways([3, 3, 8, 8]) == []


def test_every_way_makes_24_by_the_rule_with_whole_steps_at_least_0():
    random.seed(7)
    for _ in range(40):
        cards = [random.randint(1, 10) for _ in range(HAND_SIZE)]
        for way in ways(cards):
            worked = work_out(way, RULE)
            assert worked.value == 24
            assert all(step.result.denominator == 1 and step.result >= 0 for step in worked.steps)
            assert sorted(token for token in way if type(token) is int) == sorted(cards)


@pytest.mark.parametrize("level", [1, 2, 3])
def test_dealt_hands_fit_their_level_and_card_range(level):
    random.seed(level)
    for _ in range(DEALS_PER_LEVEL):
        round_ = new_round(level)
        assert round_.level == level
        assert len(round_.cards) == len(round_.robo_cards) == HAND_SIZE
        assert set(round_.cards + round_.robo_cards) <= set(CARD_RANGES[level])
        hand_ways = ways(round_.cards)
        assert fits_level(hand_ways, level)
        assert ways(round_.robo_cards)


def test_level_1_hands_can_be_made_with_no_parentheses_and_no_division():
    assert fits_level(ways([4, 6, 1, 1]), 1)
    assert not fits_level(ways([3, 5, 3, 1]), 1)


def test_level_2_hands_need_parentheses_but_not_division():
    assert fits_level(ways([3, 5, 3, 1]), 2)
    assert fits_level(ways([1, 1, 2, 7]), 2)
    assert not fits_level(ways([4, 6, 1, 1]), 2)


def test_level_3_hands_need_division():
    assert _texts([1, 2, 7, 7]) == ["(7 × 7 − 1) ÷ 2"]
    assert fits_level(ways([1, 2, 7, 7]), 3)
    assert not fits_level(ways([3, 5, 3, 1]), 3)


def test_robo_finds_more_kinds_of_way_at_higher_levels():
    needs_one_pair = ways([3, 5, 3, 1])
    assert robo_way(needs_one_pair, 1) is None
    assert expression_text(robo_way(needs_one_pair, 2)) == "(3 + 5) × 3 × 1"
    needs_division = ways([1, 2, 7, 7])
    assert robo_way(needs_division, 2) is None
    assert expression_text(robo_way(needs_division, 3)) == "(7 × 7 − 1) ÷ 2"
    assert _texts([1, 1, 2, 7]) == ["(1 + 2) × (1 + 7)", "(1 + 7) × (1 + 2)"]
    assert robo_way(ways([1, 1, 2, 7]), 3) is None
    assert robo_way([], 3) is None
