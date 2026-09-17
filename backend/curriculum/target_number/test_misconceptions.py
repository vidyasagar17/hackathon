import pytest

from .misconceptions import (
    Equation,
    diagnose_equation,
    diagnose_step,
    equation_answer,
    step_total,
)


def test_step_totals():
    assert step_total(14, "+", 3) == 17
    assert step_total(14, "-", 3) == 11


@pytest.mark.parametrize(
    ("total", "sign", "card", "answer", "expected"),
    [
        (14, "+", 3, 17, None),
        (14, "+", 3, 16, "counted_on_from_start"),
        (14, "+", 3, 11, "subtracted_instead"),
        (38, "+", 7, 35, "forgot_to_change_the_tens"),
        (38, "+", 27, 55, "forgot_to_change_the_tens"),
        (14, "-", 3, 10, "counted_back_one_off"),
        (14, "-", 3, 12, "counted_back_one_off"),
        (14, "-", 3, 17, "added_instead"),
        (42, "-", 8, 46, "smaller_from_larger"),
        (42, "-", 8, 44, "forgot_to_change_the_tens"),
        (65, "-", 38, 33, "smaller_from_larger"),
        (65, "-", 38, 37, "forgot_to_change_the_tens"),
        (14, "-", 3, 13, None),
        (38, "+", 7, 44, "counted_on_from_start"),
        (38, "+", 7, 47, None),
    ],
)
def test_hand_worked_steps(total, sign, card, answer, expected):
    assert diagnose_step(total, sign, card, answer) == expected


def test_smaller_from_larger_wins_when_it_matches_forgetting_the_tens():
    """43 - 8: 8 - 3 = 5 and 13 - 8 = 5 both give 45."""
    assert diagnose_step(43, "-", 8, 45) == "smaller_from_larger"


def test_tens_mistakes_need_a_step_across_a_ten():
    """34 + 3 and 38 - 2 cross no ten, so 10 too few or too many is not forgetting to change the tens."""
    assert diagnose_step(34, "+", 3, 27) is None
    assert diagnose_step(38, "-", 2, 46) is None


def test_no_right_step_is_diagnosed_and_every_diagnosis_is_wrong():
    for total in range(0, 100):
        for card in range(1, 41):
            for sign in "+-":
                right = step_total(total, sign, card)
                if not 0 <= right <= 99:
                    continue
                assert diagnose_step(total, sign, card, right) is None
                for answer in range(0, 200):
                    if diagnose_step(total, sign, card, answer):
                        assert answer != right


def test_equation_with_the_total_first():
    equation = Equation(left=[17], right=12)
    assert equation_answer(equation) == 5
    assert diagnose_equation(equation, 5) is None
    assert diagnose_equation(equation, 29) == "added_all_numbers"
    assert diagnose_equation(equation, 17) is None


def test_equation_with_operations_on_both_sides():
    """8 + 4 = 5 + __: Falkner, Levi & Carpenter's item."""
    equation = Equation(left=[8, 4], right=5)
    assert equation_answer(equation) == 7
    assert diagnose_equation(equation, 7) is None
    assert diagnose_equation(equation, 12) == "answer_to_equal_sign"
    assert diagnose_equation(equation, 17) == "added_all_numbers"
    assert diagnose_equation(equation, 8) is None
