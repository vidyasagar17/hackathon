"""Dealing Addition War and Take-Away War hands: each level deals cards in its standard's range.

One round is one hand: the student and Robo each get two cards, in the order dealt. Levels:
- Addition War: 1 cards 0-5 (K.OA.A.5); 2 cards 0-10 with sums within 10; 3 cards 0-10, sums to 20 (1.OA.C.6).
- Take-Away War: 1 cards 0-5; 2 cards 0-10 (K.OA.A.2); 3 one teen card 11-20 and one card 0-10 (1.OA.C.6).
Equal hands are dealt naturally; the student can answer "same".
"""

import random
from typing import Literal

from pydantic import BaseModel

from .misconceptions import Operation

Winner = Literal["mine", "robo", "same"]


class Round(BaseModel):
    operation: Operation
    level: int
    mine: tuple[int, int]
    robo: tuple[int, int]
    answer_pick: int | None = None
    winner_pick: Winner | None = None


def _hand(operation: Operation, level: int) -> tuple[int, int]:
    if operation == "take_away" and level == 3:
        cards = [random.randint(11, 20), random.randint(0, 10)]
        random.shuffle(cards)
        return cards[0], cards[1]
    highest = 5 if level == 1 else 10
    while True:
        first, second = random.randint(0, highest), random.randint(0, highest)
        if not (operation == "add" and level == 2 and first + second > 10):
            return first, second


def new_round(operation: Operation, level: int) -> Round:
    """Deal one hand to the student and one to Robo at `level` (1-3)."""
    return Round(operation=operation, level=level, mine=_hand(operation, level), robo=_hand(operation, level))
