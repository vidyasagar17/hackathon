"""Dealing Don't Break the Bank: one round is a whole game, the student's board against Robo's, same rolls for both.

A board is a list of spots, number by number, each number's digits from the left. Levels:
1 two 2-digit numbers, bank 100, die 1-6 (2.NBT.B.5); 2 three 3-digit numbers, bank 1,000, die 1-6
(2.NBT.B.7, the classic game); 3 the same with a 0-9 die (3.NBT.A.2). Every roll is made when the game is
dealt and kept on the server, so a saved game always replays the same way.
"""

import random
from typing import Literal

from pydantic import BaseModel

Step = Literal["place", "sum", "distance", "pass", "over"]


class Level(BaseModel):
    numbers: int
    width: int
    bank: int
    lowest: int
    highest: int
    aim: float
    looks_ahead: bool

    @property
    def spots(self) -> int:
        return self.numbers * self.width


LEVELS: dict[int, Level] = {
    1: Level(numbers=2, width=2, bank=100, lowest=1, highest=6, aim=0.7, looks_ahead=False),
    2: Level(numbers=3, width=3, bank=1000, lowest=1, highest=6, aim=0.9, looks_ahead=True),
    3: Level(numbers=3, width=3, bank=1000, lowest=0, highest=9, aim=0.9, looks_ahead=True),
}


class Round(BaseModel):
    level: int
    rolls: list[int]
    my_board: list[int | None]
    robo_board: list[int | None]
    step: Step = "place"
    robo_last_spot: int | None = None
    sum_answer: int | None = None
    distance_answer: int | None = None
    last_graded: Literal["sum", "distance"] | None = None


def board_numbers(board: list[int | None], width: int) -> list[int]:
    """The numbers a full board makes, e.g. [3, 4, 5, 2, 1, 2] with width 3 -> [345, 212]."""
    return [
        int("".join(str(digit) for digit in board[start : start + width])) for start in range(0, len(board), width)
    ]


def new_round(level: int) -> Round:
    """Deal a game at `level` (1-3): empty boards and every roll made in advance."""
    config = LEVELS[level]
    return Round(
        level=level,
        rolls=[random.randint(config.lowest, config.highest) for _ in range(config.spots)],
        my_board=[None] * config.spots,
        robo_board=[None] * config.spots,
    )
