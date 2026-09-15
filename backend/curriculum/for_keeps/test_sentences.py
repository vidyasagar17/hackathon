from .misconceptions import _SIMULATORS, diagnose
from .sentences import specific_hint


def test_smaller_from_larger_says_the_ones_column_must_borrow():
    assert specific_hint(73, 58, "smaller_from_larger") == (
        "In the ones column, 3 is smaller than 8, so you can't subtract yet: borrow from the tens column."
    )


def test_borrowed_without_decrementing_shows_the_tens_digit_going_down_by_one():
    assert specific_hint(73, 58, "borrowed_without_decrementing") == (
        "When the ones column borrows from the tens column, the tens column goes down by 1: "
        "cross out the 7 and write 6."
    )


def test_zero_minus_digit_says_not_to_just_write_the_bottom_digit():
    assert specific_hint(40, 23, "zero_minus_digit_gives_digit") == (
        "In the ones column, the top digit is 0, so don't just write the 3: borrow from the tens column."
    )


def test_always_borrow_says_the_ones_column_does_not_need_a_borrow():
    assert specific_hint(45, 42, "always_borrow") == (
        "In the ones column, 5 is not smaller than 2, so you don't need to borrow there."
    )


def test_every_diagnosed_two_digit_mistake_gets_a_true_sentence():
    """Sweep every pair and every buggy answer: each sentence's claim about the ones column holds."""
    checked = 0
    for larger in range(100):
        for smaller in range(larger + 1):
            top_tens, top_ones = divmod(larger, 10)
            bottom_ones = smaller % 10
            for _, simulate in _SIMULATORS:
                misconception = diagnose(larger, smaller, simulate(larger, smaller))
                if misconception is None:
                    continue
                sentence = specific_hint(larger, smaller, misconception)
                checked += 1
                if misconception == "always_borrow":
                    assert top_ones >= bottom_ones
                else:
                    assert top_ones < bottom_ones and top_tens >= 1
                if misconception == "zero_minus_digit_gives_digit":
                    assert top_ones == 0
                assert sentence.startswith(("In the ones column", "When the ones column"))
    assert checked > 3000
