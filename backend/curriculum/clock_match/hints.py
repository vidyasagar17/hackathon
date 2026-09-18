"""Hints for Clock Match.

Never reworded by an LLM: `keeps_facts` protects the numbers but not "hour hand", "minute hand", "short", "long" or
"almost", which carry the whole hint, so the student always sees the code-built sentence.
"""

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import read_hint, set_hint

GENERAL_HINT = "The short hand shows the hour. The long hand shows the minutes: count by fives from the 12."


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the hint for the student's card: reading a clock or setting one."""
    build = read_hint if round.kind == "read" else set_hint
    return build(round.time, misconception)
