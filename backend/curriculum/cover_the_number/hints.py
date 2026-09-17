"""Hints for Cover the Number.

K-1 hints are never reworded by an LLM: they are read aloud to pre-readers, and the counting is the whole hint, so the
student always sees the code-built sentence.
"""

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import specific_hint

GENERAL_HINT = "Touch each dot once and say one number for it. The last number you say is how many."


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the hint for the student's latest tap."""
    values, _ = round.last_graded
    return specific_hint(values, misconception)
