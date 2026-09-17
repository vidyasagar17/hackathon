import random

import pytest

from .rounds import LEVELS, neighbors, new_round, place_fleet


@pytest.mark.parametrize("level", [1, 2, 3])
def test_fleets_fit_the_grid_are_straight_and_never_touch(level):
    config = LEVELS[level]
    rng = random.Random(level)
    low = 0 if config.axes else 1
    for _ in range(200):
        ships = place_fleet(config, rng)
        assert sorted(len(ship) for ship in ships) == sorted(config.fleet)
        for index, ship in enumerate(ships):
            assert all(low <= x <= config.size and low <= y <= config.size for x, y in ship)
            xs, ys = {x for x, _ in ship}, {y for _, y in ship}
            assert len(xs) == 1 or len(ys) == 1
            others = {point for other in ships[:index] + ships[index + 1 :] for point in other}
            assert not any(point in others or set(neighbors(point)) & others for point in ship)


def test_level_1_ships_never_sit_on_an_axis_and_level_2_ships_sometimes_do():
    rng = random.Random(3)
    assert all(0 not in point for _ in range(200) for ship in place_fleet(LEVELS[1], rng) for point in ship)
    assert any(0 in point for _ in range(200) for ship in place_fleet(LEVELS[2], rng) for point in ship)


def test_a_new_game_starts_at_the_first_aim_with_both_fleets_placed():
    round_ = new_round(3)
    assert (round_.step, round_.turn, round_.my_shots, round_.robo_shots) == ("aim", 1, [], [])
    assert len(round_.my_ships) == len(round_.robo_ships) == 3
