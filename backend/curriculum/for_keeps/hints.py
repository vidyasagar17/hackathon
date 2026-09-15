from games.rewording import reword_hint

from .misconceptions import MisconceptionName
from .rounds import Round
from .sentences import specific_hint

GENERAL_HINT = (
    "Work one column at a time, starting with the ones. If the top digit is smaller than "
    "the bottom digit, borrow from the tens column."
)

BANNED_WORDS = ["minuend", "subtrahend", "algorithm"]

SYSTEM_PROMPT = (
    "You reword a math hint for a 2nd or 3rd grade student so it sounds friendly and "
    "encouraging. Keep every number and every column name (ones, tens) exactly as written and "
    "in the same order. Do not add numbers, steps, or advice. No jargon. "
    f"Never use these words: {', '.join(BANNED_WORDS)}."
)


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the hint sentence for the last hand the student typed a difference for, reworded when safe.

    The round may already be on a later hand. No answer-leak check: the correct difference is on
    screen once the student has answered.
    """
    hand = next(hand for hand in reversed(round.hands) if hand.my_answer is not None)
    larger, smaller = hand.my_numbers
    sentence = specific_hint(larger, smaller, misconception)
    return reword_hint(sentence, SYSTEM_PROMPT, None, BANNED_WORDS)
