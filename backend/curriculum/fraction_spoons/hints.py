"""Hints for Fraction Spoons.

Never reworded by an LLM: live, every same-difference rewording failed the fact check, and one that passed
read misleadingly ("When only the bottom number of 1/4 is times 2..."), which the check can't catch. The
student always sees the code-built sentence, whose size relations the sentence tests prove true.
"""

from .misconceptions import Card, MisconceptionName
from .rounds import GradedMove, Round
from .sentences import hint_card, specific_hint

GENERAL_HINT = "Two fractions are the same size when the top and the bottom are × the same number."


def _latest_graded(round: Round) -> GradedMove:
    """A spoon may have moved the round on to a later hand, so this looks back through the hands played so far."""
    hand = next(hand for hand in reversed(round.hands[: round.hand_number]) if hand.last_graded is not None)
    return hand.last_graded


def hint_sentence(round: Round, misconception: MisconceptionName) -> str:
    """Return the code-built hint sentence for the latest graded move."""
    return specific_hint(_latest_graded(round), misconception)


def hint_cards(round: Round, misconception: MisconceptionName) -> list[Card]:
    """Return the Collecting card and the card the hint sentence compares it with, for the fraction-bars picture."""
    move = _latest_graded(round)
    return [move.collecting, hint_card(move, misconception)]
