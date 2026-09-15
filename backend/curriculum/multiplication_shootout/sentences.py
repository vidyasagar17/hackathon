"""Code-built Multiplication Shootout hint sentences from the student's own fact and answer.

Shown after the fact is answered, with the correct answer on screen, so a sentence may name it.
Multiplication is explained as equal groups (a x b is a groups of b); a one-step-away slip is
repaired from the fact the student recalled; a division slip names the multiplication fact
recalled instead (Campbell, 1997).
"""

from typing import Callable

from .misconceptions import MisconceptionName
from .rounds import Fact


def _groups(count: int) -> str:
    return f"{count} group" if count == 1 else f"{count} groups"


def _zero(fact: Fact, answer: int) -> str:
    """For zero_gives_other_operand: adding's zero rule next to what a group of 0, or 0 groups, means."""
    a, b = fact.left, fact.right
    if b == 0:
        why = f"{a} × 0 means {_groups(a)} of 0. Every group is empty"
    else:
        why = f"0 × {b} means 0 groups of {b}. There are no groups at all"
    return f"{a} + {b} is {answer}, but {why}, so {a} × {b} is 0."


def _added(fact: Fact, answer: int) -> str:
    """For added_instead_of_multiplied: the sum next to the groups, skip counted."""
    a, b = fact.left, fact.right
    counts = ", ".join(str(b * k) for k in range(1, a + 1))
    return f"{a} + {b} is {answer}, but {a} × {b} means {_groups(a)} of {b}: {counts}. So {a} × {b} is {a * b}."


def _operand_related(fact: Fact, answer: int) -> str:
    """For operand_related: name the recalled neighbor, then add or take away the one group between."""
    a, b = fact.left, fact.right
    correct = a * b
    neighbors = [(a, b + 1, a), (a, b - 1, a), (a + 1, b, b), (a - 1, b, b)]
    left, right, step = next((x, y, s) for x, y, s in neighbors if x * y == answer)
    if answer > correct:
        return f"{answer} is {left} × {right}. {a} × {b} is {step} less: {answer} − {step} = {correct}."
    return f"{answer} is {left} × {right}. {a} × {b} is {step} more: {answer} + {step} = {correct}."


def _quotient_off_by_one(fact: Fact, answer: int) -> str:
    """For quotient_off_by_one: the recalled multiplication fact misses the dividend; the right one makes it."""
    dividend, divisor = fact.left, fact.right
    quotient = fact.correct_answer
    return (
        f"{divisor} × {answer} is {divisor * answer}, not {dividend}. "
        f"{divisor} × {quotient} is {dividend}, so {dividend} ÷ {divisor} is {quotient}."
    )


_BUILDERS: dict[MisconceptionName, Callable[[Fact, int], str]] = {
    "zero_gives_other_operand": _zero,
    "added_instead_of_multiplied": _added,
    "operand_related": _operand_related,
    "quotient_off_by_one": _quotient_off_by_one,
}


def specific_hint(fact: Fact, answer: int, misconception: MisconceptionName) -> str:
    """Return a correct hint sentence for the diagnosed misconception, built from the fact and answer."""
    return _BUILDERS[misconception](fact, answer)
