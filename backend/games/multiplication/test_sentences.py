from .problems import Problem, compute_columns
from .sentences import specific_hint


def _problem(multiplicand: int, multiplier: int) -> Problem:
    return Problem(
        multiplicand=multiplicand,
        multiplier=multiplier,
        answer=multiplicand * multiplier,
        columns=compute_columns(multiplicand, multiplier),
        difficulty=1,
    )


def test_drops_final_carry_with_a_carry_coming_in():
    assert specific_hint(_problem(47, 6), "drops_final_carry") == (
        "In the tens column, 4 × 6 plus the 4 you carried makes 10 or more, "
        "so your answer needs a hundreds place at the front."
    )


def test_drops_final_carry_without_a_carry_coming_in():
    assert specific_hint(_problem(51, 2), "drops_final_carry") == (
        "In the tens column, 5 × 2 makes 10 or more, "
        "so your answer needs a hundreds place at the front."
    )


def test_added_instead_of_multiplied_restates_the_sign():
    assert specific_hint(_problem(21, 3), "added_instead_of_multiplied") == (
        "21 × 3 means 3 groups of 21 added together, not 21 + 3."
    )


def test_no_carry_names_the_real_carry():
    assert specific_hint(_problem(24, 3), "no_carry") == (
        "In the ones column, 4 × 3 makes 10 or more, "
        "so write only its ones digit and carry the 1 to the tens column."
    )


def test_carry_always_when_nothing_carries():
    assert specific_hint(_problem(21, 3), "carry_always") == (
        "In the ones column, 1 × 3 is less than 10, so don't carry anything to the tens column."
    )


def test_carry_always_when_the_real_carry_is_bigger_than_one():
    assert specific_hint(_problem(47, 6), "carry_always") == (
        "In the ones column, 7 × 6 makes 10 or more, "
        "so carry its tens digit, 4, to the tens column, not just 1."
    )


def test_added_carry_before_multiplying_orders_the_steps():
    assert specific_hint(_problem(47, 6), "added_carry_before_multiplying") == (
        "In the tens column, multiply first: 4 × 6. "
        "Then add the 4 you carried, instead of adding it before you multiply."
    )
