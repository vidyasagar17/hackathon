import random

import pytest

from .rounds import LEVELS, new_round


@pytest.mark.parametrize("level", [1, 2, 3])
def test_a_game_opens_both_boxes_and_rolls_every_die_within_the_levels_faces(level):
    random.seed(level)
    faces, tiles = LEVELS[level]
    for _ in range(30):
        round_ = new_round(level)
        assert round_.my_open == round_.robo_open == list(range(1, tiles + 1))
        assert len(round_.my_rolls) == len(round_.robo_rolls) == tiles
        for die in [die for dice in round_.my_rolls + round_.robo_rolls for die in dice]:
            assert 1 <= die <= faces
        assert round_.step == "roll"


def test_level_1_dice_have_1_to_3_dots_and_the_box_has_6_tiles():
    assert LEVELS == {1: (3, 6), 2: (6, 9), 3: (6, 12)}
