"""Rule-based diagnosis and answer cards for Addition War and Take-Away War.

A round shows two cards, first (left) and second (right), in the order dealt. Addition War asks for
their sum; Take-Away War asks for the larger card minus the smaller, as in Subtraction Top-It.
Wrong answer cards come only from researched mistakes: Siegler & Shrager (1984), Secada, Fuson &
Hall (1983), and Fuson (1984, 1986). When mistakes collide, nearby numbers that are not researched
mistakes fill the row to four cards; picking one is undiagnosed.
"""

from typing import Callable, Literal

Operation = Literal["add", "take_away"]

MisconceptionName = Literal[
    "one_more_than_second",
    "counted_on_from_start",
    "subtracted_instead",
    "counted_down_off_by_one",
    "added_instead",
]

CHOICES = 4


def correct_answer(first: int, second: int, operation: Operation) -> int:
    return first + second if operation == "add" else abs(first - second)


def _one_more_than_second(first: int, second: int) -> list[int]:
    """Siegler & Shrager (1984): with the second addend larger, the most frequent error is one more than it (3 + 4 -> 5)."""
    return [second + 1] if second > first else []


def _counted_on_from_start(first: int, second: int) -> list[int]:
    """Counting on that says the start number again ends one short (3 + 4 counted "4, 5, 6" -> 6)."""
    return [first + second - 1]


def _subtracted_instead(first: int, second: int) -> list[int]:
    return [abs(first - second)]


def _counted_down_off_by_one(first: int, second: int) -> list[int]:
    """Fuson (1984, 1986): two ways of counting down interfere, so the count ends one step early or late."""
    difference = abs(first - second)
    return [difference - 1, difference + 1]


def _added_instead(first: int, second: int) -> list[int]:
    return [first + second]


_MISTAKES: dict[Operation, list[tuple[MisconceptionName, Callable[[int, int], list[int]]]]] = {
    "add": [
        ("one_more_than_second", _one_more_than_second),
        ("counted_on_from_start", _counted_on_from_start),
        ("subtracted_instead", _subtracted_instead),
    ],
    "take_away": [
        ("counted_down_off_by_one", _counted_down_off_by_one),
        ("added_instead", _added_instead),
    ],
}


def diagnose(first: int, second: int, operation: Operation, pick: int) -> MisconceptionName | None:
    """Return the researched mistake that gives `pick`, or None when it is correct or a filler.

    When two mistakes give the same number the first in `_MISTAKES` wins: 2 + 4 -> 5 is
    `one_more_than_second`, though counting on from the start also gives 5.
    """
    if pick == correct_answer(first, second, operation):
        return None
    for name, answers in _MISTAKES[operation]:
        if pick in answers(first, second):
            return name
    return None


def answer_choices(first: int, second: int, operation: Operation) -> list[int]:
    """Four different non-negative answer cards in order: the answer, its researched mistakes, then fillers.

    Fillers are the numbers nearest the answer that are not already cards.
    """
    correct = correct_answer(first, second, operation)
    choices = {correct}
    for _, answers in _MISTAKES[operation]:
        choices.update(answer for answer in answers(first, second) if answer >= 0)
    offset = 1
    while len(choices) < CHOICES:
        for candidate in (correct + offset, correct - offset):
            if candidate >= 0 and len(choices) < CHOICES:
                choices.add(candidate)
        offset += 1
    return sorted(choices)
