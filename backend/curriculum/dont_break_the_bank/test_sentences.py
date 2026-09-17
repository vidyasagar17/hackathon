import random
import re

from games.hint_check import keeps_facts

from . import hints
from .misconceptions import _DISTANCE_SIMULATORS, _SUM_SIMULATORS, diagnose_distance, diagnose_sum
from .rounds import Round
from .sentences import distance_hint, sum_hint

THREE = [456, 365, 163]


def test_sum_hints_name_the_column_the_mistake_got_wrong():
    assert sum_hint(THREE, 3, "no_carry") == (
        "In the ones column, 6 + 5 + 3 makes 14, so write 4 and carry 1 to the tens column."
    )
    assert sum_hint(THREE, 3, "reversed_carry") == (
        "In the ones column, 6 + 5 + 3 makes 14: write the ones digit, 4, and carry the tens digit, 1, "
        "to the tens column."
    )
    assert sum_hint(THREE, 3, "carry_drops_at_second_column") == (
        "In the tens column, 5 + 6 + 6 plus the 1 you carried makes 18, so carry 1 to the hundreds column too."
    )
    assert sum_hint(THREE, 3, "wrote_column_sums_side_by_side") == (
        "10 ones make 1 ten. In the ones column, 6 + 5 + 3 makes 14, so write 4 and carry 1 to the tens column."
    )
    assert sum_hint([312, 121, 213], 3, "carry_always") == (
        "In the ones column, 2 + 1 + 3 makes 6, less than 10, so don't carry anything to the tens column."
    )
    assert sum_hint([564, 453, 223], 3, "drops_final_carry") == (
        "In the hundreds column, 5 + 4 + 2 plus the 1 you carried makes 12: write all of 12, so the sum is 1240."
    )


def test_carry_always_with_a_carry_of_2_says_to_carry_2():
    # 999 + 999 + 111 on a 0-9 die: ones 19 carries 1, tens 19 + 1 = 20 carries 2.
    assert sum_hint([999, 999, 111], 3, "carry_always") == (
        "In the tens column, 9 + 9 + 1 plus the 1 you carried makes 20, so carry 2 to the hundreds column."
    )


def test_the_face_value_hint_says_what_the_largest_numbers_digits_are_worth():
    assert sum_hint(THREE, 3, "added_digits_as_ones") == (
        "In 456, the 4 means 4 hundreds, or 400, and the 5 means 5 tens, or 50. "
        "Add the ones, then the tens, then the hundreds."
    )
    assert sum_hint([38, 46], 2, "added_digits_as_ones") == "In 46, the 4 means 4 tens, or 40. Add the ones, then the tens."
    assert sum_hint([45, 907, 3], 3, "added_digits_as_ones") == (
        "In 907, the 9 means 9 hundreds, or 900. Add the ones, then the tens, then the hundreds."
    )
    assert sum_hint([5, 7, 3], 3, "added_digits_as_ones") == "Add the ones, then the tens, then the hundreds."
    assert sum_hint([151, 127, 119], 3, "added_digits_as_ones") == (
        "In 151, the 1 means 1 hundred, or 100, and the 5 means 5 tens, or 50. "
        "Add the ones, then the tens, then the hundreds."
    )


def test_distance_hints_trade_the_bank_and_count_up():
    assert distance_hint(1000, 687, "stops_borrow_at_zero") == (
        "When a column borrows, the column it borrows from goes down by 1: 1000 is 9 hundreds, 9 tens and "
        "10 ones, so 1000 − 687 = 313. Or count up: 687 + 13 = 700, and 700 + 300 = 1000."
    )
    assert distance_hint(100, 67, "borrow_across_zero_failure") == (
        "A 0 has nothing to lend until it borrows from the column to its left: 100 is 9 tens and 10 ones, "
        "so 100 − 67 = 33. Or count up: 67 + 3 = 70, and 70 + 30 = 100."
    )
    assert distance_hint(1000, 605, "zero_minus_digit_gives_digit").startswith("0 take away 5 is not 5, so borrow first:")
    assert distance_hint(1000, 900, "zero_minus_digit_gives_zero").endswith("Or count up: 900 + 100 = 1000.")


def test_hint_sentence_uses_the_latest_graded_answer_and_rewords_under_the_fact_check(monkeypatch):
    calls = []
    monkeypatch.setattr(hints, "reword_hint", lambda sentence, prompt, answer, banned: calls.append(answer) or sentence)
    board = [4, 5, 6, 3, 6, 5, 1, 6, 3]
    summed = Round(level=2, rolls=board, my_board=board, robo_board=board, last_graded="sum")
    assert hints.hint_sentence(summed, "no_carry") == sum_hint(THREE, 3, "no_carry")
    distanced = summed.model_copy(update={"last_graded": "distance"})
    assert hints.hint_sentence(distanced, "stops_borrow_at_zero") == distance_hint(1000, 984, "stops_borrow_at_zero")
    assert calls == [None, None]


def _check_arithmetic(sentence: str) -> None:
    """Every 'a + b + c makes n', 'plus the k you carried', 'bank − total = d' and 'a + b = c' in the sentence is true."""
    for added, carried, made in re.findall(r"((?:\d+ \+ )+\d+)(?: plus the (\d) you carried)? makes (\d+)", sentence):
        assert sum(int(digit) for digit in added.split(" + ")) + int(carried or 0) == int(made), sentence
    for left, right, result in re.findall(r"(\d+) − (\d+) = (\d+)", sentence):
        assert int(left) - int(right) == int(result), sentence
    for left, right, result in re.findall(r"(\d+) \+ (\d+) = (\d+)", sentence):
        assert int(left) + int(right) == int(result), sentence


def test_every_diagnosed_hint_across_many_games_is_true_and_passes_its_own_fact_check():
    rng = random.Random(9)
    seen = set()
    for _ in range(4000):
        width, count, lowest, highest = rng.choice([(2, 2, 1, 6), (3, 3, 1, 6), (3, 3, 0, 9)])
        bank = 10**width
        numbers = [int("".join(str(rng.randint(lowest, highest)) for _ in range(width))) for _ in range(count)]
        for _, simulate in _SUM_SIMULATORS:
            answer = simulate(numbers, width)
            misconception = None if answer is None else diagnose_sum(numbers, width, answer)
            if misconception:
                sentence = sum_hint(numbers, width, misconception)
                _check_arithmetic(sentence)
                assert keeps_facts(sentence, sentence)
                seen.add(misconception)
        total = sum(numbers)
        if total <= bank:
            for _, simulate in _DISTANCE_SIMULATORS:
                misconception = diagnose_distance(bank, total, simulate(bank, total))
                if misconception:
                    sentence = distance_hint(bank, total, misconception)
                    _check_arithmetic(sentence)
                    assert f"{bank} − {total} = {bank - total}" in sentence
                    seen.add(misconception)
    assert len(seen) == 11
