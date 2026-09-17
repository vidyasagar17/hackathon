"""Code-built Shut the Box hint sentences from the student's own dice and tiles.

A dice total uses Addition War's counting sentences with the dice as the two cards, except subtracting
instead, whose sentence talks about cards. A shut says what the
picked tiles really make, by counting on from the first (larger) tile, or that the total's own tile is the
total by itself. Sentences are read aloud to pre-readers, so they use only numbers and "make".
"""

from ..card_war.sentences import specific_hint as card_war_hint
from .misconceptions import MisconceptionName
from .rounds import GradedMove


def _joined(tiles: list[int]) -> str:
    """5 and 4; 7, 2 and 1."""
    words = [str(tile) for tile in tiles]
    return words[0] if len(words) == 1 else f"{', '.join(words[:-1])} and {words[-1]}"


def _counted_on(total: int, tiles: list[int]) -> str:
    """Only diagnosed for two or more tiles; counts on from the largest tile, one tile at a time."""
    ordered = sorted(tiles, reverse=True)
    counts, reached = [], ordered[0]
    for tile in ordered[1:]:
        counts.append(", ".join(str(number) for number in range(reached + 1, reached + tile + 1)))
        reached += tile
    return (
        f"Start at {ordered[0]} and count on: {', '.join(counts)}. "
        f"{_joined(ordered)} make {reached}. You need {total}."
    )


def _added_the_total_tile(total: int, tiles: list[int]) -> str:
    return f"The {total} tile is {total} all by itself. {_joined(sorted(tiles, reverse=True))} make {sum(tiles)}."


def specific_hint(move: GradedMove, misconception: MisconceptionName) -> str:
    """The hint for the student's latest graded move."""
    if move.kind == "total":
        if misconception == "subtracted_instead":
            return f"Put the dice together: {move.dice[0]} and {move.dice[1]} make {move.total}."
        return card_war_hint(*move.dice, "add", misconception)
    if misconception == "added_the_total_tile":
        return _added_the_total_tile(move.total, move.tiles)
    return _counted_on(move.total, move.tiles)
