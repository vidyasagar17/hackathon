"""Registry of curriculum games, which play in rounds of moves (see `engine.py`).

The four workshops are separate and live in `games`.
"""

from types import ModuleType

CURRICULUM_GAMES: dict[str, ModuleType] = {}
