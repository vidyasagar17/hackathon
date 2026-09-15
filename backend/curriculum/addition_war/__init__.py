"""Addition War: flip two cards, pick your sum, say whose hand wins (K.OA.A.5, 1.OA.C.6).

Shares its rules with Take-Away War in `curriculum/card_war`; this package fixes the operation to add.
"""

from ..card_war import rounds
from ..card_war.hints import GENERAL_HINTS, hint_sentence
from ..card_war.moves import computer_move, evaluate_move, visible_state
from ..card_war.rounds import Round

GENERAL_HINT = GENERAL_HINTS["add"]


def new_round(level: int) -> Round:
    return rounds.new_round("add", level)


__all__ = [
    "Round",
    "new_round",
    "visible_state",
    "evaluate_move",
    "computer_move",
    "hint_sentence",
    "GENERAL_HINT",
]
