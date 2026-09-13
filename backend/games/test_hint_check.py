from .hint_check import vet_hint

DIVISION_WORDS = ["dividend", "divisor", "quotient", "algorithm"]


def test_rejects_real_sample_with_filler_and_jargon():
    hint = (
        "Sure! Remember, when you're dividing, you're trying to see how many times the "
        "divisor fits into the dividend. So instead of subtracting, think about how many "
        "8s are in 88."
    )
    assert vet_hint(hint, 11, DIVISION_WORDS) is None


def test_rejects_plural_jargon():
    assert vet_hint("Count how many divisors fit.", 22, DIVISION_WORDS) is None


def test_rejects_hint_that_states_the_answer():
    hint = "Share 66 into 3 equal groups and you get 22 in each group."
    assert vet_hint(hint, 22, DIVISION_WORDS) is None


def test_answer_digits_inside_a_larger_number_are_not_a_leak():
    hint = "Look at all of 220 before you start sharing."
    assert vet_hint(hint, 22, DIVISION_WORDS) == hint


def test_strips_filler_opener_from_a_clean_hint():
    hint = "Sure! try sharing 66 into 3 equal groups."
    assert vet_hint(hint, 22, DIVISION_WORDS) == "Try sharing 66 into 3 equal groups."


def test_rejects_hint_that_is_only_filler():
    assert vet_hint("Certainly!", 22, DIVISION_WORDS) is None


def test_clean_hint_passes_unchanged():
    hint = 'Remember, when you see "x" between two numbers, it means you need to multiply them.'
    assert vet_hint(hint, 60, ["multiplicand", "multiplier", "algorithm"]) == hint
