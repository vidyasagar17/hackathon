import re

from .hints import GENERAL_HINT, hint_sentence
from .misconceptions import Equation, diagnose_equation, diagnose_step, equation_answer, step_total
from .rounds import Round, Step
from .sentences import equation_hint, step_hint


def _true_arithmetic(sentence: str) -> bool:
    """Every "a + b = c" and "a − b = c" (numbers or a box) in the sentence is true."""
    for left, sign, right, result in re.findall(r"(\d+) ([+−]) (\d+) = (\d+)", sentence):
        value = int(left) + int(right) if sign == "+" else int(left) - int(right)
        if value != int(result):
            return False
    return True


def test_hand_worked_step_hints():
    assert step_hint(14, "+", 3, 16, "counted_on_from_start") == (
        "When you count on from 14, the first number you say is 15: 15, 16, 17. So 14 + 3 = 17."
    )
    assert step_hint(14, "+", 9, 22, "counted_on_from_start") == (
        "When you count on from 14, the first number you say is 15, not 14. 14 + 10 = 24, and 9 is 1 less than 10, "
        "so 14 + 9 = 23."
    )
    assert step_hint(14, "-", 3, 12, "counted_back_one_off") == "Start at 14 and count back 3: 13, 12, 11. So 14 − 3 = 11."
    assert step_hint(17, "-", 9, 9, "counted_back_one_off") == (
        "Take away 10, then give 1 back, because 9 is 1 less than 10: 17 − 10 = 7 and 7 + 1 = 8. So 17 − 9 = 8."
    )
    assert step_hint(14, "+", 3, 11, "subtracted_instead") == "The sign is +, so put them together: 14 + 3 = 17."
    assert step_hint(14, "-", 3, 17, "added_instead") == "The sign is −, so take 3 away: 14 − 3 = 11."
    assert step_hint(38, "+", 5, 33, "forgot_to_change_the_tens") == (
        "The ones make 8 + 5 = 13, which is 1 ten and 3 ones, so the tens go up by one: 38 + 5 = 43."
    )
    assert step_hint(42, "-", 8, 46, "smaller_from_larger") == (
        "You can't take 8 ones from 2 ones, and turning it around to 8 − 2 gives the wrong answer. "
        "42 has only 2 ones, so use a ten: 42 is 30 and 12. 12 − 8 = 4, so 42 − 8 = 34."
    )
    assert step_hint(65, "-", 38, 37, "forgot_to_change_the_tens") == (
        "65 has only 5 ones, so use a ten: 65 is 50 and 15. 15 − 8 = 7 and 50 − 30 = 20, so 65 − 38 = 27."
    )
    assert step_hint(14, "+", 10, 23, "counted_on_from_start") == "Adding 10 makes the tens go up by one: 14 + 10 = 24."


def test_hand_worked_equation_hints():
    assert equation_hint(Equation(left=[17], right=12), 29, "added_all_numbers") == (
        "= means both sides are the same amount. The left side is 17, so 12 + □ must make 17 too: 12 + 5 = 17."
    )
    assert equation_hint(Equation(left=[8, 4], right=5), 12, "answer_to_equal_sign") == (
        "8 + 4 = 12 is only the left side. = means both sides are the same amount, so 5 + □ must make 12 too: "
        "5 + 7 = 12."
    )
    assert equation_hint(Equation(left=[8, 4], right=5), 17, "added_all_numbers") == (
        "= means both sides are the same amount. 8 + 4 = 12, so 5 + □ must make 12 too: 5 + 7 = 12."
    )


def test_every_diagnosed_step_hint_is_true_and_ends_with_the_right_total():
    for total in range(0, 100):
        for card in range(1, 41):
            for sign in "+-":
                right = step_total(total, sign, card)
                if not 0 <= right <= 99:
                    continue
                for answer in {right - 10, right - 1, right + 1, right + 10, abs(total - card), total + card} | {
                    (total // 10 - card // 10) * 10 + (card % 10 - total % 10)
                }:
                    name = diagnose_step(total, sign, card, answer)
                    if name:
                        sentence = step_hint(total, sign, card, answer, name)
                        assert _true_arithmetic(sentence), sentence
                        assert sentence.endswith(f"= {right}."), sentence


def test_every_diagnosed_equation_hint_is_true():
    for left in ([17], [9, 8], [3, 30]):
        for right in range(1, sum(left)):
            equation = Equation(left=left, right=right)
            for answer in (sum(left), sum(left) + right):
                name = diagnose_equation(equation, answer)
                if name:
                    sentence = equation_hint(equation, answer, name)
                    assert _true_arithmetic(sentence), sentence
                    assert sentence.endswith(f"{right} + {equation_answer(equation)} = {sum(left)}.")


def test_hint_sentence_uses_the_latest_graded_move():
    round = Round(
        level=1,
        cards=[14, 3, 1, 1, 1],
        robo_cards=[1, 1, 1, 1, 1],
        target=17,
        equation=Equation(left=[17], right=12),
        steps=[Step(before=14, sign="+", card=3, answer=16)],
        last_graded="step",
    )
    assert hint_sentence(round, "counted_on_from_start").startswith("When you count on from 14")
    answered = round.model_copy(update={"equation_answer": 29, "last_graded": "equation"})
    assert hint_sentence(answered, "added_all_numbers").startswith("= means both sides")
    assert GENERAL_HINT == "Take one step at a time. The = sign means both sides are the same amount."


def test_a_total_with_no_other_tens_uses_its_one_ten():
    assert step_hint(10, "-", 6, 4, "forgot_to_change_the_tens") == "10 has only 0 ones, so use the ten: 10 is 10 ones, and 10 − 6 = 4."
    assert step_hint(13, "-", 5, 12, "smaller_from_larger") == (
        "You can't take 5 ones from 3 ones, and turning it around to 5 − 3 gives the wrong answer. "
        "13 has only 3 ones, so use the ten: 13 is 13 ones, and 13 − 5 = 8."
    )


def test_one_one_is_singular():
    assert step_hint(40, "-", 1, 41, "smaller_from_larger").startswith("You can't take 1 one from 0 ones")
