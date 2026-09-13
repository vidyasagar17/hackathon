from .hint_check import keeps_facts, vet_hint

SENTENCE = "In the ones column, 2 is smaller than 8, so you can't subtract yet: borrow from the tens column."


def test_keeps_facts_accepts_friendlier_wording():
    rewrite = "Nice try! In the Ones column 2 is smaller than 8, so first borrow from the tens column."
    assert keeps_facts(rewrite, SENTENCE)


def test_keeps_facts_rejects_a_wrong_column():
    rewrite = "In the ones column, 2 is smaller than 8, so borrow from the hundreds column."
    assert not keeps_facts(rewrite, SENTENCE)


def test_keeps_facts_rejects_an_invented_number():
    rewrite = "In the ones column, 2 is smaller than 8, so borrow from the tens column to make 12."
    assert not keeps_facts(rewrite, SENTENCE)


def test_keeps_facts_rejects_an_invented_comparison_rule():
    sentence = (
        "In the ones column, 6 + 4 makes a two-digit number: write its ones digit in the "
        "ones column and carry its tens digit to the tens column."
    )
    rewrite = (
        "In the ones column, when you put 6 and 4 together, you get a number with two digits. "
        "Write down the smaller number (the ones place) in the ones column and the bigger "
        "number (the tens place) above the tens column."
    )
    assert not keeps_facts(rewrite, sentence)


def test_keeps_facts_rejects_swapped_order():
    rewrite = "In the tens column, borrow for the ones column because 2 is smaller than 8."
    assert not keeps_facts(rewrite, SENTENCE)

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


def test_keeps_only_the_quoted_hint_after_a_preamble():
    reply = (
        "Here's a friendly and encouraging rewording:\n\n"
        '"The tens column shows 0, so it doesn\'t have anything to give."'
    )
    assert vet_hint(reply, 253, []) == "The tens column shows 0, so it doesn't have anything to give."


def test_keeps_only_the_quoted_hint_after_a_stray_word():
    reply = 'Thing! "In the tens column, there\'s a 0, so it can\'t give anything away."'
    assert vet_hint(reply, 54, []) == "In the tens column, there's a 0, so it can't give anything away."


def test_clean_hint_passes_unchanged():
    hint = 'Remember, when you see "x" between two numbers, it means you need to multiply them.'
    assert vet_hint(hint, 60, ["multiplicand", "multiplier", "algorithm"]) == hint
