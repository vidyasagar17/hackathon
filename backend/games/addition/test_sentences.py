from .problems import Problem, compute_columns
from .sentences import specific_hint


def _problem(addend1: int, addend2: int) -> Problem:
    return Problem(
        addend1=addend1,
        addend2=addend2,
        answer=addend1 + addend2,
        columns=compute_columns(addend1, addend2),
        difficulty=1,
    )


def test_no_carry_points_at_the_ones_column():
    assert specific_hint(_problem(456, 278), "no_carry") == (
        "In the ones column, 6 + 8 makes 10 or more, so write only the ones digit "
        "and carry 1 to the tens column."
    )


def test_no_carry_points_at_the_tens_column_when_ones_does_not_carry():
    assert specific_hint(_problem(364, 172), "no_carry") == (
        "In the tens column, 6 + 7 makes 10 or more, so write only the ones digit "
        "and carry 1 to the hundreds column."
    )


def test_carry_always_points_at_a_column_under_ten():
    assert specific_hint(_problem(143, 251), "carry_always") == (
        "In the ones column, 3 + 1 is less than 10, so don't carry anything to the tens column."
    )


def test_carry_always_includes_a_real_carry_coming_in():
    assert specific_hint(_problem(218, 135), "carry_always") == (
        "In the tens column, 1 + 3 plus the 1 you carried is less than 10, "
        "so don't carry anything to the hundreds column."
    )


def test_reversed_carry_says_which_digit_to_write_and_which_to_carry():
    assert specific_hint(_problem(456, 278), "reversed_carry") == (
        "In the ones column, 6 + 8 makes a two-digit number: write its ones digit in the "
        "ones column and carry its tens digit to the tens column."
    )


def test_carry_drops_at_second_column_points_at_the_tens_carry():
    assert specific_hint(_problem(269, 156), "carry_drops_at_second_column") == (
        "In the tens column, 6 + 5 plus the 1 you carried makes 10 or more, "
        "so carry 1 into the hundreds column too."
    )


def test_drops_final_carry_with_a_carry_coming_in():
    assert specific_hint(_problem(950, 950), "drops_final_carry") == (
        "In the hundreds column, 9 + 9 plus the 1 you carried makes 10 or more, "
        "so your answer needs a new thousands place at the front."
    )


def test_drops_final_carry_without_a_carry_coming_in():
    assert specific_hint(_problem(500, 600), "drops_final_carry") == (
        "In the hundreds column, 5 + 6 makes 10 or more, "
        "so your answer needs a new thousands place at the front."
    )
