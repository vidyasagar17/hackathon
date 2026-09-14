import random
from typing import Literal

from pydantic import BaseModel, model_validator

Place = Literal["tens", "ones"]
AnswerPlace = Literal["hundreds", "tens", "ones"]

ANSWER_PLACES: list[AnswerPlace] = ["hundreds", "tens", "ones"]

MIN_DIFFICULTY = 1
MAX_DIFFICULTY = 3


class ColumnBreakdown(BaseModel):
    place: Place


class Problem(BaseModel):
    dividend: int
    divisor: int
    answer: int
    columns: list[ColumnBreakdown]
    answer_places: list[AnswerPlace] = ANSWER_PLACES
    difficulty: int

    @model_validator(mode="after")
    def _follows_from_its_numbers(self) -> "Problem":
        """Reject a problem that isn't an exact division matching its answer and columns."""
        if self.divisor < 1 or self.dividend != self.divisor * self.answer:
            raise ValueError("answer does not match dividend / divisor")
        if [c.place for c in self.columns] != _places_for(self.answer):
            raise ValueError("columns do not match the answer")
        return self


def _trace(dividend: int, divisor: int) -> tuple[int, int, int, int]:
    """Trace the standard long-division algorithm: divide the tens, then bring down the ones."""
    tens_digit, ones_digit = divmod(dividend, 10)
    q1, r1 = divmod(tens_digit, divisor)
    value2 = r1 * 10 + ones_digit
    q2, r2 = divmod(value2, divisor)
    return q1, r1, q2, r2


def classify_difficulty(dividend: int, divisor: int) -> int:
    """Tier 1: single-digit quotient. Tier 2: two-digit quotient, no regroup. Tier 3: regroup needed."""
    quotient = dividend // divisor
    if quotient < 10:
        return 1
    _q1, r1, _q2, _r2 = _trace(dividend, divisor)
    return 3 if r1 > 0 else 2


def _places_for(answer: int) -> list[Place]:
    return ["ones"] if answer < 10 else ["tens", "ones"]


def generate_problem(difficulty: int = MIN_DIFFICULTY) -> Problem:
    """Generate a random exact-division problem (2-digit dividend, 1-digit divisor) matching the tier."""
    difficulty = max(MIN_DIFFICULTY, min(MAX_DIFFICULTY, difficulty))
    while True:
        divisor = random.randint(2, 9)
        if difficulty == 1:
            quotient = random.randint(1, 9)
        else:
            max_quotient = max(10, 99 // divisor)
            quotient = random.randint(10, max_quotient)
        dividend = divisor * quotient
        if dividend > 99:
            continue
        if classify_difficulty(dividend, divisor) == difficulty:
            return Problem(
                dividend=dividend,
                divisor=divisor,
                answer=quotient,
                columns=[ColumnBreakdown(place=p) for p in _places_for(quotient)],
                difficulty=difficulty,
            )
