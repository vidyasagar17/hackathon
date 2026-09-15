"""Hint sentences read as approved, and every arithmetic claim in every diagnosable hint is true."""

import re

from .misconceptions import diagnose_product, diagnose_quotient
from .rounds import Fact
from .sentences import specific_hint

_OPERATIONS = {
    "+": lambda x, y: x + y,
    "−": lambda x, y: x - y,
    "×": lambda x, y: x * y,
    "÷": lambda x, y: x // y,
}
_CLAIM = re.compile(r"(\d+) ([+−×÷]) (\d+) (?:is|=) (\d+)(?=[.,])")
_RECALLED = re.compile(r"(\d+) is (\d+) × (\d+)\.")
_SKIP_COUNT = re.compile(r"means (\d+) groups? of (\d+): ([\d, ]+)\.")


def _multiply(left: int, right: int) -> Fact:
    return Fact(operation="multiply", left=left, right=right)


def _divide(dividend: int, divisor: int) -> Fact:
    return Fact(operation="divide", left=dividend, right=divisor)


def test_zero_with_zero_second():
    assert specific_hint(_multiply(7, 0), 7, "times_zero_is_the_other_number") == (
        "7 + 0 is 7, but 7 × 0 means 7 groups of 0. Every group is empty, so 7 × 0 is 0."
    )


def test_zero_with_zero_first():
    assert specific_hint(_multiply(0, 7), 7, "times_zero_is_the_other_number") == (
        "0 + 7 is 7, but 0 × 7 means 0 groups of 7. There are no groups at all, so 0 × 7 is 0."
    )


def test_added_instead_of_multiplied():
    assert specific_hint(_multiply(4, 6), 10, "added_instead_of_multiplied") == (
        "4 + 6 is 10, but 4 × 6 means 4 groups of 6: 6, 12, 18, 24. So 4 × 6 is 24."
    )


def test_added_instead_of_multiplied_with_one_group():
    assert specific_hint(_multiply(1, 7), 8, "added_instead_of_multiplied") == (
        "1 + 7 is 8, but 1 × 7 means 1 group of 7: 7. So 1 × 7 is 7."
    )


def test_neighboring_fact_one_more_in_the_second_number():
    assert specific_hint(_multiply(6, 7), 48, "neighboring_fact") == "48 is 6 × 8. 6 × 7 is 6 less: 48 − 6 = 42."


def test_neighboring_fact_one_less_in_the_first_number():
    assert specific_hint(_multiply(6, 7), 35, "neighboring_fact") == "35 is 5 × 7. 6 × 7 is 7 more: 35 + 7 = 42."


def test_one_group_off():
    assert specific_hint(_divide(56, 8), 6, "one_group_off") == (
        "8 × 6 is 48, not 56. 8 × 7 is 56, so 56 ÷ 8 is 7."
    )


def _assert_true(sentence: str, fact: Fact, answer: int) -> None:
    claims = _CLAIM.findall(sentence)
    assert claims, sentence
    for left, operation, right, result in claims:
        assert _OPERATIONS[operation](int(left), int(right)) == int(result), sentence
    for product, left, right in _RECALLED.findall(sentence):
        assert int(left) * int(right) == int(product), sentence
    for groups, size, counts in _SKIP_COUNT.findall(sentence):
        assert [int(n) for n in counts.split(", ")] == [int(size) * k for k in range(1, int(groups) + 1)], sentence
    assert int(re.findall(r"\d+", sentence)[-1]) == fact.correct_answer, sentence
    assert str(answer) in re.findall(r"\d+", sentence), sentence


def test_every_diagnosable_product_hint_is_true_and_ends_on_the_correct_answer():
    for a in range(10):
        for b in range(10):
            for answer in range(101):
                misconception = diagnose_product(a, b, answer)
                if misconception:
                    _assert_true(specific_hint(_multiply(a, b), answer, misconception), _multiply(a, b), answer)


def test_every_diagnosable_quotient_hint_is_true_and_ends_on_the_correct_answer():
    for divisor in range(1, 10):
        for quotient in range(1, 10):
            fact = _divide(divisor * quotient, divisor)
            for answer in range(101):
                misconception = diagnose_quotient(fact.left, fact.right, answer)
                if misconception:
                    _assert_true(specific_hint(fact, answer, misconception), fact, answer)
