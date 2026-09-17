"""Dealing Clock Match: one round is one turn of the duel, a card for the student and a card for Robo.

A card is a time from the level's list and a kind: "read" shows a clock and asks for the time, "set" shows the time
and asks for the clock. Robo is marked at deal time as knowing its card or not (50% / 65% / 80% by level), so it is
never shown giving a wrong time.
"""

import random
from typing import Literal

from pydantic import BaseModel

from .misconceptions import Time, level_times

Kind = Literal["read", "set"]

ROBO_KNOWS = {1: 0.5, 2: 0.65, 3: 0.8}


class Round(BaseModel):
    level: int
    kind: Kind
    time: Time
    robo_kind: Kind
    robo_time: Time
    robo_knows: bool
    pick: int | None = None
    robo_played: bool = False


def new_round(level: int) -> Round:
    """Deal a turn at `level` (1-3)."""
    times = level_times(level)
    return Round(
        level=level,
        kind=random.choice(["read", "set"]),
        time=random.choice(times),
        robo_kind=random.choice(["read", "set"]),
        robo_time=random.choice(times),
        robo_knows=random.random() < ROBO_KNOWS[level],
    )
