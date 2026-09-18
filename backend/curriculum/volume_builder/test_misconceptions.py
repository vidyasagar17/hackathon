from itertools import product

from .misconceptions import (
    MISCONCEPTIONS,
    diagnose_build,
    diagnose_count,
    layer_counts,
    mistake_numbers,
    outside_cubes,
    same_box,
    visible_cubes,
    visible_faces,
    volume,
)


def test_counts_for_a_4_by_3_by_2_box():
    box = (4, 3, 2)
    assert volume(box) == 24
    assert visible_faces(box) == 12 + 8 + 6
    assert visible_cubes(box) == 24 - 3 * 2 * 1
    assert outside_cubes(box) == 24
    assert layer_counts(box) == {"top": 12, "front": 8, "side": 6}


def test_hand_worked_count_mistakes_on_4_by_3_by_2():
    box = (4, 3, 2)
    assert diagnose_count(box, 24) is None
    assert diagnose_count(box, 26) == "counted_visible_faces"
    assert diagnose_count(box, 18) == "counted_visible_cubes"
    assert diagnose_count(box, 52) == "counted_all_six_faces"
    assert diagnose_count(box, 12) == "counted_one_layer"
    assert diagnose_count(box, 8) == "counted_one_layer"
    assert diagnose_count(box, 9) == "added_the_edges"
    assert diagnose_count(box, 36) == "doubled_visible_cubes"
    assert diagnose_count(box, 25) is None


def test_a_box_with_a_middle_diagnoses_outside_cubes():
    box = (4, 4, 4)
    assert volume(box) == 64
    assert diagnose_count(box, 56) == "counted_outside_cubes"
    assert diagnose_count(box, 48) == "counted_visible_faces"
    assert diagnose_count(box, 37) == "counted_visible_cubes"
    assert diagnose_count(box, 96) == "counted_all_six_faces"
    assert diagnose_count(box, 74) == "doubled_visible_cubes"


def test_one_layer_wins_over_added_edges_when_they_share_a_number():
    """5 x 4 x 3: the side layer has 12 cubes, and 5 + 4 + 3 is also 12."""
    assert layer_counts((5, 4, 3))["side"] == 12
    assert diagnose_count((5, 4, 3), 12) == "counted_one_layer"


def test_hand_worked_build_mistakes_for_24_cubes():
    assert diagnose_build(24, (1, 4, 6)) is None
    assert diagnose_build(24, (2, 2, 5)) == "counted_visible_faces"
    assert diagnose_build(24, (4, 6, 2)) == "counted_one_layer"
    assert diagnose_build(18, (6, 6, 6)) == "added_the_edges"
    assert diagnose_build(12, (3, 4, 5)) == "counted_one_layer"
    assert diagnose_build(10, (1, 3, 6)) == "added_the_edges"
    assert diagnose_build(24, (2, 3, 6)) is None


def test_same_box_ignores_the_order_of_the_edges():
    assert same_box((4, 3, 2), (2, 4, 3))
    assert not same_box((4, 3, 2), (6, 2, 2))


def test_a_right_answer_is_never_diagnosed():
    for box in product(range(1, 11), repeat=3):
        assert diagnose_count(box, volume(box)) is None
        assert diagnose_build(volume(box), box) is None


def test_every_diagnosis_names_a_mistake_that_gives_that_number():
    for box in product(range(1, 7), repeat=3):
        numbers = dict(mistake_numbers(box))
        for answer in range(0, 450):
            name = diagnose_count(box, answer)
            if name is not None:
                assert answer in numbers[name]
                assert answer != volume(box)
            elif answer != volume(box):
                assert all(answer not in found for found in numbers.values())


def test_mistakes_are_listed_strongest_evidence_first():
    assert MISCONCEPTIONS == [
        "counted_visible_faces",
        "counted_visible_cubes",
        "counted_all_six_faces",
        "counted_outside_cubes",
        "counted_one_layer",
        "added_the_edges",
        "doubled_visible_cubes",
    ]


def test_doubling_the_visible_cubes_needs_a_box_that_hides_cubes():
    """1 x 1 x 4 hides nothing, so 8 isn't the visible cubes doubled for a hidden back."""
    assert diagnose_build(8, (1, 1, 4)) is None
    assert diagnose_build(36, (4, 3, 2)) == "doubled_visible_cubes"
