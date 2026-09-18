from .misconceptions import diagnose_count, mistake_numbers, same_box, volume
from .rounds import BUILD_EDGES, LEVEL_BOXES, Round, new_round, other_boxes, robo_build


def _fits_level(box, level):
    low, high = {1: (2, 4), 2: (2, 5), 3: (3, 6)}[level]
    fewest, most = {1: (1, 36), 2: (40, 100), 3: (1, 216)}[level]
    return all(low <= edge <= high for edge in box) and fewest <= volume(box) <= most


def test_every_dealt_box_fits_its_level():
    for level in (1, 2, 3):
        for _ in range(300):
            round = new_round(level)
            assert round.level == level
            assert _fits_level(round.box, level)
            assert _fits_level(round.robo_box, level)


def test_every_level_box_has_another_box_and_no_mistake_gives_its_volume():
    for level, boxes in LEVEL_BOXES.items():
        assert len({tuple(sorted(box)) for box in boxes}) >= 6
        for box in boxes:
            assert _fits_level(box, level)
            assert other_boxes(box)
            for name, numbers in mistake_numbers(box):
                if name != "counted_outside_cubes":
                    assert volume(box) not in numbers, (box, name)


def test_every_level_3_box_has_a_hidden_middle():
    for box in LEVEL_BOXES[3]:
        middle = (box[0] - 2) * (box[1] - 2) * (box[2] - 2)
        assert middle >= 1
        assert diagnose_count(box, volume(box) - middle) == "counted_outside_cubes"


def test_other_boxes_hold_the_same_cubes_in_a_different_shape():
    assert (1, 4, 6) in other_boxes((4, 3, 2))
    for box in other_boxes((4, 3, 2)):
        assert volume(box) == 24
        assert not same_box(box, (4, 3, 2))
        assert all(edge in BUILD_EDGES for edge in box)


def test_robo_builds_by_its_level_rule():
    assert robo_build((2, 2, 4), 1) is None
    assert robo_build((2, 3, 4), 1) == (2, 6, 2)
    assert robo_build((3, 4, 5), 3) == (2, 5, 6)


def test_robo_never_builds_a_wrong_box_or_an_edge_of_1():
    for level, boxes in LEVEL_BOXES.items():
        for box in boxes:
            for robo_level in (1, 2, 3):
                built = robo_build(box, robo_level)
                if built is not None:
                    assert volume(built) == volume(box)
                    assert not same_box(built, box)
                    assert min(built) >= 2 and max(built) <= max(BUILD_EDGES)


def test_robo_gets_stronger_by_level():
    rates = [
        sum(robo_build(box, level) is not None for box in LEVEL_BOXES[level]) / len(LEVEL_BOXES[level])
        for level in (1, 2, 3)
    ]
    assert rates[0] < rates[1] < rates[2] < 1
    assert rates[0] < 0.6 and rates[2] > 0.85


def test_a_new_round_starts_at_the_count():
    round = new_round(1)
    assert round == Round(level=1, box=round.box, robo_box=round.robo_box)
    assert round.count is None and round.built is None and not round.robo_played
