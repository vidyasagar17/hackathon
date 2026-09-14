from ..rewording import reword_hint
from .misconceptions import MisconceptionName
from .problems import Problem
from .sentences import specific_hint

GENERAL_HINT = "Multiply the ones digit first and write down its ones digit. Carry the tens, then multiply the tens digit and add what you carried."

BANNED_WORDS = ["multiplicand", "multiplier", "algorithm"]

SYSTEM_PROMPT = (
    "You reword a math hint for a 3rd, 4th, or 5th grade student so it sounds friendly and "
    "encouraging. Keep every number and every column name (ones, tens, hundreds) exactly "
    "as written and in the same order. Do not add numbers, steps, or advice. No jargon. "
    f"Never use these words: {', '.join(BANNED_WORDS)}."
)


def generate_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return the misconception's code-built hint sentence, reworded by the LLM when that is safe."""
    sentence = specific_hint(problem, misconception)
    return reword_hint(sentence, SYSTEM_PROMPT, problem.answer, BANNED_WORDS)
