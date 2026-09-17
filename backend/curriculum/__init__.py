"""Registry of curriculum games, which play in rounds of moves (see `engine.py`).

The four workshops are separate and live in `games`.
"""

from types import ModuleType

from . import (
    addition_war,
    clock_match,
    coordinate_battleship,
    cover_the_number,
    decimal_war,
    dont_break_the_bank,
    for_keeps,
    four_in_a_row,
    fraction_spoons,
    multiplication_shootout,
    shut_the_box,
    take_away_war,
    target_number,
    twenty_four,
    volume_builder,
)

CURRICULUM_GAMES: dict[str, ModuleType] = {
    "decimal-war": decimal_war,
    "for-keeps": for_keeps,
    "multiplication-shootout": multiplication_shootout,
    "addition-war": addition_war,
    "take-away-war": take_away_war,
    "fraction-spoons": fraction_spoons,
    "the-24-game": twenty_four,
    "shut-the-box": shut_the_box,
    "dont-break-the-bank": dont_break_the_bank,
    "coordinate-plane-battleship": coordinate_battleship,
    "volume-builder": volume_builder,
    "target-number": target_number,
    "four-in-a-row": four_in_a_row,
    "cover-the-number": cover_the_number,
    "clock-match": clock_match,
}
