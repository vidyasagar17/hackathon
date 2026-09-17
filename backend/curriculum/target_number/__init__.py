"""Target Number: make a target from five cards one mental step at a time, then fill in an equation, against Robo (2.OA.B.2, 2.NBT.B.5, 1.OA.D.7)."""

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
