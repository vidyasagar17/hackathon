"""Hints for Addition War and Take-Away War.

K-1 hints are never reworded by an LLM: they are read aloud to pre-readers, and the counting
sequence is the whole hint, so the student always sees the code-built sentence.
"""

from .misconceptions import MisconceptionName, Operation
from .rounds import Round
from .sentences import specific_hint

GENERAL_HINTS: dict[Operation, str] = {
    "add": "Start at the bigger card and count on the smaller card's number.",
    "take_away": "Start at the bigger card and count back the smaller card's number.",
}


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the code-built hint sentence for the student's own two cards."""
    return specific_hint(*round.mine, round.operation, misconception)
