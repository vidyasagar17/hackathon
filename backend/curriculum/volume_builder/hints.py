"""Hints for Volume Builder.

Never reworded by an LLM: `keeps_facts` protects the numbers but not "top", "front", "hidden" or "layer", and those
words carry the whole diagnosis, so the student always sees the code-built sentence.
"""

from .misconceptions import MisconceptionName, volume
from .rounds import Round
from .sentences import build_hint, count_hint

GENERAL_HINT = "Count the cubes in one layer, then multiply by the number of layers."


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the hint for the student's latest graded move: the count, or the box they built."""
    if round.last_graded == "build":
        return build_hint(volume(round.box), round.built, misconception)
    return count_hint(round.box, round.count, misconception)
