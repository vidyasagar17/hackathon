"""Dealing a For Keeps game: four hands, each dealing four digit cards 0-9 to the student and to Robo.

One engine round holds the whole game, since "keep exactly two scores" spans all four hands.
All hands are dealt up front; the server keeps the round, so later hands stay hidden.
Each hand's two built numbers are stored larger first.
"""

import random
from typing import Literal

from pydantic import BaseModel

HANDS = 4
CARDS_PER_HAND = 4
KEEPS = 2

Step = Literal["arrange", "difference", "keep", "over"]


class Hand(BaseModel):
    my_cards: list[int]
    robo_cards: list[int]
    my_numbers: tuple[int, int] | None = None
    robo_numbers: tuple[int, int] | None = None
    my_answer: int | None = None
    my_kept: bool | None = None
    robo_kept: bool | None = None


class Round(BaseModel):
    level: int
    hands: list[Hand]
    hand_number: int = 1
    step: Step = "arrange"


def _cards() -> list[int]:
    """Four independent digit cards; a queen counts as 0."""
    return [random.randint(0, 9) for _ in range(CARDS_PER_HAND)]


def new_round(level: int) -> Round:
    """Deal a game at `level` (1-3), starting at hand 1, step arrange."""
    hands = [Hand(my_cards=_cards(), robo_cards=_cards()) for _ in range(HANDS)]
    return Round(level=level, hands=hands)
