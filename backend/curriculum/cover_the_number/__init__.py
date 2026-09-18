"""Cover the Number: roll, count the dots, and cover that number on your board, against Robo (K.CC.B.4-5, 1.OA.C.6)."""

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
