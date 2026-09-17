"""Dealing Coordinate Plane Battleship: one round is a whole game of `TURNS` turns each, both fleets hidden on the server.

Ships are straight lines of points, never overlapping or side by side. Levels: 1 grid 0-4 with no ship on an
axis (no zeros in a pair); 2 grid 0-5 where ships may sit on an axis; 3 grid 0-5 with a third ship and a
stronger Robo. The seed makes Robo's aim replay the same way for a saved game.
"""

import random
from typing import Literal

from pydantic import BaseModel

from .misconceptions import Point

TURNS = 8

Step = Literal["aim", "write", "pass", "robo", "read", "over"]


class Level(BaseModel):
    size: int
    fleet: list[int]
    axes: bool
    robo: Literal["random", "hunt", "checkerboard"]


LEVELS: dict[int, Level] = {
    1: Level(size=4, fleet=[3, 2], axes=False, robo="random"),
    2: Level(size=5, fleet=[3, 2], axes=True, robo="hunt"),
    3: Level(size=5, fleet=[3, 2, 2], axes=True, robo="checkerboard"),
}


class Round(BaseModel):
    level: int
    seed: int
    my_ships: list[list[Point]]
    robo_ships: list[list[Point]]
    my_shots: list[Point] = []
    robo_shots: list[Point] = []
    turn: int = 1
    step: Step = "aim"
    aim: Point | None = None
    written: Point | None = None
    robo_call: Point | None = None
    tapped: Point | None = None
    last_graded: Literal["write", "read"] | None = None


def neighbors(point: Point) -> list[Point]:
    x, y = point
    return [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]


def _ship(length: int, config: Level, rng: random.Random) -> list[Point]:
    low = 0 if config.axes else 1
    across = rng.random() < 0.5
    far = config.size - length + 1
    x = rng.randint(low, far if across else config.size)
    y = rng.randint(low, config.size if across else far)
    return [(x + step, y) if across else (x, y + step) for step in range(length)]


def place_fleet(config: Level, rng: random.Random) -> list[list[Point]]:
    """Ships of the level's lengths, in the grid, never sharing or sitting next to another ship's point."""
    while True:
        ships: list[list[Point]] = []
        for length in config.fleet:
            for _ in range(100):
                ship = _ship(length, config, rng)
                taken = {point for other in ships for point in other}
                if not any(point in taken or set(neighbors(point)) & taken for point in ship):
                    ships.append(ship)
                    break
        if len(ships) == len(config.fleet):
            return ships


def new_round(level: int) -> Round:
    """Deal a game at `level` (1-3): both fleets placed and a seed for Robo's aim."""
    config = LEVELS[level]
    rng = random.Random()
    return Round(level=level, seed=rng.getrandbits(32), my_ships=place_fleet(config, rng), robo_ships=place_fleet(config, rng))
