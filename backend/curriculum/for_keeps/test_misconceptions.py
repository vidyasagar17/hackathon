"""Hand-worked two-digit subtraction bugs (Brown & Burton, 1978), larger number first."""

from .misconceptions import diagnose


def test_a_correct_difference_has_no_misconception():
    assert diagnose(73, 58, 15) is None


def test_an_unrecognized_answer_has_no_misconception():
    assert diagnose(73, 58, 99) is None


def test_smaller_from_larger():
    assert diagnose(72, 58, 26) == "smaller_from_larger"


def test_borrowed_without_decrementing():
    assert diagnose(72, 58, 24) == "borrowed_without_decrementing"


def test_zero_minus_digit_gives_digit():
    assert diagnose(40, 27, 27) == "zero_minus_digit_gives_digit"


def test_always_borrow():
    assert diagnose(85, 23, 52) == "always_borrow"


def test_smaller_from_larger_wins_when_borrowing_without_decrementing_gives_the_same_answer():
    assert diagnose(73, 58, 25) == "smaller_from_larger"


def test_zero_minus_digit_wins_when_smaller_from_larger_gives_the_same_answer():
    assert diagnose(40, 23, 23) == "zero_minus_digit_gives_digit"


def test_every_bug_only_fires_where_its_procedure_differs_from_the_correct_one():
    for larger in range(100):
        for smaller in range(larger + 1):
            top_ones, bottom_ones = larger % 10, smaller % 10
            for answer in range(100):
                name = diagnose(larger, smaller, answer)
                if name is None:
                    continue
                assert answer != larger - smaller
                if name == "zero_minus_digit_gives_digit":
                    assert top_ones == 0 and bottom_ones > 0
                elif name in ("smaller_from_larger", "borrowed_without_decrementing"):
                    assert top_ones < bottom_ones
                elif name == "always_borrow":
                    assert top_ones >= bottom_ones
