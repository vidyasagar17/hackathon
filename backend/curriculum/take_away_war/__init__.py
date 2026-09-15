"""Take-Away War: flip two cards, take the smaller from the larger, say whose hand wins (K.OA.A.2, 1.OA.C.6).

Shares its rules with Addition War in `curriculum/card_war`; this package fixes the operation to take away.
"""

from ..card_war import rounds
from ..card_war.hints import GENERAL_HINTS, hint_sentence
from ..card_war.moves import computer_move, evaluate_move, visible_state
from ..card_war.rounds import Round

GENERAL_HINT = GENERAL_HINTS["take_away"]


def new_round(level: int) -> Round:
    return rounds.new_round("take_away", level)


__all__ = [
    "Round",
    "new_round",
    "visible_state",
    "evaluate_move",
    "computer_move",
    "hint_sentence",
    "GENERAL_HINT",
]
