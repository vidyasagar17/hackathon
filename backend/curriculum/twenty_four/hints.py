"""Hints for The 24 Game.

Never reworded by an LLM: a hint is mostly an expression and its steps, and a rewording that moved or dropped
a parenthesis would change the math, which `games/hint_check.keeps_facts` doesn't check.
"""

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import specific_hint

GENERAL_HINT = "Do what's in parentheses first, then × and ÷ from left to right, then + and − from left to right."


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the code-built hint sentence for the student's latest check."""
    return specific_hint(round.checks[-1], misconception)
