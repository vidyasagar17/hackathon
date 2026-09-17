"""Dealing Four in a Row: one round is a whole game on a 5 x 5 board of numbers shared with Robo.

Levels: 1 cards 0-5 (sums within 10, K.OA.A.5); 2 a 10 and a card 1-9 in either order (teen numbers as ten and some
ones, K.NBT.A.1); 3 cards 0-10 with sums 11-20 (1.OA.C.6). Each space holds a level fact's sum (70%) or one of that
fact's mistake numbers, so a wrong tap can usually show the mistake. Facts are dealt one at a time from a generator
started by the game's seed and the deal number, so a saved game always replays the same way.
"""

import random
from typing import Literal

from pydantic import BaseModel

from .misconceptions import mistake_numbers

SIZE = 5
CELLS = SIZE * SIZE
IN_A_ROW = 4
SUM_SHARE = 0.7

Fact = tuple[int, int]
Owner = Literal["mine", "robo"] | None

FACTS: dict[int, list[Fact]] = {
    1: [(a, b) for a in range(6) for b in range(6)],
    2: [(10, n) for n in range(1, 10)] + [(n, 10) for n in range(1, 10)],
    3: [(a, b) for a in range(11) for b in range(11) if 11 <= a + b <= 20],
}


def _lines() -> list[list[int]]:
    lines = []
    for row in range(SIZE):
        for column in range(SIZE):
            for down, across in ((0, 1), (1, 0), (1, 1), (1, -1)):
                places = [(row + down * step, column + across * step) for step in range(IN_A_ROW)]
                if all(0 <= r < SIZE and 0 <= c < SIZE for r, c in places):
                    lines.append([r * SIZE + c for r, c in places])
    return lines


LINES = _lines()


class RoboTurn(BaseModel):
    fact: Fact
    cell: int


class Round(BaseModel):
    level: int
    seed: int
    cells: list[int]
    owners: list[Owner]
    fact: Fact | None
    step: Literal["tap", "pass", "robo", "over"] = "tap"
    deals: int = 1
    tapped: int | None = None
    tapped_fact: Fact | None = None
    robo_last: RoboTurn | None = None


def deal_fact(cells: list[int], owners: list[Owner], level: int, seed: int, deal: int) -> Fact | None:
    """A level fact whose sum is on an open space, preferring one whose mistake number is also open; None if none."""
    open_numbers = {cells[index] for index, owner in enumerate(owners) if owner is None}
    dealable = [fact for fact in FACTS[level] if sum(fact) in open_numbers]
    telling = [fact for fact in dealable if mistake_numbers(*fact) & open_numbers]
    choices = telling or dealable
    return random.Random(seed * 1000 + deal).choice(choices) if choices else None


def line_for(owners: list[Owner]) -> tuple[str, list[int]] | None:
    """The first line of four covered by one player, with its owner."""
    for line in LINES:
        owner = owners[line[0]]
        if owner and all(owners[index] == owner for index in line):
            return owner, line
    return None


def _lined_up(owners: list[Owner], who: str, cell: int) -> int:
    """The most of `who`'s spaces in any line through `cell` that the other player hasn't blocked."""
    return max(
        (sum(owners[index] == who for index in line) for line in LINES if cell in line and all(owners[index] in (None, who) for index in line)),
        default=0,
    )


def robo_cell(cells: list[int], owners: list[Owner], level: int, total: int) -> int:
    """The open space holding `total` that Robo covers. Level 1: the first. Level 2: the one most lined up with its own
    spaces. Level 3: a space that wins, else one that blocks three of the student's, else the one best for both."""
    spaces = [index for index, owner in enumerate(owners) if owner is None and cells[index] == total]
    if level == 1:
        return spaces[0]
    if level == 2:
        return max(spaces, key=lambda cell: (_lined_up(owners, "robo", cell), -cell))
    for who in ("robo", "mine"):
        for cell in spaces:
            if _lined_up(owners, who, cell) == IN_A_ROW - 1:
                return cell
    return max(spaces, key=lambda cell: (_lined_up(owners, "robo", cell) + _lined_up(owners, "mine", cell), -cell))


def _board(level: int, generator: random.Random) -> list[int]:
    cells = []
    for _ in range(CELLS):
        fact = generator.choice(FACTS[level])
        mistakes = sorted(mistake_numbers(*fact))
        cells.append(sum(fact) if generator.random() < SUM_SHARE or not mistakes else generator.choice(mistakes))
    return cells


def new_round(level: int) -> Round:
    """Deal a game at `level` (1-3): the board and the student's first fact."""
    seed = random.getrandbits(32)
    cells = _board(level, random.Random(seed))
    owners: list[Owner] = [None] * CELLS
    return Round(level=level, seed=seed, cells=cells, owners=owners, fact=deal_fact(cells, owners, level, seed, 0))
