"""Each game and level deals cards in its standard's range; checked over many random deals."""

import random

import pytest

from .misconceptions import correct_answer
from .rounds import new_round

DEALS = 400


def _deals(operation, level):
    return [new_round(operation, level) for _ in range(DEALS)]


def _cards(round):
    return [*round.mine, *round.robo]


@pytest.mark.parametrize("operation", ["add", "take_away"])
def test_a_new_round_stores_its_game_and_level_and_has_no_picks_yet(operation):
    round = new_round(operation, 2)

    assert (round.operation, round.level) == (operation, 2)
    assert len(round.mine) == len(round.robo) == 2
    assert round.answer_pick is None and round.winner_pick is None


@pytest.mark.parametrize("operation", ["add", "take_away"])
def test_level_one_deals_cards_zero_to_five_including_zero(operation):
    cards = [card for round in _deals(operation, 1) for card in _cards(round)]

    assert set(cards) == set(range(6))


def test_addition_level_two_deals_cards_to_ten_with_sums_within_ten():
    rounds = _deals("add", 2)

    assert max(card for round in rounds for card in _cards(round)) == 10
    assert all(sum(hand) <= 10 for round in rounds for hand in (round.mine, round.robo))


def test_addition_level_three_deals_cards_to_ten_with_sums_past_ten():
    rounds = _deals("add", 3)

    assert set(card for round in rounds for card in _cards(round)) == set(range(11))
    assert any(sum(round.mine) > 10 for round in rounds)


def test_take_away_level_two_deals_cards_zero_to_ten():
    cards = [card for round in _deals("take_away", 2) for card in _cards(round)]

    assert set(cards) == set(range(11))


def test_take_away_level_three_deals_one_teen_card_and_one_card_to_ten_in_either_order():
    rounds = _deals("take_away", 3)

    for round in rounds:
        for hand in (round.mine, round.robo):
            assert sorted(11 <= card <= 20 for card in hand) == [False, True]
            assert all(0 <= card <= 20 for card in hand)
    assert any(round.mine[0] >= 11 for round in rounds)
    assert any(round.mine[1] >= 11 for round in rounds)


@pytest.mark.parametrize("operation", ["add", "take_away"])
def test_equal_hands_are_dealt_sometimes(operation):
    rounds = _deals(operation, 1)

    assert any(correct_answer(*round.mine, operation) == correct_answer(*round.robo, operation) for round in rounds)


def test_the_same_seed_deals_the_same_round():
    random.seed(11)
    first = new_round("add", 3)
    random.seed(11)

    assert new_round("add", 3) == first
