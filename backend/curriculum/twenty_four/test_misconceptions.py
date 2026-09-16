"""Hand-worked checks: each comment works the expression out by the rule and by the mistake."""

import pytest

from .misconceptions import diagnose_check, makes_24


@pytest.mark.parametrize(
    "tokens",
    [
        [3, "*", 8, "*", 1, "*", 1],
        ["(", 3, "+", 5, ")", "*", 3],
        [8, "/", 3, "*", 9],
        [2, "*", "(", 1, "+", "(", 3, "+", 8, ")", ")"],
    ],
)
def test_a_way_to_24_by_the_rule_has_no_diagnosis(tokens):
    assert makes_24(tokens)
    assert diagnose_check(tokens) is None


def test_adding_first_without_parentheses_is_left_to_right():
    # Rule: 5 × 3 = 15, 15 × 1 = 15, 3 + 15 = 18. Left to right: 3 + 5 = 8, 8 × 3 = 24, 24 × 1 = 24.
    assert diagnose_check([3, "+", 5, "*", 3, "*", 1]) == "left_to_right"
    # Rule: 1 × 6 = 6, 6 ÷ 2 = 3, 9 − 3 = 6. Left to right: 9 − 1 = 8, 8 × 6 = 48, 48 ÷ 2 = 24.
    assert diagnose_check([9, "-", 1, "*", 6, "/", 2]) == "left_to_right"


def test_left_to_right_inside_parentheses_is_still_left_to_right():
    # Rule: 2 × 4 = 8, 4 + 8 = 12, 1 × 12 = 12. Left to right: 4 + 2 = 6, 6 × 4 = 24, 1 × 24 = 24.
    assert diagnose_check([1, "*", "(", 4, "+", 2, "*", 4, ")"]) == "left_to_right"


def test_times_before_divide_is_pemdas_letter_order():
    # Rule: 6 × 8 = 48, 48 ÷ 1 = 48, 48 × 2 = 96. Letter order: 6 × 8 = 48, 1 × 2 = 2, 48 ÷ 2 = 24.
    # Left to right matches the rule here, so only letter order explains it.
    assert diagnose_check([6, "*", 8, "/", 1, "*", 2]) == "pemdas_letter_order"


def test_plus_before_minus_is_pemdas_letter_order():
    # Rule: 7 × 4 = 28, 28 − 3 = 25, 25 + 1 = 26. Letter order: 7 × 4 = 28, 3 + 1 = 4, 28 − 4 = 24.
    assert diagnose_check([7, "*", 4, "-", 3, "+", 1]) == "pemdas_letter_order"


def test_a_wrong_expression_no_mistaken_order_explains_is_undiagnosed():
    # 3 + 5 + 3 + 1 = 12 in every order.
    assert diagnose_check([3, "+", 5, "+", 3, "+", 1]) is None
    # Rule: 8 ÷ 2 = 4, 4 × 4 = 16, 16 × 3 = 48. Letter order: 2 × 4 = 8, 8 × 3 = 24, 8 ÷ 24 = 1/3.
    # Left to right matches the rule. Neither mistake makes 24.
    assert diagnose_check([8, "/", 2, "*", 4, "*", 3]) is None
    # A division by 0 makes nothing in any order.
    assert diagnose_check([8, "/", "(", 3, "-", 3, ")", "+", 1]) is None
