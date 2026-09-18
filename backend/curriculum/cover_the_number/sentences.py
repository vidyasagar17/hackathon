"""Code-built Cover the Number hint sentences, read aloud to pre-readers.

Counting mistakes list the numbers to say, one for each dot, and end with how many. Two-dice counting-on mistakes use
Shut the Box's dice sentences.
"""

from ..card_war.sentences import specific_hint as card_war_hint
from .misconceptions import MisconceptionName, total


def _count_to(number: int) -> str:
    return ", ".join(str(each) for each in range(1, number + 1))


def specific_hint(values: list[int], misconception: MisconceptionName) -> str:
    """The hint for a wrong tap on the dots of `values`."""
    right = total(values)
    if misconception == "counted_one_too_many":
        return f"Say one number for each dot, and each dot only once: {_count_to(right)}. That's {right}."
    if misconception == "counted_one_too_few":
        return f"Give every dot a number, even the last one: {_count_to(right)}. That's {right}."
    if misconception == "subtracted_instead":
        return f"Put the dice together: {values[0]} and {values[1]} make {right}."
    return card_war_hint(values[0], values[1], "add", misconception)
