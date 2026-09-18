from .hints import GENERAL_HINT, hint_sentence
from .misconceptions import diagnose_tap, mistake_numbers
from .moves import computer_move, evaluate_move
from .rounds import CELLS, FACTS, Round
from .sentences import specific_hint


def test_reversed_teen_hints_say_the_ten_comes_first():
    assert specific_hint(10, 4, "reversed_teen_digits") == "Fourteen is 1 ten and 4 ones, so the 1 comes first: 14."
    assert specific_hint(9, 3, "reversed_teen_digits") == "Twelve is 1 ten and 2 ones, so the 1 comes first: 12."


def test_counting_hints_are_addition_wars():
    assert specific_hint(3, 4, "one_more_than_second") == "Start at 4 and count on 3 more: 5, 6, 7."
    assert specific_hint(9, 5, "counted_on_from_start") == "When you count on from 9, the first number you say is 10: 10, 11, 12, 13, 14."
    assert specific_hint(9, 5, "subtracted_instead") == "Put the cards together: 9 and 5 make 14."


def test_every_diagnosed_tap_on_every_level_fact_has_a_hint_ending_with_the_sum():
    for level in (1, 2, 3):
        for first, second in FACTS[level]:
            for number in mistake_numbers(first, second):
                sentence = specific_hint(first, second, diagnose_tap(first, second, number))
                assert sentence.rstrip(".").endswith(str(first + second)), sentence


def test_hint_sentence_uses_the_fact_of_the_latest_tap():
    round = Round(level=2, seed=1, cells=[41] * CELLS, owners=[None] * CELLS, fact=(3, 3), tapped=0, tapped_fact=(10, 4))
    assert hint_sentence(round, "reversed_teen_digits").startswith("Fourteen")
    assert GENERAL_HINT == "Start at the bigger card and count on the smaller card's number."


def test_the_hint_still_names_the_tapped_fact_after_robos_turn():
    cells = [14, 14, 14, 14, 14, 41, 13] + [11] * (CELLS - 7)
    round = Round(level=2, seed=7, cells=cells, owners=[None] * CELLS, fact=(10, 4))
    round = evaluate_move(round, {"type": "tap", "cell": 5}).round
    round = computer_move(evaluate_move(round, {"type": "robo_turn"}).round, 2)
    assert hint_sentence(round, "reversed_teen_digits").startswith("Fourteen")
