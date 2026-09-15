"""Code-built Addition War and Take-Away War hint sentences from the student's own two cards.

Sentences use counting on or back from the larger card (Secada, Fuson & Hall, 1983; Fuson, 1986)
and list the numbers to say, ending at the right total; they are shown after the student's one try,
when the total is already on screen. A zero card gets its own sentence, since counting on or back
zero steps says no numbers.
"""

from typing import Callable

from .misconceptions import MisconceptionName, Operation


def _numbers(start: int, stop: int) -> str:
    """Numbers from `start` to `stop` inclusive, counting up or down, e.g. "5, 6, 7"."""
    step = 1 if stop >= start else -1
    return ", ".join(str(number) for number in range(start, stop + step, step))


def _zero(first: int, second: int, operation: Operation) -> str:
    if operation == "add":
        return f"Adding 0 adds nothing: {first} and {second} make {first + second}."
    larger = max(first, second)
    return f"Taking away 0 takes nothing away: {larger} take away 0 is {larger}."


def _one_more_than_second(first: int, second: int) -> str:
    """Only diagnosed when the second card is larger."""
    return f"Start at {second} and count on {first} more: {_numbers(second + 1, first + second)}."


def _counted_on_from_start(first: int, second: int) -> str:
    larger, smaller = max(first, second), min(first, second)
    return (
        f"When you count on from {larger}, the first number you say is {larger + 1}: "
        f"{_numbers(larger + 1, larger + smaller)}."
    )


def _subtracted_instead(first: int, second: int) -> str:
    return f"Put the cards together: {first} and {second} make {first + second}."


def _counted_down_off_by_one(first: int, second: int) -> str:
    larger, smaller = max(first, second), min(first, second)
    return f"Start at {larger} and count back {smaller}: {_numbers(larger - 1, larger - smaller)}."


def _added_instead(first: int, second: int) -> str:
    larger, smaller = max(first, second), min(first, second)
    return (
        f"Take the smaller card away from the bigger one: {larger} take away {smaller} "
        f"is {larger - smaller}."
    )


_BUILDERS: dict[MisconceptionName, Callable[[int, int], str]] = {
    "one_more_than_second": _one_more_than_second,
    "counted_on_from_start": _counted_on_from_start,
    "subtracted_instead": _subtracted_instead,
    "counted_down_off_by_one": _counted_down_off_by_one,
    "added_instead": _added_instead,
}


def specific_hint(first: int, second: int, operation: Operation, misconception: MisconceptionName) -> str:
    """Return the hint sentence for the diagnosed mistake, built from the student's cards in dealt order."""
    if 0 in (first, second):
        return _zero(first, second, operation)
    return _BUILDERS[misconception](first, second)
