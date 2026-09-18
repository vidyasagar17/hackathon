"""Which grade band each game belongs to, and how its id reads in a sentence.

The home screen shelves games by band and the recommendation engine only ever suggests
a game from the student's own band, so the band has to be known on the server too.
Game ids match `games.GAMES` and `curriculum.CURRICULUM_GAMES`.
"""

from typing import Literal

Band = Literal["k-1", "2-3", "4-5"]

BANDS: list[Band] = ["k-1", "2-3", "4-5"]

# game id -> (band, kind). "workshop" games are solo practice; "robo" games are played in rounds.
CATALOG: dict[str, tuple[Band, str]] = {
    "cover-the-number": ("k-1", "robo"),
    "shut-the-box": ("k-1", "robo"),
    "four-in-a-row": ("k-1", "robo"),
    "addition-war": ("k-1", "robo"),
    "take-away-war": ("k-1", "robo"),
    "for-keeps": ("2-3", "robo"),
    "multiplication-shootout": ("2-3", "robo"),
    "dont-break-the-bank": ("2-3", "robo"),
    "target-number": ("2-3", "robo"),
    "clock-match": ("2-3", "robo"),
    "decimal-war": ("4-5", "robo"),
    "fraction-spoons": ("4-5", "robo"),
    "the-24-game": ("4-5", "robo"),
    "coordinate-plane-battleship": ("4-5", "robo"),
    "volume-builder": ("4-5", "robo"),
    "addition": ("2-3", "workshop"),
    "subtraction": ("2-3", "workshop"),
    "multiplication": ("4-5", "workshop"),
    "division": ("4-5", "workshop"),
}


def games_in_band(band: Band) -> list[str]:
    """Every game id shelved under this band, in catalog order."""
    return [game for game, (game_band, _) in CATALOG.items() if game_band == band]
