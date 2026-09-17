"""Rule-based diagnosis for Shut the Box: adding the dice, then shutting tiles that make the total.

Adding the dice reuses Addition War's detectors with the dice as the two cards (Siegler & Shrager, 1984;
Secada, Fuson & Hall, 1983). Shutting tiles has two researched mistakes: counting on while saying the start
number again (the tiles add up to one more than the total for each tile after the first), and adding the
total's own tile to another part, reading "make 8 from parts" as a plain addition (Lindvall & Ibarra, 1980).
"""

from itertools import combinations
from typing import Literal

from ..card_war.misconceptions import MisconceptionName as TotalMisconception
from ..card_war.misconceptions import answer_choices as card_war_choices
from ..card_war.misconceptions import diagnose

ShutMisconception = Literal["added_the_total_tile", "tiles_counted_on_from_start"]

MisconceptionName = TotalMisconception | ShutMisconception


def total_choices(dice: tuple[int, int]) -> list[int]:
    """Four answer cards for the dice total: the total, its researched mistakes, then the nearest fillers."""
    return card_war_choices(*dice, "add")


def diagnose_total(dice: tuple[int, int], pick: int) -> TotalMisconception | None:
    """The researched mistake that gives `pick` for the dice in rolled order, or None."""
    return diagnose(*dice, "add", pick)


def diagnose_shut(total: int, tiles: list[int]) -> ShutMisconception | None:
    """Name the mistake behind tiles that don't add up to `total`, or None when they do or none fits.

    The total's own tile with other tiles is named first: a child counting on would not pick it.
    """
    if sum(tiles) == total or len(tiles) < 2:
        return None
    if total in tiles:
        return "added_the_total_tile"
    if sum(tiles) - (len(tiles) - 1) == total:
        return "tiles_counted_on_from_start"
    return None


def ways_to_shut(open_tiles: list[int], total: int) -> list[tuple[int, ...]]:
    """Every set of open tiles that adds up to `total`, each set in ascending order."""
    tiles = sorted(open_tiles)
    return [way for size in range(1, len(tiles) + 1) for way in combinations(tiles, size) if sum(way) == total]


def fewest_highest(ways: list[tuple[int, ...]]) -> tuple[int, ...]:
    """The way with the fewest tiles, then the highest tiles: 8 before 6 + 2 before 5 + 3."""
    return min(ways, key=lambda way: (len(way), sorted((-tile for tile in way))))


def most_tiles(ways: list[tuple[int, ...]]) -> tuple[int, ...]:
    """The way with the most tiles, then the lowest highest tile: 1 + 2 + 5 before 1 + 7."""
    return max(ways, key=lambda way: (len(way), -max(way)))
