"""A For Keeps game deals four hands of four digit cards a player and starts at hand 1, step arrange."""

import random

from .rounds import new_round

DEALS = 400


def test_every_hand_deals_four_digit_cards_to_each_player():
    for level in (1, 2, 3):
        round = new_round(level)
        assert round.level == level
        assert len(round.hands) == 4
        for hand in round.hands:
            assert len(hand.my_cards) == 4 and len(hand.robo_cards) == 4
            assert all(0 <= card <= 9 for card in hand.my_cards + hand.robo_cards)


def test_deals_use_every_digit_from_zero_to_nine():
    cards = {card for _ in range(DEALS) for hand in new_round(1).hands for card in hand.my_cards + hand.robo_cards}
    assert cards == set(range(10))


def test_the_same_seed_deals_the_same_game():
    random.seed(7)
    first = new_round(2)
    random.seed(7)
    assert new_round(2) == first


def test_a_new_game_starts_at_hand_one_step_arrange_with_nothing_played():
    round = new_round(1)
    assert round.hand_number == 1
    assert round.step == "arrange"
    for hand in round.hands:
        assert hand.my_numbers is None and hand.robo_numbers is None
        assert hand.my_answer is None
        assert hand.my_kept is None and hand.robo_kept is None
