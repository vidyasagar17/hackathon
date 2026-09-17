"""Code-built Four in a Row hint sentences from the student's own fact, read aloud to pre-readers.

A reversed teen says the teen word as a ten and some ones, and that the 1 for the ten comes first. Counting mistakes
use Addition War's counting sentences, which list the numbers to say and end at the sum.
"""

from ..card_war.sentences import specific_hint as card_war_hint
from .misconceptions import MisconceptionName

TEEN_WORDS = {
    12: "Twelve",
    13: "Thirteen",
    14: "Fourteen",
    15: "Fifteen",
    16: "Sixteen",
    17: "Seventeen",
    18: "Eighteen",
    19: "Nineteen",
}


def specific_hint(first: int, second: int, misconception: MisconceptionName) -> str:
    """The hint for tapping the wrong number for first + second."""
    total = first + second
    if misconception == "reversed_teen_digits":
        return f"{TEEN_WORDS[total]} is 1 ten and {total - 10} ones, so the 1 comes first: {total}."
    return card_war_hint(first, second, "add", misconception)
