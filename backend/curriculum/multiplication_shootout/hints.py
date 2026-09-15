from games.rewording import reword_hint

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import specific_hint

GENERAL_HINT = (
    "A times fact counts equal groups: skip count by the second number. "
    "For a division fact, find the times fact that makes the bigger number."
)

BANNED_WORDS = ["operand", "dividend", "divisor", "quotient", "algorithm"]

SYSTEM_PROMPT = (
    "You reword a math hint for a 2nd or 3rd grade student so it sounds friendly and "
    "encouraging. Keep every number and every sign (×, ÷, +, −) exactly as written and in the "
    "same order, and keep the words less and more. Do not add numbers, steps, or advice. "
    f"No jargon. Never use these words: {', '.join(BANNED_WORDS)}."
)


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the code-built hint sentence for the student's answer, reworded by the LLM when that is safe.

    No answer-leak check: the hint is shown after the fact is answered, with the correct answer on screen.
    """
    sentence = specific_hint(round.fact, round.answer, misconception)
    return reword_hint(sentence, SYSTEM_PROMPT, None, BANNED_WORDS)
