import random
from typing import Literal

from pydantic import BaseModel

Place = Literal["hundreds", "tens", "ones"]

PLACES: list[Place] = ["hundreds", "tens", "ones"]

MIN_DIFFICULTY = 1
MAX_DIFFICULTY = 3


class ColumnBreakdown(BaseModel):
    place: Place
    addend1_digit: int
    addend2_digit: int
    carries: bool


class Problem(BaseModel):
    addend1: int
    addend2: int
    answer: int
    columns: list[ColumnBreakdown]
    difficulty: int


def compute_columns(addend1: int, addend2: int) -> list[ColumnBreakdown]:
    """Trace the standard right-to-left carrying algorithm column by column."""
    a_digits = [int(d) for d in f"{addend1:03d}"]
    b_digits = [int(d) for d in f"{addend2:03d}"]

    carries_by_index: dict[int, bool] = {}
    carry_in = 0
    for i in (2, 1, 0):
        total = a_digits[i] + b_digits[i] + carry_in
        carries_by_index[i] = total >= 10
        carry_in = 1 if carries_by_index[i] else 0

    return [
        ColumnBreakdown(
            place=PLACES[i],
            addend1_digit=a_digits[i],
            addend2_digit=b_digits[i],
            carries=carries_by_index[i],
        )
        for i in range(3)
    ]


def classify_difficulty(columns: list[ColumnBreakdown]) -> int:
    """Tier 1: single carry. Tier 2: cascading carries. Tier 3: overflow past the hundreds column."""
    by_place = {c.place: c for c in columns}
    carry_count = sum(1 for c in columns if c.carries)
    overflow = by_place["hundreds"].carries

    if overflow:
        return 3
    if carry_count >= 2:
        return 2
    if carry_count == 1:
        return 1
    return 0


def generate_problem(difficulty: int = MIN_DIFFICULTY) -> Problem:
    """Generate a random 3-digit addition problem matching the given difficulty tier."""
    difficulty = max(MIN_DIFFICULTY, min(MAX_DIFFICULTY, difficulty))
    while True:
        addend1 = random.randint(100, 999)
        addend2 = random.randint(100, 999)
        columns = compute_columns(addend1, addend2)
        if classify_difficulty(columns) == difficulty:
            return Problem(
                addend1=addend1,
                addend2=addend2,
                answer=addend1 + addend2,
                columns=columns,
                difficulty=difficulty,
            )
