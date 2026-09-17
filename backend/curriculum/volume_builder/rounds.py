"""Dealing Volume Builder: one round is one turn of the duel, a box for the student and a box for Robo.

Levels (one new idea each): 1 edges 2-4 and at most 36 cubes (5.MD.C.3-4, count the cubes; every box hides some);
2 edges 2-5 and 40-100 cubes (5.MD.C.5a, too many to count one by one); 3 edges 3-6 (5.MD.C.5b, a hidden middle).
A dealt box always has a different box with edges 1-10 holding the same cubes, and no mistake gives its volume
(a box without a middle has no outside-cubes mistake). Robo builds by a level rule and never builds wrongly.
"""

import random
from itertools import product
from typing import Literal

from pydantic import BaseModel

from .misconceptions import Box, mistake_numbers, same_box, volume

BUILD_EDGES = range(1, 11)

_LEVEL_RULES = {1: ((2, 4), (1, 36)), 2: ((2, 5), (40, 100)), 3: ((3, 6), (1, 216))}

_ALL_BUILDS = list(product(BUILD_EDGES, repeat=3))


class Round(BaseModel):
    """A turn: `count` and `built` are the student's graded answers; `robo_built` is None when Robo found no box."""

    level: int
    box: Box
    robo_box: Box
    count: int | None = None
    built: Box | None = None
    last_graded: Literal["count", "build"] | None = None
    robo_played: bool = False
    robo_built: Box | None = None


def other_boxes(box: Box) -> list[Box]:
    """Every box with edges 1-10 that holds the same cubes in a different shape, each way round."""
    return [build for build in _ALL_BUILDS if volume(build) == volume(box) and not same_box(build, box)]


def _dealable(box: Box, level: int) -> bool:
    (low, high), (fewest, most) = _LEVEL_RULES[level]
    return (
        all(low <= edge <= high for edge in box)
        and fewest <= volume(box) <= most
        and bool(other_boxes(box))
        and all(volume(box) not in numbers for name, numbers in mistake_numbers(box) if name != "counted_outside_cubes")
    )


LEVEL_BOXES: dict[int, list[Box]] = {
    level: [box for box in product(range(1, 7), repeat=3) if _dealable(box, level)] for level in _LEVEL_RULES
}


def _halved_and_doubled(box: Box, build: Box) -> bool:
    """One edge halved and another doubled, the third kept in place."""
    changed = [index for index in range(3) if box[index] != build[index]]
    return len(changed) == 2 and sorted(box[index] / build[index] for index in changed) == [0.5, 2]


_ROBO_FINDS = {
    1: _halved_and_doubled,
    2: lambda box, build: any(box[index] == build[index] for index in range(3)),
    3: lambda box, build: True,
}


def robo_build(box: Box, level: int) -> Box | None:
    """The box Robo builds with the same cubes, or None. Robo never uses an edge of 1; level 1 only halves one
    edge and doubles another, level 2 keeps one edge in place, level 3 tries every box. On the level's own boxes
    it finds one about 47%, 79% and 94% of the time. Of several, the one with the shortest longest edge."""
    found = [build for build in other_boxes(box) if min(build) >= 2 and _ROBO_FINDS[level](box, build)]
    return min(found, key=lambda build: (max(build), build), default=None)


def new_round(level: int) -> Round:
    """Deal a turn at `level` (1-3): a box for the student and one for Robo, both from the level's boxes."""
    return Round(level=level, box=random.choice(LEVEL_BOXES[level]), robo_box=random.choice(LEVEL_BOXES[level]))
