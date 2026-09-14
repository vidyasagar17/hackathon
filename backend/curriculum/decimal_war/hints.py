from games.rewording import reword_hint

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import specific_hint

GENERAL_HINT = (
    "Give both numbers the same number of digits, then compare them from the left: "
    "tenths first, then hundredths, then thousandths."
)

BANNED_WORDS = ["decimal fraction", "place value", "algorithm"]

SYSTEM_PROMPT = (
    "You reword a math hint for a 4th or 5th grade student so it sounds friendly and "
    "encouraging. Keep every number, every place word (tenths, hundredths, thousandths) and "
    "the word 'same' exactly as written and in the same order. Do not add numbers, steps, or "
    f"advice. No jargon. Never use these words: {', '.join(BANNED_WORDS)}."
)


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the code-built hint sentence for the round, reworded by the LLM when that is safe.

    No answer-leak check: the hint is shown after the round is judged, with the answer on screen.
    """
    sentence = specific_hint(round.mine, round.robo, misconception)
    return reword_hint(sentence, SYSTEM_PROMPT, None, BANNED_WORDS)
