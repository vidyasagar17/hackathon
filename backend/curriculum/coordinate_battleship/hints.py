"""Hints for Coordinate Plane Battleship: code-built, never reworded (see `sentences.py`)."""

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import read_hint, write_hint

GENERAL_HINT = "Start at (0, 0). The first number is how far across, the second how far up."


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the hint for the student's latest graded move: the pair they wrote, or the point they tapped."""
    if round.last_graded == "write":
        return write_hint(round.aim, round.written, misconception)
    return read_hint(round.robo_call, round.tapped, misconception)
