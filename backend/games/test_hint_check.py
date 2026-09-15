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


def test_keeps_facts_rejects_carry_reworded_as_put():
    sentence = "In the ones column, 0 × 7 is less than 10, so don't carry anything to the tens column."
    rewrite = "In the ones column, 0 times 7 is less than 10, so we don't need to put anything in the tens column."
    assert not keeps_facts(rewrite, sentence)


def test_keeps_facts_rejects_carry_reworded_as_move():
    sentence = (
        "In the tens column, 0 + 8 plus the 1 you carried is less than 10, "
        "so don't carry anything to the hundreds column."
    )
    rewrite = (
        "In the tens column, if you put 0 and 8 together with the 1 you carried, it's less than 10. "
        "So, you don't need to move anything to the hundreds column."
    )
    assert not keeps_facts(rewrite, sentence)


def test_keeps_facts_treats_borrow_forms_as_the_same_word():
    sentence = (
        "When the ones column borrows from the tens column, the tens column goes down by 1: "
        "cross out the 1 and write 0."
    )
    rewrite = "When the ones need to borrow from the tens, make the tens go down by 1. Cross out the 1 and write 0."
    assert keeps_facts(rewrite, sentence)


def test_keeps_facts_treats_carry_forms_as_the_same_word():
    sentence = (
        "In the tens column, multiply first: 1 × 7. "
        "Then add the 1 you carried, instead of adding it before you multiply."
    )
    rewrite = (
        "When you're in the tens column, first do 1 times 7. After you get that, don't forget "
        "to add the 1 you carried over, after you've multiplied."
    )
    assert keeps_facts(rewrite, sentence)


def test_keeps_facts_rejects_swapped_order():
    rewrite = "In the tens column, borrow for the ones column because 2 is smaller than 8."
    assert not keeps_facts(rewrite, SENTENCE)


FACT_SENTENCE = "4 + 6 is 10, but 4 × 6 means 4 groups of 6: 6, 12, 18, 24. So 4 × 6 is 24."


def test_keeps_facts_rejects_times_reworded_as_plus():
    rewrite = "4 + 6 is 10, but 4 + 6 means 4 groups of 6: 6, 12, 18, 24. So 4 × 6 is 24."
    assert not keeps_facts(rewrite, FACT_SENTENCE)


def test_keeps_facts_rejects_the_workshops_not_plus_reworded_as_times():
    sentence = "7 × 3 means 3 groups of 7 added together, not 7 + 3."
    rewrite = "7 × 3 means 3 groups of 7 added together, not 7 × 3."
    assert not keeps_facts(rewrite, sentence)


def test_keeps_facts_rejects_minus_reworded_as_plus():
    sentence = "48 is 6 × 8. 6 × 7 is 6 less: 48 − 6 = 42."
    rewrite = "48 is 6 × 8. 6 × 7 is 6 less: 48 + 6 = 42."
    assert not keeps_facts(rewrite, sentence)


def test_keeps_facts_treats_signs_and_their_words_as_the_same_fact():
    assert keeps_facts(
        "4 plus 6 is 10, but 4 times 6 means 4 groups of 6: 6, 12, 18, 24. So 4 times 6 is 24!",
        FACT_SENTENCE,
    )
    assert keeps_facts(
        "Good try! 8 times 6 is 48, not 56. But 8 times 7 is 56, so 56 divided by 8 is 7.",
        "8 × 6 is 48, not 56. 8 × 7 is 56, so 56 ÷ 8 is 7.",
    )
    assert keeps_facts(
        "48 is 6 times 8. 6 times 7 is 6 less, so 48 minus 6 = 42.",
        "48 is 6 × 8. 6 × 7 is 6 less: 48 − 6 = 42.",
    )

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


def test_strips_the_whole_sure_thing_opener():
    hint = "Sure thing! Let's look at the tens column. First, multiply 3 × 2."
    assert vet_hint(hint, 78, []) == "Let's look at the tens column. First, multiply 3 × 2."


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


DECIMAL_SENTENCE = (
    "Give both numbers the same number of digits: 0.45 and 0.80. "
    "80 hundredths is more than 45 hundredths, so 0.8 is larger."
)


def test_keeps_facts_rejects_a_swapped_decimal_place_name():
    rewrite = (
        "Try giving both numbers the same number of digits: 0.45 and 0.80. "
        "80 tenths is more than 45 hundredths, so 0.8 is larger."
    )
    assert not keeps_facts(rewrite, DECIMAL_SENTENCE)


def test_keeps_facts_rejects_a_dropped_same():
    sentence = (
        "Give both numbers the same number of digits: 0.40 and 0.40. "
        "40 hundredths is the same as 40 hundredths, so they are the same size."
    )
    rewrite = (
        "Give both numbers the same number of digits: 0.40 and 0.40. "
        "40 hundredths equals 40 hundredths, so they are equal."
    )
    assert not keeps_facts(rewrite, sentence)


def test_without_an_answer_numbers_in_the_hint_are_allowed():
    hint = "0.8 is 8 tenths, which is 80 hundredths."
    assert vet_hint(hint, None, []) == hint
