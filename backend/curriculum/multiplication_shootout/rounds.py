"""Dealing Multiplication Shootout rounds: each level deals only the facts it diagnoses.

One round is one turn of the duel: the student's fact and Robo's fact, dealt from the same
level. Facts are picked evenly from the level's pool, so Robo's accuracy per level stays at
the rates its cutoffs were chosen for.
"""

import random
from typing import Literal

from pydantic import BaseModel

Operation = Literal["multiply", "divide"]

EASY_FACTORS = {0, 1, 2, 5}
DIVISION_SHARE = 1 / 3

MULTIPLICATION_POOLS: dict[int, list[tuple[int, int]]] = {
    1: [(a, b) for a in range(10) for b in range(10) if a in EASY_FACTORS or b in EASY_FACTORS],
    2: [(a, b) for a in range(3, 10) for b in range(3, 10)],
    3: [(a, b) for a in range(10) for b in range(10)],
}


class Fact(BaseModel):
    """A called fact: `left` x `right`, or `left` / `right` for a division fact with no remainder."""

    operation: Operation
    left: int
    right: int

    @property
    def correct_answer(self) -> int:
        if self.operation == "multiply":
            return self.left * self.right
        return self.left // self.right


class Round(BaseModel):
    level: int
    fact: Fact
    robo_fact: Fact
    answer: int | None = None
    robo_answer: int | None = None


def _division_fact() -> Fact:
    """A divisor and a quotient of 1-9, so it never divides by 0."""
    divisor, quotient = random.randint(1, 9), random.randint(1, 9)
    return Fact(operation="divide", left=divisor * quotient, right=divisor)


def _deal_fact(level: int) -> Fact:
    if level == 3 and random.random() < DIVISION_SHARE:
        return _division_fact()
    left, right = random.choice(MULTIPLICATION_POOLS[level])
    return Fact(operation="multiply", left=left, right=right)


def new_round(level: int) -> Round:
    """Deal a round at `level` (1-3): one fact for the student and one for Robo, no answers yet."""
    return Round(level=level, fact=_deal_fact(level), robo_fact=_deal_fact(level))
