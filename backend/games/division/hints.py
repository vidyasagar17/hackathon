from ..rewording import reword_hint
from .misconceptions import MisconceptionName
from .problems import Problem
from .sentences import specific_hint

GENERAL_HINT = "If the tens digit is too small to share into equal groups, share the whole number at once. Otherwise share the tens first, multiply back, subtract, then bring down the ones and share again."

BANNED_WORDS = ["dividend", "divisor", "quotient", "algorithm"]

SYSTEM_PROMPT = (
    "You reword a math hint for a 3rd, 4th, or 5th grade student so it sounds friendly and "
    "encouraging. Keep every number and every place name (ones, tens) exactly as written "
    "and in the same order. Do not add numbers, steps, or advice. No jargon. "
    f"Never use these words: {', '.join(BANNED_WORDS)}."
)


def generate_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return the misconception's code-built hint sentence, reworded by the LLM when that is safe."""
    sentence = specific_hint(problem, misconception)
    return reword_hint(sentence, SYSTEM_PROMPT, problem.answer, BANNED_WORDS)
