"""Registry of curriculum games, which play in rounds of moves (see `engine.py`).

The four workshops are separate and live in `games`.
"""

from types import ModuleType

from . import decimal_war, for_keeps, multiplication_shootout

CURRICULUM_GAMES: dict[str, ModuleType] = {
    "decimal-war": decimal_war,
    "for-keeps": for_keeps,
    "multiplication-shootout": multiplication_shootout,
}
