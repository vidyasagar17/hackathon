"""Hints for Shut the Box.

K-1 hints are never reworded by an LLM: they are read aloud to pre-readers, and the counting is the whole
hint, so the student always sees the code-built sentence.
"""

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import specific_hint

GENERAL_HINT = "Start at the bigger number and count on the smaller number."


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the code-built hint sentence for the student's latest graded move."""
    return specific_hint(round.last_graded, misconception)
