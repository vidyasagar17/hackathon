"""Dealing Target Number: one round is one hand of the duel, five cards each and a shared target.

Levels (one new idea each): 1 cards 1-10, target 10-20, totals up to 20 (2.OA.B.2, the Illustrative Mathematics
task); 2 cards 1-10, target 21-40, totals up to 99 (2.NBT.B.5, one-digit steps across tens); 3 two cards 11-40 and
three 1-10, target 30-99 (two-digit steps). Every hand has a way for the student and for Robo with at least two
cards whose running totals never go below 0 or past the level's top. The hand's equation question is built from
the target and the smallest cards (see `_equation`).
"""

import random
from itertools import permutations, product
from typing import Literal

from pydantic import BaseModel

from .misconceptions import Equation, Sign, step_total

HAND_SIZE = 5
TOPS = {1: 20, 2: 99, 3: 99}
ROBO_MOST_CARDS = {1: 2, 2: 4, 3: 4}

WayStep = tuple[Sign | None, int]
"""A card of a way by its index in the hand, with the sign before it (None for the first card)."""


class Step(BaseModel):
    """One graded step: `before` sign `card` typed as `answer`; the way goes on from the right total."""

    before: int
    sign: Sign
    card: int
    answer: int


class Round(BaseModel):
    level: int
    cards: list[int]
    robo_cards: list[int]
    target: int
    equation: Equation
    way: list[WayStep] = []
    steps: list[Step] = []
    total: int | None = None
    made: bool = False
    shown_way: bool = False
    last_graded: Literal["step", "equation"] | None = None
    robo_played: bool = False
    robo_way: list[WayStep] | None = None
    equation_answer: int | None = None


def find_way(cards: list[int], target: int, top: int, most_cards: int = HAND_SIZE) -> list[WayStep] | None:
    """A way to `target` with the fewest cards (at least two, at most `most_cards`), or None.

    Ties go to the first in card order, then to + before -.
    """
    for size in range(2, min(most_cards, len(cards)) + 1):
        for order in permutations(range(len(cards)), size):
            for signs in product(("+", "-"), repeat=size - 1):
                total = cards[order[0]]
                for sign, index in zip(signs, order[1:]):
                    total = step_total(total, sign, cards[index])
                    if not 0 <= total <= top:
                        break
                else:
                    if total == target:
                        return [(None, order[0]), *zip(signs, order[1:])]
    return None


def robo_way(cards: list[int], target: int, level: int) -> list[WayStep] | None:
    """Robo's way, using at most 2, 4 and 4 cards by level: on dealt hands it finds one about 47%, 75% and 85% of
    the time, and never shows wrong math."""
    return find_way(cards, target, TOPS[level], ROBO_MOST_CARDS[level])


def _cards(level: int) -> list[int]:
    if level == 3:
        cards = [random.randint(11, 40) for _ in range(2)] + [random.randint(1, 10) for _ in range(3)]
        random.shuffle(cards)
        return cards
    return [random.randint(1, 10) for _ in range(HAND_SIZE)]


def _target(level: int) -> int:
    low, high = {1: (10, 20), 2: (21, 40), 3: (30, 99)}[level]
    return random.randint(low, high)


def _equation(level: int, cards: list[int], robo_cards: list[int], target: int) -> Equation | None:
    """Level 1: target = Robo's smallest card + box. Levels 2-3: the student's smallest card + the rest of the target
    = Robo's smallest card + box, so both sides make the target. None when the numbers don't fit."""
    mine, robo = min(cards), min(robo_cards)
    if robo >= target:
        return None
    if level == 1:
        return Equation(left=[target], right=robo)
    if mine >= target or mine == robo:
        return None
    return Equation(left=[mine, target - mine], right=robo)


def new_round(level: int) -> Round:
    """Deal a hand at `level` (1-3), redealing until both hands have a way and the equation fits."""
    top = TOPS[level]
    while True:
        cards, robo_cards, target = _cards(level), _cards(level), _target(level)
        equation = _equation(level, cards, robo_cards, target)
        if equation and find_way(cards, target, top) and find_way(robo_cards, target, top):
            return Round(level=level, cards=cards, robo_cards=robo_cards, target=target, equation=equation)
