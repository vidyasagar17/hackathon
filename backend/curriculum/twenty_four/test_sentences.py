import random
import re
from fractions import Fraction

from .expressions import OPERATORS, RULE, work_out
from .misconceptions import diagnose_check
from .rounds import Round
from . import hints
from .sentences import specific_hint

_SYMBOL_TO_PYTHON = {"+": "+", "−": "-", "×": "*", "÷": "/"}


def test_left_to_right_hint_says_what_the_rule_makes_and_adds_the_parentheses():
    assert specific_hint([3, "+", 5, "*", 3, "*", 1], "left_to_right") == (
        "In 3 + 5 × 3 × 1, × and ÷ come before + and −, so it makes 18. "
        "Parentheses show the order you used: (3 + 5) × 3 × 1 = 24."
    )


def test_pemdas_letter_order_hint_goes_left_to_right_within_a_pair():
    assert specific_hint([6, "*", 8, "/", 1, "*", 2], "pemdas_letter_order") == (
        "In 6 × 8 ÷ 1 × 2, × and ÷ go left to right in the order they're written, and so do + and −, "
        "so it makes 96. Parentheses show the order you used: 6 × 8 ÷ (1 × 2) = 24."
    )
    assert specific_hint([7, "*", 4, "-", 3, "+", 1], "pemdas_letter_order").endswith(
        "Parentheses show the order you used: 7 × 4 − (3 + 1) = 24."
    )


def test_hint_sentence_uses_the_latest_check():
    round_ = Round(
        level=2,
        cards=[3, 5, 3, 1],
        robo_cards=[1, 2, 7, 7],
        checks=[[3, "+", 5, "+", 3, "+", 1], [3, "+", 5, "*", 3, "*", 1]],
    )
    assert hints.hint_sentence(round_, "left_to_right") == specific_hint([3, "+", 5, "*", 3, "*", 1], "left_to_right")
    assert not hasattr(hints, "reword_hint")


def _fraction(text: str) -> Fraction:
    return Fraction(text.replace("−", "-"))


def _random_expression(rng: random.Random) -> list:
    """Four cards 1-10 and three operators, with a random pair of parentheses about half the time."""
    tokens = []
    for index in range(4):
        tokens += [rng.randint(1, 10)] + ([rng.choice(OPERATORS)] if index < 3 else [])
    if rng.random() < 0.5:
        start, end = sorted(rng.sample(range(4), 2))
        numbers = [position for position, token in enumerate(tokens) if type(token) is int]
        tokens.insert(numbers[end] + 1, ")")
        tokens.insert(numbers[start], "(")
    return tokens


def test_every_diagnosed_hint_says_what_the_rule_makes_and_gives_parentheses_that_make_24():
    rng = random.Random(24)
    diagnosed = 0
    while diagnosed < 150:
        tokens = _random_expression(rng)
        misconception = diagnose_check(tokens)
        if misconception is None:
            continue
        diagnosed += 1
        sentence = specific_hint(tokens, misconception)
        made, meant = sentence.split(" Parentheses show the order you used: ")
        value = work_out(tokens, RULE).value
        if value is None:
            assert made.endswith("so it divides by 0, which can't be done."), sentence
        else:
            assert _fraction(made.split("so it makes ")[1].removesuffix(".")) == value, sentence
        meant = meant.removesuffix(" = 24.")
        meant_tokens = [
            int(piece) if piece.isdigit() else _SYMBOL_TO_PYTHON.get(piece, piece)
            for piece in re.findall(r"\d+|[+−×÷()]", meant)
        ]
        assert work_out(meant_tokens, RULE).value == 24, sentence
