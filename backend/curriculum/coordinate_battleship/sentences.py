"""Code-built Coordinate Plane Battleship hint sentences from the pairs of the student's own move.

Each sentence says the right pair as "across" then "up", counting from the corner (0, 0). They are never
reworded by an LLM: the fact check protects numbers but not "across" and "up", and swapping those two words is
the very mistake being corrected.
"""

from .misconceptions import MisconceptionName, Point


def _pair(point: Point) -> str:
    return f"({point[0]}, {point[1]})"


def _counts(point: Point) -> str:
    return f"{point[0]} across and {point[1]} up"


def write_hint(aim: Point, written: Point, misconception: MisconceptionName) -> str:
    """The hint for writing `written` when the aim was `aim`."""
    if misconception == "swapped_x_and_y":
        return f"Across comes first, then up. Your aim is {_counts(aim)}, so it is {_pair(aim)}, not {_pair(written)}."
    return (
        f"The corner is (0, 0), so start counting at 0 there. Your aim is {_counts(aim)}, "
        f"so it is {_pair(aim)}, not {_pair(written)}."
    )


def read_hint(call: Point, tapped: Point, misconception: MisconceptionName) -> str:
    """The hint for tapping `tapped` when Robo called `call`."""
    if misconception == "swapped_x_and_y":
        return f"{_pair(call)} means {call[0]} across first, then {call[1]} up. You went {_counts(tapped)}."
    return (
        f"Start at the corner, (0, 0), and count from 0: {_pair(call)} is {_counts(call)}. "
        f"You stopped at {_pair(tapped)}, 1 short each way."
    )
