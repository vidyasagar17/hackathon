import re

import pytest

from .misconceptions import answer_choices, correct_answer, diagnose
from .sentences import specific_hint


def test_one_more_than_the_second_card_counts_on_from_the_larger_card():
    assert specific_hint(3, 4, "add", "one_more_than_second") == "Start at 4 and count on 3 more: 5, 6, 7."


def test_counted_on_from_start_says_the_first_number_to_say():
    assert specific_hint(3, 4, "add", "counted_on_from_start") == (
        "When you count on from 4, the first number you say is 5: 5, 6, 7."
    )


def test_subtracted_instead_puts_the_cards_together():
    assert specific_hint(3, 4, "add", "subtracted_instead") == "Put the cards together: 3 and 4 make 7."


def test_counted_down_off_by_one_counts_back_from_the_larger_card_in_either_order():
    expected = "Start at 8 and count back 3: 7, 6, 5."
    assert specific_hint(8, 3, "take_away", "counted_down_off_by_one") == expected
    assert specific_hint(3, 8, "take_away", "counted_down_off_by_one") == expected


def test_added_instead_takes_the_smaller_card_away():
    assert specific_hint(3, 8, "take_away", "added_instead") == (
        "Take the smaller card away from the bigger one: 8 take away 3 is 5."
    )


def test_a_zero_card_says_it_adds_or_takes_away_nothing():
    assert specific_hint(0, 4, "add", "one_more_than_second") == "Adding 0 adds nothing: 0 and 4 make 4."
    assert specific_hint(4, 0, "add", "counted_on_from_start") == "Adding 0 adds nothing: 4 and 0 make 4."
    assert specific_hint(7, 0, "take_away", "counted_down_off_by_one") == (
        "Taking away 0 takes nothing away: 7 take away 0 is 7."
    )


@pytest.mark.parametrize("operation", ["add", "take_away"])
def test_every_diagnosed_card_gets_a_sentence_that_ends_at_the_right_total(operation):
    checked = 0
    for first in range(21):
        for second in range(21):
            correct = correct_answer(first, second, operation)
            for pick in answer_choices(first, second, operation):
                misconception = diagnose(first, second, operation, pick)
                if misconception is None:
                    continue
                sentence = specific_hint(first, second, operation, misconception)
                numbers = [int(number) for number in re.findall(r"\d+", sentence)]
                assert numbers[-1] == correct, sentence
                checked += 1
    assert checked > 500
