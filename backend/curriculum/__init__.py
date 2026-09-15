"""Registry of curriculum games, which play in rounds of moves (see `engine.py`).

The four workshops are separate and live in `games`.
"""

from types import ModuleType

from . import addition_war, decimal_war, for_keeps, take_away_war

CURRICULUM_GAMES: dict[str, ModuleType] = {
    "decimal-war": decimal_war,
    "for-keeps": for_keeps,
    "addition-war": addition_war,
    "take-away-war": take_away_war,
}
