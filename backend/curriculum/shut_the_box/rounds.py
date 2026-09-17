"""Dealing Shut the Box: one round is a whole game, the student's box against Robo's.

Every roll is made when the game is dealt and kept on the server, so a saved game always replays the same
way. Each turn shuts at least one tile, so a player never needs more rolls than tiles. Levels:
1 dice with 1-3 dots and tiles 1-6 (K.OA.A.5, K.OA.A.3); 2 standard dice and tiles 1-9, the classic box
(1.OA.C.6); 3 standard dice and tiles 1-12. A game keeps the level it was dealt at.
"""

import random
from typing import Literal

from pydantic import BaseModel

LEVELS: dict[int, tuple[int, int]] = {1: (3, 6), 2: (6, 9), 3: (6, 12)}

Step = Literal["roll", "total", "shut", "pass", "robo", "over"]

Dice = tuple[int, int]


class GradedMove(BaseModel):
    """The student's latest graded move, kept for its hint: a total pick, or tiles picked to shut for `total`."""

    kind: Literal["total", "shut"]
    dice: Dice
    total: int
    tiles: list[int] = []


class RoboTurn(BaseModel):
    """What Robo did on its latest turn: its dice and the tiles it shut, or None when no tiles made the total."""

    dice: Dice
    shut: list[int] | None


class Round(BaseModel):
    level: int
    my_rolls: list[Dice]
    robo_rolls: list[Dice]
    my_open: list[int]
    robo_open: list[int]
    step: Step = "roll"
    my_turns: int = 0
    robo_turns: int = 0
    my_dice: Dice | None = None
    my_done: bool = False
    robo_done: bool = False
    total_pick: int | None = None
    picked_tiles: list[int] | None = None
    shut_tiles: list[int] | None = None
    last_graded: GradedMove | None = None
    robo_last: RoboTurn | None = None


def _rolls(faces: int, count: int) -> list[Dice]:
    return [(random.randint(1, faces), random.randint(1, faces)) for _ in range(count)]


def new_round(level: int) -> Round:
    """Deal a game at `level` (1-3): both boxes open and every roll made in advance."""
    faces, tiles = LEVELS[level]
    return Round(
        level=level,
        my_rolls=_rolls(faces, tiles),
        robo_rolls=_rolls(faces, tiles),
        my_open=list(range(1, tiles + 1)),
        robo_open=list(range(1, tiles + 1)),
    )
