from ..rewording import reword_hint
from .misconceptions import MisconceptionName
from .problems import Problem
from .sentences import specific_hint

GENERAL_HINT = "Work one column at a time, starting with the ones. If a column adds up to 10 or more, write the ones digit and carry the 1 to the next column."

BANNED_WORDS = ["addend", "augend", "algorithm"]

SYSTEM_PROMPT = (
    "You reword a math hint for a 2nd or 3rd grade student so it sounds friendly and "
    "encouraging. Keep every number and every column name (ones, tens, hundreds, thousands) "
    "exactly as written and in the same order. Do not add numbers, steps, or advice. "
    f"No jargon. Never use these words: {', '.join(BANNED_WORDS)}."
)


def generate_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return the misconception's code-built hint sentence, reworded by the LLM when that is safe."""
    sentence = specific_hint(problem, misconception)
    return reword_hint(sentence, SYSTEM_PROMPT, problem.answer, BANNED_WORDS)
