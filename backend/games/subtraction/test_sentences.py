from .problems import Problem, compute_columns
from .sentences import specific_hint


def _problem(minuend: int, subtrahend: int) -> Problem:
    return Problem(
        minuend=minuend,
        subtrahend=subtrahend,
        answer=minuend - subtrahend,
        columns=compute_columns(minuend, subtrahend),
        difficulty=1,
    )


def test_smaller_from_larger_points_at_the_ones_column():
    assert specific_hint(_problem(742, 158), "smaller_from_larger") == (
        "In the ones column, 2 is smaller than 8, so you can't subtract yet: "
        "borrow from the tens column."
    )


def test_smaller_from_larger_skips_a_zero_lender():
    assert specific_hint(_problem(402, 253), "smaller_from_larger") == (
        "In the ones column, 2 is smaller than 3, so you can't subtract yet: "
        "the tens column has a 0, so borrow from the hundreds column first."
    )


def test_borrowed_without_decrementing_shows_the_lender_going_down():
    assert specific_hint(_problem(742, 158), "borrowed_without_decrementing") == (
        "When the ones column borrows from the tens column, the tens column goes down by 1: "
        "cross out the 4 and write 3."
    )


def test_borrowed_without_decrementing_with_a_zero_lender():
    assert specific_hint(_problem(302, 158), "borrowed_without_decrementing") == (
        "When you borrow, the column you borrow from goes down by 1. "
        "The tens column has a 0, so borrow from the hundreds column: "
        "cross out the 3 and write 2."
    )


def test_borrow_across_zero_failure_walks_through_the_refill():
    assert specific_hint(_problem(302, 158), "borrow_across_zero_failure") == (
        "The tens column has a 0, so it has nothing to lend. First borrow from the hundreds "
        "column: the 3 becomes 2 and the 0 becomes 10. "
        "Then the tens column lends to the ones column and becomes 9."
    )


def test_always_borrow_points_at_a_column_without_a_borrow():
    assert specific_hint(_problem(623, 118), "always_borrow") == (
        "In the tens column, 2 is not smaller than 1, so you don't need to borrow there."
    )


def test_zero_minus_digit_points_at_the_zero_column():
    assert specific_hint(_problem(204, 168), "zero_minus_digit_gives_digit") == (
        "In the tens column, the top digit is 0, so don't just write the 6: "
        "borrow from the hundreds column."
    )


def test_zero_minus_digit_with_zeros_in_both_lower_columns():
    assert specific_hint(_problem(800, 123), "zero_minus_digit_gives_digit") == (
        "In the ones column, the top digit is 0, so don't just write the 3: "
        "the tens column has a 0, so borrow from the hundreds column first."
    )
