from collections import Counter

import pytest

from .misconceptions import Card, diagnose_fit, same_value
from .rounds import (
    COPIES,
    LEVEL_BASES,
    MISTAKE_CARDS_PER_SET,
    SETS_PER_HAND,
    SPOONS_TO_WIN,
    deal_hand,
    new_round,
)
from .rounds import _mistake_cards as _build_mistake_cards

DEALS = 300
LEVELS = [1, 2, 3]


def _all_cards(hand):
    return hand.my_cards + hand.robo_cards + hand.pile


def _is_set_card(hand, card):
    return any(same_value(card, value) for value in hand.sets)


def _mistake_cards(hand):
    return [card for card in _all_cards(hand) if not _is_set_card(hand, card)]


def _faces_of(hand, value):
    return Counter((card.top, card.bottom) for card in _all_cards(hand) if same_value(card, value))


def test_a_new_round_deals_every_hand_a_game_can_need_and_saves_a_seed():
    round_ = new_round(2)
    assert round_.level == 2
    assert (round_.hand_number, round_.my_spoons, round_.robo_spoons, round_.step) == (1, 0, 0, "collect")
    assert len(round_.hands) == 2 * SPOONS_TO_WIN - 1 == 5
    for hand in round_.hands:
        assert len(_all_cards(hand)) == 33
        assert hand.trash == [] and hand.collecting is None and hand.drawn is None
    assert type(round_.seed) is int


@pytest.mark.parametrize("level, total", [(1, 30), (2, 33), (3, 36)])
def test_every_hand_deals_two_copies_of_three_sets_plus_the_level_s_mistake_cards(level, total):
    for _ in range(DEALS):
        hand = deal_hand(level)
        assert len(hand.my_cards) == len(hand.robo_cards) == 4
        assert len(_all_cards(hand)) == total
        assert len(_mistake_cards(hand)) == MISTAKE_CARDS_PER_SET[level] * SETS_PER_HAND
        assert len({(value.top, value.bottom) for value in hand.sets}) == SETS_PER_HAND
        for value in hand.sets:
            assert (value.top, value.bottom) in LEVEL_BASES[level]
            assert sum(_faces_of(hand, value).values()) == 4 * COPIES


@pytest.mark.parametrize("level", [1, 2])
def test_levels_1_and_2_build_each_set_from_multipliers_1_to_4(level):
    for _ in range(DEALS):
        hand = deal_hand(level)
        for value in hand.sets:
            expected = {(value.top * n, value.bottom * n): COPIES for n in range(1, 5)}
            assert _faces_of(hand, value) == expected


def test_level_3_sets_use_four_different_multipliers_and_the_first_reaches_hundredths():
    for _ in range(DEALS):
        hand = deal_hand(3)
        for index, value in enumerate(hand.sets):
            faces = _faces_of(hand, value)
            assert len(faces) == 4 and set(faces.values()) == {COPIES}
            multipliers = {bottom // value.bottom for _, bottom in faces}
            if index == 0:
                assert 100 in {bottom for _, bottom in faces}
                multipliers.discard(100 // value.bottom)
                assert len(multipliers) == 3
            assert multipliers <= set(range(1, 7))


@pytest.mark.parametrize("level", LEVELS)
def test_my_starting_hand_is_set_cards_but_never_a_finished_set(level):
    for _ in range(DEALS):
        hand = deal_hand(level)
        assert all(_is_set_card(hand, card) for card in hand.my_cards)
        assert not all(same_value(hand.my_cards[0], card) for card in hand.my_cards)


@pytest.mark.parametrize("level", LEVELS)
def test_mistake_cards_are_built_from_my_starting_cards_with_the_level_s_mistakes(level):
    one_part_seen = False
    for _ in range(DEALS):
        hand = deal_hand(level)
        for card in _mistake_cards(hand):
            mistakes = {diagnose_fit(face, card, said_fits=True) for face in hand.my_cards} - {None}
            if level == 1:
                assert "same_difference_means_equal" in mistakes
            else:
                assert mistakes
                one_part_seen = one_part_seen or "changed_only_top_or_bottom" in mistakes
    assert one_part_seen == (level > 1)


def test_a_hand_whose_doubled_cards_are_all_in_play_still_gets_mistake_cards():
    sets = [Card(top=1, bottom=3), Card(top=2, bottom=3), Card(top=1, bottom=6)]
    my_cards = [Card(top=1, bottom=3), Card(top=2, bottom=6), Card(top=2, bottom=3), Card(top=4, bottom=6)]
    mistakes = _build_mistake_cards(2, my_cards, sets)
    assert len(mistakes) == MISTAKE_CARDS_PER_SET[2] * SETS_PER_HAND
    assert not any(same_value(card, value) for card in mistakes for value in sets)


@pytest.mark.parametrize("level", LEVELS)
def test_mistake_cards_never_have_a_bottom_over_100(level):
    for _ in range(DEALS):
        hand = deal_hand(level)
        assert all(card.bottom <= 100 for card in _mistake_cards(hand))


def test_a_hundredths_hand_whose_nearest_mistake_cards_are_in_play_still_gets_mistake_cards():
    sets = [Card(top=1, bottom=2), Card(top=1, bottom=3), Card(top=3, bottom=5)]
    my_cards = [Card(top=50, bottom=100), Card(top=50, bottom=100), Card(top=1, bottom=3), Card(top=1, bottom=3)]
    mistakes = _build_mistake_cards(3, my_cards, sets)
    assert len(mistakes) == MISTAKE_CARDS_PER_SET[3] * SETS_PER_HAND
    assert all(card.bottom <= 100 for card in mistakes)
    assert not any(same_value(card, value) for card in mistakes for value in sets)


@pytest.mark.parametrize("level, counts, fillers", [(1, [1, 1, 1], 1), (2, [1, 1, 2], 0), (3, [2, 2], 0)])
def test_robo_starts_with_its_level_s_head_start_and_leads_with_its_value(level, counts, fillers):
    for _ in range(DEALS):
        hand = deal_hand(level)
        held = [sum(same_value(card, value) for card in hand.robo_cards) for value in hand.sets]
        assert sorted(count for count in held if count) == counts
        assert sum(not _is_set_card(hand, card) for card in hand.robo_cards) == fillers
        assert _is_set_card(hand, hand.robo_cards[0])
        assert sum(same_value(card, hand.robo_cards[0]) for card in hand.robo_cards) == max(held)
