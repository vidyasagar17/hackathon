"""Code-built Volume Builder hint sentences from the student's own box and number.

Each says what the student's number really counted, then counts the box by layers (top layer, times the number of
layers), the strategy Battista & Clements (1996) found most viable. Every sum and product in a sentence is true.
"""

from .misconceptions import Box, MisconceptionName, layer_counts, outside_cubes, visible_cubes, visible_faces, volume


def _more_cubes(count: int, one: str, many: str) -> str:
    """'6 more cubes are hidden' / '1 more cube is hidden'."""
    return f"1 more cube {one}" if count == 1 else f"{count} more cubes {many}"


def _by_layers(box: Box) -> str:
    """the top layer has 4 × 3 = 12 cubes, and 2 layers make 2 × 12 = 24."""
    length, width, height = box
    top = length * width
    layers = "1 layer makes" if height == 1 else f"{height} layers make"
    return f"the top layer has {length} × {width} = {top} {'cube' if top == 1 else 'cubes'}, and {layers} {height} × {top} = {volume(box)}."


def _layer_named(box: Box, number: int) -> str:
    """The layer holding `number` cubes, top first when two layers hold the same."""
    return next(name for name, count in layer_counts(box).items() if count == number)


def _one_layer(box: Box, answer: int) -> str:
    length, width, height = box
    layer = _layer_named(box, answer)
    if layer == "top":
        return f"{answer} is only the top layer: {length} × {width} = {answer}. The box has {height} layers like it: {height} × {answer} = {volume(box)}."
    if layer == "front":
        return (
            f"{answer} is only the front layer: {length} × {height} = {answer}. "
            f"The box has {width} layers like it from front to back: {width} × {answer} = {volume(box)}."
        )
    return (
        f"{answer} is only the side layer: {width} × {height} = {answer}. "
        f"The box has {length} layers like it from side to side: {length} × {answer} = {volume(box)}."
    )


def count_hint(box: Box, answer: int, misconception: MisconceptionName) -> str:
    """The hint for counting `answer` cubes in `box`."""
    layers = "T" + _by_layers(box)[1:]
    hidden = volume(box) - visible_cubes(box)
    if misconception == "counted_visible_faces":
        top, front, side = layer_counts(box).values()
        return (
            f"{answer} is the squares you can see on the top, front and side: {top} + {front} + {side} = {answer}. "
            f"A square is just one face of a cube, and the box is full of cubes, even inside. {layers}"
        )
    if misconception == "counted_visible_cubes":
        return f"{answer} is the cubes you can see. {_more_cubes(hidden, 'is hidden', 'are hidden')} behind and under them. {layers}"
    if misconception == "counted_all_six_faces":
        return (
            f"{answer} is the squares on all six sides of the box: the {visible_faces(box)} you can see, twice. "
            f"Squares cover the outside, but cubes fill the inside. {layers}"
        )
    if misconception == "counted_outside_cubes":
        middle = volume(box) - outside_cubes(box)
        return f"{answer} is the cubes on the outside. {_more_cubes(middle, 'fills', 'fill')} the middle, where you can't see them. {layers}"
    if misconception == "counted_one_layer":
        return _one_layer(box, answer)
    if misconception == "added_the_edges":
        length, width, height = box
        return f"{length} + {width} + {height} = {answer} adds the edges. Cubes fill the box, so count them by layers. {layers}"
    return (
        f"{answer} is the {visible_cubes(box)} cubes you can see, twice. "
        f"The hidden cubes aren't a copy of those: only {hidden} {'is' if hidden == 1 else 'are'} hidden. {layers}"
    )


def _what_target_counted(target: int, built: Box, misconception: MisconceptionName) -> str:
    length, width, height = built
    if misconception == "counted_visible_faces":
        return f"{target} is the squares you can see on your box's top, front and side, not its cubes."
    if misconception == "counted_visible_cubes":
        return f"{target} is the cubes you can see on your box; {_more_cubes(volume(built) - visible_cubes(built), 'is hidden', 'are hidden')}."
    if misconception == "counted_all_six_faces":
        return f"{target} is the squares on all six sides of your box, not its cubes."
    if misconception == "counted_outside_cubes":
        return f"{target} is your box's outside cubes; {_more_cubes(volume(built) - outside_cubes(built), 'fills', 'fill')} the middle."
    if misconception == "counted_one_layer":
        return f"{target} is only the {_layer_named(built, target)} layer of your box."
    if misconception == "added_the_edges":
        return f"{target} is your box's edges added: {length} + {width} + {height} = {target}."
    return f"{target} is the {visible_cubes(built)} cubes you can see on your box, twice."


def build_hint(target: int, built: Box, misconception: MisconceptionName) -> str:
    """The hint for building `built` when the box needed `target` cubes."""
    return (
        f"{_what_target_counted(target, built, misconception)} "
        f"Your box holds {volume(built)} cubes: {_by_layers(built)} You need {target}."
    )
