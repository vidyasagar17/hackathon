import pytest

from .misconceptions import diagnose_tap, total


@pytest.mark.parametrize(
    ("values", "tapped", "expected"),
    [
        ([5], 5, None),
        ([5], 6, "counted_one_too_many"),
        ([5], 4, "counted_one_too_few"),
        ([5], 3, None),
        ([1], 2, "counted_one_too_many"),
        ([10], 9, "counted_one_too_few"),
        ([3, 5], 8, None),
        ([3, 5], 6, "one_more_than_second"),
        ([3, 5], 7, "counted_on_from_start"),
        ([3, 5], 2, "subtracted_instead"),
        ([3, 5], 9, "counted_one_too_many"),
        ([5, 3], 9, "counted_one_too_many"),
        ([5, 3], 7, "counted_on_from_start"),
        ([2, 2], 0, "subtracted_instead"),
    ],
)
def test_hand_worked_taps(values, tapped, expected):
    assert diagnose_tap(values, tapped) == expected


def test_a_right_tap_is_never_diagnosed_and_every_diagnosis_is_a_wrong_number():
    rolls = [[n] for n in range(1, 11)] + [[a, b] for a in range(1, 7) for b in range(1, 7)]
    for values in rolls:
        assert total(values) == sum(values)
        assert diagnose_tap(values, sum(values)) is None
        for tapped in range(0, 14):
            if diagnose_tap(values, tapped):
                assert tapped != sum(values)
