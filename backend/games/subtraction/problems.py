import random
from typing import Literal

from pydantic import BaseModel

Place = Literal["hundreds", "tens", "ones"]

PLACES: list[Place] = ["hundreds", "tens", "ones"]

MIN_DIFFICULTY = 1
MAX_DIFFICULTY = 3


class ColumnBreakdown(BaseModel):
    place: Place
    minuend_digit: int
    subtrahend_digit: int
    borrows: bool


class Problem(BaseModel):
    minuend: int
    subtrahend: int
    answer: int
    columns: list[ColumnBreakdown]
    difficulty: int


def compute_columns(minuend: int, subtrahend: int) -> list[ColumnBreakdown]:
    """Trace the standard right-to-left borrowing algorithm column by column."""
    m_digits = [int(d) for d in f"{minuend:03d}"]
    s_digits = [int(d) for d in f"{subtrahend:03d}"]

    borrows_by_index: dict[int, bool] = {}
    borrow_from_left = 0
    for i in (2, 1, 0):
        adjusted_digit = m_digits[i] - borrow_from_left
        borrows_by_index[i] = adjusted_digit < s_digits[i]
        borrow_from_left = 1 if borrows_by_index[i] else 0

    return [
        ColumnBreakdown(
            place=PLACES[i],
            minuend_digit=m_digits[i],
            subtrahend_digit=s_digits[i],
            borrows=borrows_by_index[i],
        )
        for i in range(3)
    ]


def classify_difficulty(columns: list[ColumnBreakdown]) -> int:
    """Tier 1: single borrow. Tier 2: cascading borrows. Tier 3: borrow across a zero."""
    by_place = {c.place: c for c in columns}
    borrow_count = sum(1 for c in columns if c.borrows)
    across_zero = by_place["tens"].minuend_digit == 0 and by_place["ones"].borrows

    if across_zero:
        return 3
    if borrow_count >= 2:
        return 2
    if borrow_count == 1:
        return 1
    return 0


def generate_problem(difficulty: int = MIN_DIFFICULTY) -> Problem:
    """Generate a random 3-digit subtraction problem matching the given difficulty tier."""
    difficulty = max(MIN_DIFFICULTY, min(MAX_DIFFICULTY, difficulty))
    while True:
        minuend = random.randint(101, 999)
        subtrahend = random.randint(100, minuend - 1)
        columns = compute_columns(minuend, subtrahend)
        if classify_difficulty(columns) == difficulty:
            return Problem(
                minuend=minuend,
                subtrahend=subtrahend,
                answer=minuend - subtrahend,
                columns=columns,
                difficulty=difficulty,
            )
