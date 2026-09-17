import random

import pytest

from .rounds import LEVELS, board_numbers, new_round


@pytest.mark.parametrize("level", [1, 2, 3])
def test_a_game_has_empty_boards_and_a_roll_for_every_spot_within_the_levels_die(level):
    random.seed(level)
    config = LEVELS[level]
    for _ in range(40):
        round_ = new_round(level)
        assert round_.my_board == round_.robo_board == [None] * config.spots
        assert len(round_.rolls) == config.spots
        assert all(config.lowest <= roll <= config.highest for roll in round_.rolls)
        assert round_.step == "place"


def test_the_levels_follow_the_standards():
    assert [(c.numbers, c.width, c.bank, c.lowest, c.highest) for c in LEVELS.values()] == [
        (2, 2, 100, 1, 6),
        (3, 3, 1000, 1, 6),
        (3, 3, 1000, 0, 9),
    ]


def test_a_board_reads_as_numbers_from_the_left():
    assert board_numbers([3, 4, 5, 2, 1, 2, 0, 0, 7], 3) == [345, 212, 7]
    assert board_numbers([4, 6, 3, 8], 2) == [46, 38]
