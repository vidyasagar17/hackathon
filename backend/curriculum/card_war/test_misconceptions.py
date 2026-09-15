import pytest

from .misconceptions import answer_choices, correct_answer, diagnose


def test_addition_offers_the_researched_mistakes_when_the_second_card_is_larger():
    assert answer_choices(3, 4, "add") == [1, 5, 6, 7]
    assert diagnose(3, 4, "add", 5) == "one_more_than_second"
    assert diagnose(3, 4, "add", 6) == "counted_on_from_start"
    assert diagnose(3, 4, "add", 1) == "subtracted_instead"
    assert diagnose(3, 4, "add", 7) is None


def test_one_more_than_the_second_card_is_only_a_mistake_when_the_second_card_is_larger():
    assert answer_choices(4, 3, "add") == [1, 6, 7, 8]
    assert diagnose(4, 3, "add", 5) is None
    assert diagnose(4, 3, "add", 8) is None


def test_one_more_than_the_second_card_wins_its_clash_with_counting_on():
    assert answer_choices(2, 4, "add") == [2, 5, 6, 7]
    assert diagnose(2, 4, "add", 5) == "one_more_than_second"


def test_a_mistake_that_equals_the_answer_is_replaced_by_a_filler():
    assert answer_choices(1, 4, "add") == [3, 4, 5, 6]
    assert answer_choices(0, 4, "add") == [3, 4, 5, 6]
    assert diagnose(0, 4, "add", 5) == "one_more_than_second"
    assert diagnose(0, 4, "add", 6) is None


def test_take_away_subtracts_the_smaller_card_from_the_larger_in_either_order():
    assert correct_answer(8, 3, "take_away") == correct_answer(3, 8, "take_away") == 5
    assert answer_choices(8, 3, "take_away") == answer_choices(3, 8, "take_away") == [4, 5, 6, 11]
    assert diagnose(3, 8, "take_away", 6) == "counted_down_off_by_one"
    assert diagnose(3, 8, "take_away", 4) == "counted_down_off_by_one"
    assert diagnose(3, 8, "take_away", 11) == "added_instead"


def test_take_away_never_offers_a_negative_card():
    assert answer_choices(5, 5, "take_away") == [0, 1, 2, 10]
    assert answer_choices(7, 0, "take_away") == [6, 7, 8, 9]
    assert answer_choices(0, 0, "add") == [0, 1, 2, 3]


@pytest.mark.parametrize("operation", ["add", "take_away"])
def test_every_card_pair_gets_four_different_cards_and_only_researched_mistakes_are_diagnosed(operation):
    for first in range(21):
        for second in range(21):
            choices = answer_choices(first, second, operation)
            correct = correct_answer(first, second, operation)
            assert len(choices) == len(set(choices)) == 4
            assert correct in choices and min(choices) >= 0
            assert diagnose(first, second, operation, correct) is None
            if operation == "add":
                researched = {first + second - 1, abs(first - second)}
                if second > first:
                    researched.add(second + 1)
            else:
                researched = {correct - 1, correct + 1, first + second}
            for pick in choices:
                if pick != correct:
                    assert (diagnose(first, second, operation, pick) is not None) == (pick in researched)
