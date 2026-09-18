"""Dealing Cover the Number: one round is a whole game of 10 turns each, the student's board against Robo's.

Levels: 1 one die, board 1-6 (dice patterns); 2 one card of 1-10 scattered dots, board 1-10 (K.CC.B.5, "as many as
10 things in a scattered configuration"); 3 two dice, board 2-12 (1.OA.C.6). Every roll is made when the game is
dealt, dots included, so a saved game always replays the same way. A turn can use at most 1 + 2 rolls, so each player
gets 3 rolls per turn in advance.
"""

import random
from math import dist
from typing import Literal

from pydantic import BaseModel

BOARDS = {1: list(range(1, 7)), 2: list(range(1, 11)), 3: list(range(2, 13))}
TURNS = 10
STUDENT_ROLLS_AGAIN = 1
ROBO_ROLLS_AGAIN = {1: 0, 2: 1, 3: 2}
ROLLS_PER_PLAYER = TURNS * 3
MIN_GAP = 22

Step = Literal["roll", "tap", "roll_again", "pass", "robo", "over"]


class Roll(BaseModel):
    """One die (one value), a dot card (one value and its dot positions in a 100 x 100 card) or two dice."""

    values: list[int]
    dots: list[tuple[int, int]] | None = None


class RoboTurn(BaseModel):
    rolls: list[Roll]
    covered: int | None


class Round(BaseModel):
    level: int
    my_rolls: list[Roll]
    robo_rolls: list[Roll]
    my_covered: list[int] = []
    robo_covered: list[int] = []
    step: Step = "roll"
    turn: int = 1
    my_next_roll: int = 0
    robo_next_roll: int = 0
    my_roll: Roll | None = None
    rolled_again: bool = False
    tapped: int | None = None
    tapped_roll: Roll | None = None
    tap_result: Literal["covered", "already", "wrong"] | None = None
    last_graded: tuple[list[int], int] | None = None
    robo_last: RoboTurn | None = None


def scattered_dots(count: int, generator: random.Random) -> list[tuple[int, int]]:
    """`count` dots placed at random in the card, each at least MIN_GAP from the others."""
    while True:
        dots: list[tuple[int, int]] = []
        for _ in range(200):
            point = (generator.randint(10, 90), generator.randint(10, 90))
            if all(dist(point, other) >= MIN_GAP for other in dots):
                dots.append(point)
                if len(dots) == count:
                    return dots


def _roll(level: int, generator: random.Random) -> Roll:
    if level == 1:
        return Roll(values=[generator.randint(1, 6)])
    if level == 2:
        count = generator.randint(1, 10)
        return Roll(values=[count], dots=scattered_dots(count, generator))
    return Roll(values=[generator.randint(1, 6), generator.randint(1, 6)])


def new_round(level: int) -> Round:
    """Deal a game at `level` (1-3): both boards open and every roll made in advance."""
    generator = random.Random(random.getrandbits(32))
    return Round(
        level=level,
        my_rolls=[_roll(level, generator) for _ in range(ROLLS_PER_PLAYER)],
        robo_rolls=[_roll(level, generator) for _ in range(ROLLS_PER_PLAYER)],
    )
