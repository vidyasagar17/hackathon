from .hints import GENERAL_HINT, hint_sentence
from .misconceptions import diagnose_tap
from .moves import computer_move, evaluate_move
from .rounds import Roll, Round
from .sentences import specific_hint


def test_counting_hints():
    assert specific_hint([5], "counted_one_too_many") == "Say one number for each dot, and each dot only once: 1, 2, 3, 4, 5. That's 5."
    assert specific_hint([5], "counted_one_too_few") == "Give every dot a number, even the last one: 1, 2, 3, 4, 5. That's 5."
    assert specific_hint([1], "counted_one_too_many") == "Say one number for each dot, and each dot only once: 1. That's 1."
    assert specific_hint([3, 5], "counted_one_too_many") == (
        "Say one number for each dot, and each dot only once: 1, 2, 3, 4, 5, 6, 7, 8. That's 8."
    )


def test_two_dice_hints_are_shut_the_boxs():
    assert specific_hint([3, 5], "one_more_than_second") == "Start at 5 and count on 3 more: 6, 7, 8."
    assert specific_hint([3, 5], "counted_on_from_start") == "When you count on from 5, the first number you say is 6: 6, 7, 8."
    assert specific_hint([3, 5], "subtracted_instead") == "Put the dice together: 3 and 5 make 8."


def test_every_diagnosed_tap_has_a_hint_ending_with_the_right_number():
    rolls = [[n] for n in range(1, 11)] + [[a, b] for a in range(1, 7) for b in range(1, 7)]
    for values in rolls:
        for tapped in range(0, 14):
            name = diagnose_tap(values, tapped)
            if name:
                assert specific_hint(values, name).rstrip(".").endswith(str(sum(values)))


def test_the_hint_follows_the_last_tap_even_after_the_next_roll():
    round = Round(level=1, my_rolls=[Roll(values=[4])] * 30, robo_rolls=[Roll(values=[2])] * 30)
    for move in ({"type": "roll"}, {"type": "tap", "number": 5}, {"type": "robo_turn"}, {"type": "roll"}):
        round = computer_move(evaluate_move(round, move).round, 1)
    assert hint_sentence(round, "counted_one_too_many").endswith("That's 4.")
    assert GENERAL_HINT == "Touch each dot once and say one number for it. The last number you say is how many."
