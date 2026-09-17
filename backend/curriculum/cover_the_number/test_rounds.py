from math import dist

from .rounds import BOARDS, MIN_GAP, ROBO_ROLLS_AGAIN, ROLLS_PER_PLAYER, TURNS, new_round, scattered_dots


def test_boards_and_turns_by_level():
    assert BOARDS == {1: list(range(1, 7)), 2: list(range(1, 11)), 3: list(range(2, 13))}
    assert TURNS == 10
    assert ROBO_ROLLS_AGAIN == {1: 0, 2: 1, 3: 2}


def test_rolls_are_made_at_deal_time_and_fit_the_level():
    for level in (1, 2, 3):
        for _ in range(100):
            round = new_round(level)
            assert len(round.my_rolls) == len(round.robo_rolls) == ROLLS_PER_PLAYER
            for roll in round.my_rolls + round.robo_rolls:
                if level == 1:
                    assert len(roll.values) == 1 and 1 <= roll.values[0] <= 6 and roll.dots is None
                elif level == 2:
                    assert len(roll.values) == 1 and 1 <= roll.values[0] <= 10
                    assert len(roll.dots) == roll.values[0]
                else:
                    assert len(roll.values) == 2 and all(1 <= value <= 6 for value in roll.values) and roll.dots is None
            assert round.my_covered == [] and round.robo_covered == [] and round.step == "roll"


def test_scattered_dots_stay_in_the_card_and_never_touch():
    import random

    for count in range(1, 11):
        for seed in range(50):
            dots = scattered_dots(count, random.Random(seed))
            assert len(dots) == count
            assert all(10 <= x <= 90 and 10 <= y <= 90 for x, y in dots)
            assert all(dist(a, b) >= MIN_GAP for i, a in enumerate(dots) for b in dots[i + 1 :])
