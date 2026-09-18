"""Rule-based diagnosis for Volume Builder: counting the cubes in a drawn box, and building a box of a given volume.

A box is (length, width, height): length goes across, width goes back, height goes up. The drawing shows its top,
front and right side. The mistakes are the documented wrong counts for "how many small cubes build this box?"
(Ben-Chaim, Lappan & Houang, 1985; Battista & Clements, 1996; Hirstein, 1981; Tan Sisman & Aksu, 2016), listed
strongest evidence first; when two give the same number the earlier one is named.
"""

from typing import Callable, Literal

Box = tuple[int, int, int]

MisconceptionName = Literal[
    "counted_visible_faces",
    "counted_visible_cubes",
    "counted_all_six_faces",
    "counted_outside_cubes",
    "counted_one_layer",
    "added_the_edges",
    "doubled_visible_cubes",
]


def volume(box: Box) -> int:
    length, width, height = box
    return length * width * height


def layer_counts(box: Box) -> dict[str, int]:
    """Cubes in one layer: the top layer (length x width), the front layer (length x height), the side layer."""
    length, width, height = box
    return {"top": length * width, "front": length * height, "side": width * height}


def visible_faces(box: Box) -> int:
    """Squares showing on the top, front and right side of the drawing."""
    return sum(layer_counts(box).values())


def visible_cubes(box: Box) -> int:
    """Cubes with a face on the top, front or right side; the rest are hidden behind and under them."""
    length, width, height = box
    return volume(box) - (length - 1) * (width - 1) * (height - 1)


def outside_cubes(box: Box) -> int:
    """Cubes with a face on any of the six sides; only a box with every edge 3 or more has a middle."""
    length, width, height = box
    return volume(box) - max(length - 2, 0) * max(width - 2, 0) * max(height - 2, 0)


_MISTAKES: list[tuple[MisconceptionName, Callable[[Box], set[int]]]] = [
    ("counted_visible_faces", lambda box: {visible_faces(box)}),
    ("counted_visible_cubes", lambda box: {visible_cubes(box)}),
    ("counted_all_six_faces", lambda box: {2 * visible_faces(box)}),
    ("counted_outside_cubes", lambda box: {outside_cubes(box)}),
    ("counted_one_layer", lambda box: set(layer_counts(box).values())),
    ("added_the_edges", lambda box: {sum(box)}),
    ("doubled_visible_cubes", lambda box: {2 * visible_cubes(box)} if visible_cubes(box) < volume(box) else set()),
]

MISCONCEPTIONS: list[MisconceptionName] = [name for name, _ in _MISTAKES]


def mistake_numbers(box: Box) -> list[tuple[MisconceptionName, set[int]]]:
    """Each mistake with the number (or numbers, for one layer) it gives for `box`.

    Doubling the visible cubes stands for the hidden back, so a box that hides no cubes has no such number.
    """
    return [(name, numbers(box)) for name, numbers in _MISTAKES]


def _first_mistake(box: Box, number: int) -> MisconceptionName | None:
    return next((name for name, numbers in mistake_numbers(box) if number in numbers), None)


def diagnose_count(box: Box, answer: int) -> MisconceptionName | None:
    """The mistake that counts `answer` cubes in `box`, or None when it is right or no mistake gives it."""
    if answer == volume(box):
        return None
    return _first_mistake(box, answer)


def diagnose_build(target: int, built: Box) -> MisconceptionName | None:
    """The mistake that would make `built` look like it holds `target` cubes, or None when it does hold them
    or no mistake explains it: the same rules as counting, run the other way."""
    if volume(built) == target:
        return None
    return _first_mistake(built, target)


def same_box(first: Box, second: Box) -> bool:
    """The same three edges in any order: the same box turned around."""
    return sorted(first) == sorted(second)
