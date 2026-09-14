"""Hand-worked wrong picks, mostly the comparisons from Steinle & Stacey (1998, 2001) written as 0.x.

Each side's number is the digits after "0.", so "45" is 0.45.
"""

from .misconceptions import correct_pick, diagnose


def test_correct_pick_is_the_larger_number_or_same_when_equal():
    assert correct_pick("8", "45") == "mine"
    assert correct_pick("736", "8") == "robo"
    assert correct_pick("4", "40") == "same"


def test_a_correct_pick_has_no_misconception():
    assert diagnose("8", "45", "mine") is None
    assert diagnose("4", "40", "same") is None


def test_picking_the_longer_number_when_it_is_smaller_is_longer_is_larger():
    assert diagnose("45", "8", "mine") == "longer_is_larger"
    assert diagnose("3", "03", "robo") == "longer_is_larger"


def test_picking_the_longer_of_two_equal_numbers_is_longer_is_larger():
    assert diagnose("4", "40", "robo") == "longer_is_larger"


def test_picking_the_shorter_number_when_it_is_smaller_is_shorter_is_larger():
    assert diagnose("8", "85", "mine") == "shorter_is_larger"
    assert diagnose("736", "62", "robo") == "shorter_is_larger"


def test_picking_the_shorter_of_two_equal_numbers_is_shorter_is_larger():
    assert diagnose("4", "40", "mine") == "shorter_is_larger"


def test_picking_the_smaller_of_two_same_length_numbers_is_reciprocal_thinking():
    assert diagnose("3", "4", "mine") == "reciprocal_thinking"
    assert diagnose("42", "35", "robo") == "reciprocal_thinking"


def test_picking_one_of_two_identical_numbers_is_not_diagnosed():
    assert diagnose("4", "4", "mine") is None


def test_same_for_numbers_that_differ_only_by_zeros_after_the_point_is_ignores_zero():
    assert diagnose("3", "03", "same") == "ignores_zero"
    assert diagnose("045", "45", "same") == "ignores_zero"


def test_same_for_an_interspersed_zero_is_not_diagnosed():
    assert diagnose("45", "405", "same") is None


def test_same_for_numbers_with_different_digits_is_not_diagnosed():
    assert diagnose("45", "8", "same") is None
