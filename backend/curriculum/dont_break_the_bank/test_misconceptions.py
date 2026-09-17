"""Hand-worked wrong answers. Each comment works the columns the mistaken way, ones column first."""

import pytest

from .misconceptions import column_digits, diagnose_distance, diagnose_sum


def test_column_digits_are_listed_ones_column_first():
    assert column_digits([345, 212, 131], 3) == [[5, 2, 1], [4, 1, 3], [3, 2, 1]]
    assert column_digits([45, 6], 2) == [[5, 6], [4, 0]]


def test_the_right_sum_has_no_diagnosis():
    assert diagnose_sum([456, 365, 163], 3, 984) is None


# 456 + 365 + 163 = 984. Columns: ones 6+5+3 = 14, tens 5+6+6 = 17, hundreds 4+3+1 = 8.
@pytest.mark.parametrize(
    "answer, misconception",
    [
        # Never carries: 4, 7, 8 -> 874.
        (874, "no_carry"),
        # Writes the tens digit, carries the ones digit: 14 writes 1 carries 4; 17+4 = 21 writes 2 carries 1;
        # 8+1 = 9 -> 921.
        (921, "reversed_carry"),
        # Carries from the ones but not the tens: 4, 17+1 = 18 -> 8, 8 -> 884.
        (884, "carry_drops_at_second_column"),
        # Each column's whole sum side by side: 8 | 17 | 14 -> 81714.
        (81714, "wrote_column_sums_side_by_side"),
        # Every digit as ones: 4+5+6 + 3+6+5 + 1+6+3 = 39.
        (39, "added_digits_as_ones"),
    ],
)
def test_carrying_mistakes_on_three_numbers(answer, misconception):
    assert diagnose_sum([456, 365, 163], 3, answer) == misconception


def test_carrying_into_a_column_that_needs_no_carry_is_carry_always():
    # 312 + 121 + 213 = 646: ones 2+1+3 = 6, tens 1+2+1 = 4, hundreds 3+1+2 = 6.
    # Carry always: 6, 4+1 = 5, 6+1 = 7 -> 756.
    assert diagnose_sum([312, 121, 213], 3, 756) == "carry_always"


def test_dropping_the_final_carry_is_named_before_broader_mistakes():
    # 564 + 453 + 223 = 1240; dropping the thousands gives 240.
    assert diagnose_sum([564, 453, 223], 3, 240) == "drops_final_carry"


def test_no_carry_with_the_last_column_written_in_full():
    # 565 + 654 + 432: ones 11 -> 1, tens 14 -> 4, hundreds 15 written in full -> 1541. Right: 1651.
    assert diagnose_sum([565, 654, 432], 3, 1541) == "no_carry"


def test_two_digit_numbers_have_no_second_column_carry_to_drop():
    # 46 + 38 = 84: ones 14, tens 7. Carry dropped at the tens is the same as the final carry here.
    assert diagnose_sum([46, 38], 2, 74) == "no_carry"
    assert diagnose_sum([46, 38], 2, 714) == "wrote_column_sums_side_by_side"
    assert diagnose_sum([46, 38], 2, 21) == "added_digits_as_ones"


def test_an_unexplained_wrong_sum_is_undiagnosed():
    assert diagnose_sum([456, 365, 163], 3, 985) is None


def test_the_right_distance_has_no_diagnosis():
    assert diagnose_distance(1000, 687, 313) is None


# 1000 - 687 = 313.
@pytest.mark.parametrize(
    "answer, misconception",
    [
        # Adds 10 wherever needed but never takes 1 away: 10-7 = 3, 10-8 = 2, 10-6 = 4, 1 -> 1423.
        (1423, "stops_borrow_at_zero"),
        # The tens 0 becomes 9 but the hundreds isn't touched: 10-7 = 3, 9-8 = 1, then the hundreds 0
        # borrows from the thousands: 10-6 = 4, thousands 0 -> 413.
        (413, "borrow_across_zero_failure"),
        # 0 - 7 = 7, 0 - 8 = 8, 0 - 6 = 6, 1 -> 1687.
        (1687, "zero_minus_digit_gives_digit"),
        # 0 - n = 0 in every column, 1 -> 1000.
        (1000, "zero_minus_digit_gives_zero"),
    ],
)
def test_borrowing_across_zeros_from_1000(answer, misconception):
    assert diagnose_distance(1000, 687, answer) == misconception


def test_borrowing_across_one_zero_from_100():
    # 100 - 67 = 33. Stops at zero: 10-7 = 3, 10-6 = 4, 1 -> 143. Zero becomes 9 only: 3, 9-6 = 3, 1 -> 133.
    assert diagnose_distance(100, 67, 143) == "stops_borrow_at_zero"
    assert diagnose_distance(100, 67, 133) == "borrow_across_zero_failure"
    assert diagnose_distance(100, 67, 167) == "zero_minus_digit_gives_digit"


def test_a_zero_inside_the_total_is_handled_column_by_column():
    # 1000 - 605 = 395. Zero becomes 9 only: 10-5 = 5, 9-0 = 9, hundreds 10-6 = 4, thousands 0 -> 495.
    assert diagnose_distance(1000, 605, 495) == "borrow_across_zero_failure"
    assert diagnose_distance(1000, 605, 1405) == "stops_borrow_at_zero"


def test_an_unexplained_wrong_distance_is_undiagnosed():
    assert diagnose_distance(1000, 687, 323) is None


def test_every_distance_mistake_works_on_every_total_and_shows_up_on_some():
    """Exhaustive over totals the bank allows: no simulator crashes or goes below 0, and each can be told apart."""
    from .misconceptions import _DISTANCE_SIMULATORS

    for bank in (100, 1000):
        for _, simulate in _DISTANCE_SIMULATORS:
            answers = [simulate(bank, total) for total in range(bank + 1)]
            assert min(answers) >= 0
            assert sum(answer != bank - total for total, answer in enumerate(answers)) > bank // 2


def test_every_sum_mistake_shows_up_on_some_three_number_problems():
    from .misconceptions import _SUM_SIMULATORS

    problems = [[a, b, c] for a in range(111, 667, 37) for b in range(111, 667, 41) for c in range(111, 667, 43)]
    for name, simulate in _SUM_SIMULATORS:
        assert any(simulate(numbers, 3) not in (None, sum(numbers)) for numbers in problems), name
