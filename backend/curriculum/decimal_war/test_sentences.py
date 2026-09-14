from decimal import Decimal

from .misconceptions import correct_pick, diagnose
from .rounds import new_round
from .sentences import specific_hint


def test_longer_is_larger_gives_both_numbers_the_same_number_of_digits():
    assert specific_hint("45", "8", "longer_is_larger") == (
        "Give both numbers the same number of digits: 0.45 and 0.80. "
        "80 hundredths is more than 45 hundredths, so 0.8 is larger."
    )


def test_an_equal_pair_is_the_same_size():
    assert specific_hint("4", "40", "longer_is_larger") == (
        "Give both numbers the same number of digits: 0.40 and 0.40. "
        "40 hundredths is the same as 40 hundredths, so they are the same size."
    )


def test_shorter_is_larger_gives_both_numbers_the_same_number_of_digits():
    assert specific_hint("8", "85", "shorter_is_larger") == (
        "Give both numbers the same number of digits: 0.80 and 0.85. "
        "85 hundredths is more than 80 hundredths, so 0.85 is larger."
    )


def test_reciprocal_thinking_counts_parts_of_the_same_size():
    assert specific_hint("3", "4", "reciprocal_thinking") == (
        "0.4 is 4 tenths and 0.3 is 3 tenths. 4 tenths is more than 3 tenths, so 0.4 is larger."
    )


def test_ignores_zero_says_what_the_zero_after_the_point_does():
    assert specific_hint("3", "03", "ignores_zero") == (
        "The 0 after the point matters: 0.03 is 3 hundredths, but 0.3 is 3 tenths, "
        "which is 30 hundredths. So 0.3 is larger."
    )


def test_a_count_of_one_is_singular():
    assert specific_hint("1", "2", "reciprocal_thinking") == (
        "0.2 is 2 tenths and 0.1 is 1 tenth. 2 tenths is more than 1 tenth, so 0.2 is larger."
    )


def test_every_sentence_for_a_dealt_mistake_names_the_right_answer():
    for level in (1, 2, 3):
        for _ in range(2000):
            round = new_round(level)
            right = correct_pick(round.mine, round.robo)
            for pick in ("mine", "robo", "same"):
                misconception = diagnose(round.mine, round.robo, pick)
                if misconception is None:
                    continue
                sentence = specific_hint(round.mine, round.robo, misconception)
                if right == "same":
                    assert sentence.endswith("so they are the same size.")
                else:
                    larger = round.mine if right == "mine" else round.robo
                    assert sentence.endswith(f"{Decimal(f'0.{larger}')} is larger.")
