"""Multiplication Shootout: a turn-based fact duel with Robo, division facts mixed in (3.OA.C.7, 3.OA.B.6)."""

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
