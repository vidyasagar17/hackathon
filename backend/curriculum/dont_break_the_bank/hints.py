from games.rewording import reword_hint

from .misconceptions import MisconceptionName
from .rounds import LEVELS, Round, board_numbers
from .sentences import distance_hint, sum_hint

GENERAL_HINT = (
    "Work one column at a time, starting with the ones. When you add, carry when a column makes 10 or more. "
    "When you take away, borrow when the top digit is too small."
)

BANNED_WORDS = ["addend", "minuend", "subtrahend", "algorithm", "regroup"]

SYSTEM_PROMPT = (
    "You reword a math hint for a 2nd or 3rd grade student so it sounds friendly and encouraging. "
    "Keep every number, sign and column name (ones, tens, hundreds) exactly as written and in the same "
    "order, and keep the words carry and borrow. Do not add numbers, steps, or advice. No jargon. "
    f"Never use these words: {', '.join(BANNED_WORDS)}."
)


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the hint for the student's latest graded answer, the sum or the distance, reworded when safe.

    No answer-leak check: the right answer is on screen once the student has answered.
    """
    config = LEVELS[round.level]
    numbers = board_numbers(round.my_board, config.width)
    if round.last_graded == "sum":
        sentence = sum_hint(numbers, config.width, misconception)
    else:
        sentence = distance_hint(config.bank, sum(numbers), misconception)
    return reword_hint(sentence, SYSTEM_PROMPT, None, BANNED_WORDS)
