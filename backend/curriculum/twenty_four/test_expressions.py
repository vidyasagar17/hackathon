from fractions import Fraction

import pytest

from .expressions import (
    LEFT_TO_RIGHT,
    PEMDAS_LETTERS,
    RULE,
    expression_text,
    resolve,
    step_text,
    work_out,
    written,
)


def _steps(tokens, order):
    return [step_text(step) for step in work_out(tokens, order).steps]


def test_resolve_swaps_card_positions_for_their_numbers():
    assert resolve(["(", 0, "+", 1, ")", "*", 2, "-", 3], [3, 5, 3, 0]) == ["(", 3, "+", 5, ")", "*", 3, "-", 0]


@pytest.mark.parametrize(
    "tokens",
    [
        [0, "+", 1, "+", 2],
        [0, "+", 1, "+", 2, "+", 2],
        [0, "+", 1, "+", 2, "+", 4],
        [0, 1, "+", 2, "+", 3],
        [0, "+", "+", 1, "+", 2, "+", 3],
        ["(", 0, "+", 1, "+", 2, "+", 3],
        [0, "+", 1, ")", "+", "(", 2, "+", 3],
        [0, "+", 1, "+", 2, "+", 3, "*"],
        [0, "+", 1, "+", 2, "^", 3],
        ["(", ")", 0, "+", 1, "+", 2, "+", 3],
        [0, "+", 1, "+", 2, "+", "3"],
        [True, "+", 1, "+", 2, "+", 3],
    ],
)
def test_resolve_rejects_anything_but_one_expression_using_every_card_once(tokens):
    with pytest.raises(ValueError):
        resolve(tokens, [3, 5, 3, 1])


def test_the_rule_does_times_and_divide_before_plus_and_minus():
    worked = work_out([3, "+", 5, "*", 3], RULE)
    assert worked.value == 18
    assert _steps([3, "+", 5, "*", 3], RULE) == ["5 × 3 = 15", "3 + 15 = 18"]


def test_the_rule_goes_left_to_right_within_a_group_and_does_parentheses_first():
    assert _steps([24, "/", 2, "*", 3], RULE) == ["24 ÷ 2 = 12", "12 × 3 = 36"]
    assert _steps([8, "-", 2, "+", 4], RULE) == ["8 − 2 = 6", "6 + 4 = 10"]
    assert _steps([2, "*", "(", 1, "+", "(", 3, "+", 8, ")", ")"], RULE) == ["3 + 8 = 11", "1 + 11 = 12", "2 × 12 = 24"]


def test_left_to_right_ignores_the_groups_but_not_parentheses():
    assert work_out([3, "+", 5, "*", 3], LEFT_TO_RIGHT).value == 24
    assert _steps([2, "*", "(", 3, "+", 1, ")", "+", 4, "*", 3], LEFT_TO_RIGHT) == [
        "3 + 1 = 4",
        "2 × 4 = 8",
        "8 + 4 = 12",
        "12 × 3 = 36",
    ]


def test_pemdas_letter_order_does_times_then_divide_then_plus_then_minus():
    assert _steps([24, "/", 2, "*", 3], PEMDAS_LETTERS) == ["2 × 3 = 6", "24 ÷ 6 = 4"]
    assert _steps([8, "-", 2, "+", 4], PEMDAS_LETTERS) == ["2 + 4 = 6", "8 − 6 = 2"]


def test_values_stay_exact_and_a_division_by_zero_makes_nothing():
    assert work_out([8, "/", 3, "*", 9], RULE).value == 24
    assert _steps([8, "/", 3, "-", 4], RULE) == ["8 ÷ 3 = 8/3", "8/3 − 4 = −4/3"]
    assert work_out([8, "/", "(", 3, "-", 3, ")", "+", 1], RULE).value is None
    assert work_out([2, "-", 5], RULE).value == Fraction(-3)


def test_written_keeps_only_the_parentheses_the_rule_needs():
    assert written(("*", ("+", 3, 5), 3)) == ["(", 3, "+", 5, ")", "*", 3]
    assert written(("+", ("+", 3, 5), ("*", 3, 1))) == [3, "+", 5, "+", 3, "*", 1]
    assert written(("-", 9, ("+", 3, 1))) == [9, "-", "(", 3, "+", 1, ")"]
    assert written(("+", 9, ("-", 3, 1))) == [9, "+", 3, "-", 1]
    assert written(("/", 24, ("*", 2, 3))) == [24, "/", "(", 2, "*", 3, ")"]
    assert written(("*", 24, ("/", 2, 2))) == [24, "*", 2, "/", 2]


def test_written_tokens_work_out_to_the_tree_they_came_from():
    tree = ("/", ("*", ("-", 9, 3), 8), ("+", 1, 1))
    tokens = written(tree)
    assert work_out(tokens, RULE).tree == tree
    assert work_out(tokens, RULE).value == 24


def test_expression_text_spaces_symbols_like_the_hints():
    assert expression_text(["(", 3, "+", 5, ")", "*", 3]) == "(3 + 5) × 3"
    assert expression_text([8, "-", "(", "(", 2, "/", 1, ")", ")"]) == "8 − ((2 ÷ 1))"
