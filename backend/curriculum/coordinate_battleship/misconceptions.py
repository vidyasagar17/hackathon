"""Rule-based diagnosis of ordered-pair mistakes in Coordinate Plane Battleship, first quadrant only.

Two directions: writing the pair for a point the student aimed at, and reading a pair Robo calls by tapping
its point. Two researched mistakes: swapping x and y (the most reported coordinate-graphing error in grades
5-6), and counting the corner as 1 instead of 0, which lands one step off on both axes (Sarama et al., 2003:
grid lines read as regions or fuzzy intervals). A swap is named first when both fit.
"""

from typing import Literal

Point = tuple[int, int]

MisconceptionName = Literal["swapped_x_and_y", "counted_from_one"]


def _swapped(right: Point, answer: Point) -> bool:
    return right[0] != right[1] and answer == (right[1], right[0])


def diagnose_write(aim: Point, written: Point) -> MisconceptionName | None:
    """The mistake behind writing `written` for the point `aim`, or None when right or unexplained.

    Counting the corner as 1 makes every count one too many: (3, 5) is written (4, 6).
    """
    if written == aim:
        return None
    if _swapped(aim, written):
        return "swapped_x_and_y"
    if written == (aim[0] + 1, aim[1] + 1):
        return "counted_from_one"
    return None


def diagnose_read(call: Point, tapped: Point) -> MisconceptionName | None:
    """The mistake behind tapping `tapped` for the called pair `call`, or None when right or unexplained.

    Counting the corner as 1 stops one step short on both axes: (2, 4) is tapped at (1, 3).
    """
    if tapped == call:
        return None
    if _swapped(call, tapped):
        return "swapped_x_and_y"
    if tapped == (call[0] - 1, call[1] - 1):
        return "counted_from_one"
    return None
