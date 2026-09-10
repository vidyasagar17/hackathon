import random
from typing import Literal

from pydantic import BaseModel

Place = Literal["tens", "ones"]

PLACES: list[Place] = ["tens", "ones"]

MIN_DIFFICULTY = 1
MAX_DIFFICULTY = 3


class ColumnBreakdown(BaseModel):
    place: Place
    multiplicand_digit: int
    multiplier_digit: int
    carries: bool


class Problem(BaseModel):
    multiplicand: int
    multiplier: int
    answer: int
    columns: list[ColumnBreakdown]
    difficulty: int


def compute_columns(multiplicand: int, multiplier: int) -> list[ColumnBreakdown]:
    """Trace the standard right-to-left carrying algorithm column by column."""
    digits = [int(d) for d in f"{multiplicand:02d}"]

    carries_by_index: dict[int, bool] = {}
    carry_in = 0
    for i in (1, 0):
        product = digits[i] * multiplier + carry_in
        carries_by_index[i] = product >= 10
        carry_in = 1 if carries_by_index[i] else 0

    return [
        ColumnBreakdown(
            place=PLACES[i],
            multiplicand_digit=digits[i],
            multiplier_digit=multiplier,
            carries=carries_by_index[i],
        )
        for i in range(2)
    ]


def classify_difficulty(columns: list[ColumnBreakdown]) -> int:
    """Tier 1: no carries. Tier 2: ones carries only. Tier 3: carry cascades to a 3rd digit."""
    by_place = {c.place: c for c in columns}
    if by_place["tens"].carries:
        return 3
    if by_place["ones"].carries:
        return 2
    return 1


def generate_problem(difficulty: int = MIN_DIFFICULTY) -> Problem:
    """Generate a random 2-digit x 1-digit multiplication problem matching the given difficulty tier."""
    difficulty = max(MIN_DIFFICULTY, min(MAX_DIFFICULTY, difficulty))
    while True:
        multiplicand = random.randint(10, 99)
        multiplier = random.randint(2, 9)
        columns = compute_columns(multiplicand, multiplier)
        if classify_difficulty(columns) == difficulty:
            return Problem(
                multiplicand=multiplicand,
                multiplier=multiplier,
                answer=multiplicand * multiplier,
                columns=columns,
                difficulty=difficulty,
            )
