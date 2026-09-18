"""Hints for Four in a Row.

K-1 hints are never reworded by an LLM: they are read aloud to pre-readers, and the counting sequence or the ten and
ones is the whole hint, so the student always sees the code-built sentence.
"""

from ..card_war.hints import GENERAL_HINTS
from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import specific_hint

GENERAL_HINT = GENERAL_HINTS["add"]


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the hint for the fact of the student's latest tap."""
    return specific_hint(*round.tapped_fact, misconception)
