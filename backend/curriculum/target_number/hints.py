"""Hints for Target Number.

Never reworded by an LLM: `keeps_facts` doesn't protect "both sides", "same amount" or "only", which carry the
equation hints, so the student always sees the code-built sentence.
"""

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import equation_hint, step_hint

GENERAL_HINT = "Take one step at a time. The = sign means both sides are the same amount."


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the hint for the student's latest graded move: their last step, or the equation."""
    if round.last_graded == "equation":
        return equation_hint(round.equation, round.equation_answer, misconception)
    step = round.steps[-1]
    return step_hint(step.before, step.sign, step.card, step.answer, misconception)
