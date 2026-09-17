"""Coordinate Plane Battleship: write and read ordered pairs to find ships, against Robo (5.G.A.1-2)."""

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
