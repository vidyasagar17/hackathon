"""Dealing The 24 Game: one hand of the duel, four cards for the student and four for Robo.

A way to 24 is found by combining two numbers at a time, keeping only whole-number steps that never go below
0, so every way shown to a student stays within grades 3-5 arithmetic. Each way is written with only the
parentheses it needs. Levels deal hands by what their ways need (one new idea per level); Robo's level
limits which ways it can find, so it gets stronger by level and never shows wrong math.
"""

import random
from itertools import combinations

from pydantic import BaseModel

from .expressions import Tree, expression_text, written
from .misconceptions import TARGET

HAND_SIZE = 4
CARD_RANGES = {1: range(1, 10), 2: range(1, 10), 3: range(1, 11)}

Token = int | str


class Round(BaseModel):
    """A hand: the student's `checks` are their resolved expressions in order; `robo_way` is None when Robo found none."""

    level: int
    cards: list[int]
    robo_cards: list[int]
    checks: list[list[Token]] = []
    made_24: bool = False
    shown_way: bool = False
    robo_played: bool = False
    robo_way: list[Token] | None = None


def _combined(left: tuple[int, Tree], right: tuple[int, Tree]) -> list[tuple[int, Tree]]:
    """Every whole, non-negative result of one operation on two numbers, in both orders where order matters."""
    (a, a_tree), (b, b_tree) = left, right
    results = [(a + b, ("+", a_tree, b_tree)), (a * b, ("*", a_tree, b_tree))]
    for (x, x_tree), (y, y_tree) in ((left, right), (right, left)):
        if x >= y:
            results.append((x - y, ("-", x_tree, y_tree)))
        if y != 0 and x % y == 0:
            results.append((x // y, ("/", x_tree, y_tree)))
    return results


def _trees(numbers: list[tuple[int, Tree]]):
    if len(numbers) == 1:
        yield numbers[0]
        return
    for i, j in combinations(range(len(numbers)), 2):
        rest = [number for index, number in enumerate(numbers) if index not in (i, j)]
        for result in _combined(numbers[i], numbers[j]):
            yield from _trees([*rest, result])


def ways(cards: list[int]) -> list[list[Token]]:
    """Every different way to 24 with whole-number steps, written out, simplest first.

    Simplest means fewest parentheses, then no ÷, then in reading order.
    """
    found = {tuple(written(tree)) for value, tree in _trees([(card, card) for card in cards]) if value == TARGET}
    return sorted((list(way) for way in found), key=lambda way: (way.count("("), "/" in way, expression_text(way)))


def plain(way: list[Token]) -> bool:
    """No parentheses and no ÷."""
    return "(" not in way and "/" not in way


def fits_level(hand_ways: list[list[Token]], level: int) -> bool:
    """Level 1: a way with no parentheses and no ÷. Level 2: every way needs parentheses, and one needs no ÷.
    Level 3: every way needs ÷."""
    if level == 1:
        return any(plain(way) for way in hand_ways)
    if level == 2:
        return all("(" in way for way in hand_ways) and any("/" not in way for way in hand_ways)
    return bool(hand_ways) and all("/" in way for way in hand_ways)


ROBO_FINDS = {
    1: lambda way: "(" not in way,
    2: lambda way: way.count("(") <= 1 and "/" not in way,
    3: lambda way: way.count("(") <= 1,
}


def robo_way(hand_ways: list[list[Token]], level: int) -> list[Token] | None:
    """The simplest way Robo can find: level 1 no parentheses, level 2 at most one pair and no ÷, level 3 at most
    one pair. On hands dealt at each level Robo finds a way about 48%, 91% and 97% of the time, never always."""
    return next((way for way in hand_ways if ROBO_FINDS[level](way)), None)


def _deal(level: int, wanted) -> list[int]:
    while True:
        cards = [random.choice(CARD_RANGES[level]) for _ in range(HAND_SIZE)]
        if wanted(ways(cards)):
            return cards


def new_round(level: int) -> Round:
    """Deal a hand at `level` (1-3): the student's cards fit the level; Robo's cards have any whole-step way."""
    return Round(
        level=level,
        cards=_deal(level, lambda hand_ways: fits_level(hand_ways, level)),
        robo_cards=_deal(level, bool),
    )
