import re
from itertools import product

from .hints import GENERAL_HINT, hint_sentence
from .misconceptions import diagnose_build, diagnose_count, volume
from .rounds import LEVEL_BOXES, Round
from .sentences import build_hint, count_hint


def _true_arithmetic(sentence: str) -> bool:
    """Every "a × b = c" and "a + b + c = d" in the sentence is true."""
    for left, right in re.findall(r"(\d+(?: [×+] \d+)+) = (\d+)", sentence):
        numbers = [int(number) for number in re.findall(r"\d+", left)]
        total = 1 if "×" in left else 0
        for number in numbers:
            total = total * number if "×" in left else total + number
        if total != int(right):
            return False
    return True


def test_hand_worked_count_hints_for_4_by_3_by_2():
    box = (4, 3, 2)
    layers = "The top layer has 4 × 3 = 12 cubes, and 2 layers make 2 × 12 = 24."
    assert count_hint(box, 26, "counted_visible_faces") == (
        "26 is the squares you can see on the top, front and side: 12 + 8 + 6 = 26. A square is just one face of a cube, "
        f"and the box is full of cubes, even inside. {layers}"
    )
    assert count_hint(box, 18, "counted_visible_cubes") == f"18 is the cubes you can see. 6 more cubes are hidden behind and under them. {layers}"
    assert count_hint(box, 52, "counted_all_six_faces") == (
        f"52 is the squares on all six sides of the box: the 26 you can see, twice. Squares cover the outside, but cubes fill the inside. {layers}"
    )
    assert count_hint(box, 12, "counted_one_layer") == "12 is only the top layer: 4 × 3 = 12. The box has 2 layers like it: 2 × 12 = 24."
    assert count_hint(box, 8, "counted_one_layer") == (
        "8 is only the front layer: 4 × 2 = 8. The box has 3 layers like it from front to back: 3 × 8 = 24."
    )
    assert count_hint(box, 6, "counted_one_layer") == (
        "6 is only the side layer: 3 × 2 = 6. The box has 4 layers like it from side to side: 4 × 6 = 24."
    )
    assert count_hint(box, 9, "added_the_edges") == f"4 + 3 + 2 = 9 adds the edges. Cubes fill the box, so count them by layers. {layers}"
    assert count_hint(box, 36, "doubled_visible_cubes") == (
        f"36 is the 18 cubes you can see, twice. The hidden cubes aren't a copy of those: only 6 are hidden. {layers}"
    )


def test_outside_cubes_hint_names_the_middle():
    assert count_hint((4, 4, 4), 56, "counted_outside_cubes") == (
        "56 is the cubes on the outside. 8 more cubes fill the middle, where you can't see them. "
        "The top layer has 4 × 4 = 16 cubes, and 4 layers make 4 × 16 = 64."
    )


def test_hand_worked_build_hints():
    assert build_hint(24, (2, 2, 5), "counted_visible_faces") == (
        "24 is the squares you can see on your box's top, front and side, not its cubes. "
        "Your box holds 20 cubes: the top layer has 2 × 2 = 4 cubes, and 5 layers make 5 × 4 = 20. You need 24."
    )
    assert build_hint(24, (4, 6, 2), "counted_one_layer") == (
        "24 is only the top layer of your box. "
        "Your box holds 48 cubes: the top layer has 4 × 6 = 24 cubes, and 2 layers make 2 × 24 = 48. You need 24."
    )
    assert build_hint(10, (1, 3, 6), "added_the_edges") == (
        "10 is your box's edges added: 1 + 3 + 6 = 10. "
        "Your box holds 18 cubes: the top layer has 1 × 3 = 3 cubes, and 6 layers make 6 × 3 = 18. You need 10."
    )


def test_a_box_one_cube_tall_has_1_layer():
    assert diagnose_build(20, (2, 6, 1)) == "counted_visible_faces"
    assert "the top layer has 2 × 6 = 12 cubes, and 1 layer makes 1 × 12 = 12. You need 20." in build_hint(
        20, (2, 6, 1), "counted_visible_faces"
    )


def test_every_diagnosed_count_hint_on_every_level_box_is_true():
    for boxes in LEVEL_BOXES.values():
        for box in boxes:
            for answer in range(0, 450):
                name = diagnose_count(box, answer)
                if name:
                    sentence = count_hint(box, answer, name)
                    assert sentence.startswith(f"{answer} is") or sentence.startswith(f"{box[0]} + ")
                    assert _true_arithmetic(sentence), sentence
                    assert sentence.endswith(f"= {volume(box)}.")


def test_every_diagnosed_build_hint_is_true():
    for target in {volume(box) for boxes in LEVEL_BOXES.values() for box in boxes}:
        for built in product(range(1, 11), repeat=3):
            name = diagnose_build(target, built)
            if name:
                sentence = build_hint(target, built, name)
                assert _true_arithmetic(sentence), sentence
                assert f"Your box holds {volume(built)} cubes" in sentence
                assert sentence.endswith(f"You need {target}.")


def test_hint_sentence_uses_the_latest_graded_move():
    counted = Round(level=1, box=(4, 3, 2), robo_box=(2, 3, 4), count=26, last_graded="count")
    assert hint_sentence(counted, "counted_visible_faces").startswith("26 is the squares")
    built = counted.model_copy(update={"built": (2, 2, 5), "last_graded": "build"})
    assert hint_sentence(built, "counted_visible_faces").startswith("24 is the squares you can see on your box's")
    assert GENERAL_HINT == "Count the cubes in one layer, then multiply by the number of layers."


def test_a_top_layer_of_1_cube_says_cube():
    assert "the top layer has 1 × 1 = 1 cube, and 6 layers make 6 × 1 = 6." in build_hint(8, (1, 1, 6), "added_the_edges")
