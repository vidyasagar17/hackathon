import pytest

from .misconceptions import diagnose_tap, mistake_numbers, reversed_teen


def test_reversed_teens():
    assert reversed_teen(14) == 41
    assert reversed_teen(12) == 21
    assert reversed_teen(19) == 91
    for total in (0, 5, 10, 11, 20):
        assert reversed_teen(total) is None


@pytest.mark.parametrize(
    ("first", "second", "tapped", "expected"),
    [
        (9, 5, 14, None),
        (9, 5, 41, "reversed_teen_digits"),
        (9, 5, 13, "counted_on_from_start"),
        (9, 5, 4, "subtracted_instead"),
        (9, 5, 15, None),
        (3, 4, 5, "one_more_than_second"),
        (3, 4, 6, "counted_on_from_start"),
        (4, 10, 11, "one_more_than_second"),
        (10, 4, 41, "reversed_teen_digits"),
        (10, 2, 21, "reversed_teen_digits"),
        (10, 1, 11, None),
    ],
)
def test_hand_worked_taps(first, second, tapped, expected):
    assert diagnose_tap(first, second, tapped) == expected


def test_mistake_numbers_never_include_the_sum():
    for first in range(0, 11):
        for second in range(0, 11):
            numbers = mistake_numbers(first, second)
            assert first + second not in numbers
            for number in numbers:
                assert diagnose_tap(first, second, number) is not None
            assert diagnose_tap(first, second, first + second) is None


def test_mistake_numbers_for_hand_worked_facts():
    assert mistake_numbers(9, 5) == {41, 13, 4}
    assert mistake_numbers(10, 9) == {91, 18, 1}
    assert mistake_numbers(3, 4) == {5, 6, 1}
