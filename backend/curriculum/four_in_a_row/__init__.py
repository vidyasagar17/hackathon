"""Four in a Row: add two cards and cover a space showing the sum, four in a row against Robo (K.OA.A.5, K.NBT.A.1, 1.OA.C.6)."""

from .hints import GENERAL_HINT, hint_sentence
from .moves import computer_move, evaluate_move, visible_state
from .rounds import Round, new_round

__all__ = [
    "Round",
    "new_round",
    "visible_state",
    "evaluate_move",
    "computer_move",
    "hint_sentence",
    "GENERAL_HINT",
]
