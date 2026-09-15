from .problems import ColumnBreakdown, Problem
from .sentences import specific_hint


def _problem(dividend: int, divisor: int) -> Problem:
    answer = dividend // divisor
    places = ["ones"] if answer < 10 else ["tens", "ones"]
    return Problem(
        dividend=dividend,
        divisor=divisor,
        answer=answer,
        columns=[ColumnBreakdown(place=p) for p in places],
        difficulty=1,
    )


def test_subtracted_instead_of_divided_restates_the_sign():
    assert specific_hint(_problem(84, 4), "subtracted_instead_of_divided") == (
        "84 ÷ 4 means sharing 84 into 4 equal groups, not taking 4 away from 84."
    )


def test_multiplied_instead_of_divided_restates_the_sign():
    assert specific_hint(_problem(84, 4), "multiplied_instead_of_divided") == (
        "84 ÷ 4 means sharing 84 into 4 equal groups, not 84 × 4."
    )


def test_only_used_first_digit_says_to_bring_down_the_ones():
    assert specific_hint(_problem(84, 4), "only_used_first_digit") == (
        "After you share the 8 tens into 4 groups, bring down the 4 ones and keep sharing."
    )


def test_only_used_first_digit_when_the_tens_digit_is_too_small():
    assert specific_hint(_problem(12, 3), "only_used_first_digit") == (
        "1 is smaller than 3, so you can't share the tens alone: share all of 12 at once."
    )


def test_no_regroup_shows_one_leftover_ten():
    assert specific_hint(_problem(78, 3), "no_regroup_in_division") == (
        "Sharing 7 tens into 3 groups leaves 1 ten left over. "
        "Put the leftover with the 8 ones to make 18 before you share again."
    )


def test_no_regroup_shows_several_leftover_tens():
    assert specific_hint(_problem(84, 3), "no_regroup_in_division") == (
        "Sharing 8 tens into 3 groups leaves 2 tens left over. "
        "Put the leftover with the 4 ones to make 24 before you share again."
    )


def test_no_regroup_when_the_tens_digit_is_too_small():
    assert specific_hint(_problem(15, 5), "no_regroup_in_division") == (
        "1 is smaller than 5, so put the 1 ten with the 5 ones to make 15, "
        "then share 15 into 5 groups."
    )


def test_reversed_quotient_digits_says_which_digit_comes_first():
    assert specific_hint(_problem(84, 4), "reversed_quotient_digits") == (
        "The first digit of your answer comes from sharing the 8 tens into 4 groups, "
        "so write that digit first."
    )


def test_reversed_quotient_digits_for_a_one_digit_answer():
    assert specific_hint(_problem(8, 2), "reversed_quotient_digits") == (
        "0 tens can't make a group of 2, so your answer has no tens digit: "
        "write its only digit in the ones place."
    )
