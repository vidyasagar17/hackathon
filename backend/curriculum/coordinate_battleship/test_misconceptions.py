"""Hand-worked ordered-pair mistakes, in both directions."""

import pytest

from .misconceptions import diagnose_read, diagnose_write


def test_right_answers_have_no_diagnosis():
    assert diagnose_write((3, 5), (3, 5)) is None
    assert diagnose_read((2, 4), (2, 4)) is None


@pytest.mark.parametrize(
    "aim, written, misconception",
    [
        ((3, 5), (5, 3), "swapped_x_and_y"),  # 3 across, 5 up written up first
        ((0, 3), (3, 0), "swapped_x_and_y"),  # a point on the y-axis written as if on the x-axis
        ((3, 5), (4, 6), "counted_from_one"),  # the corner counted as 1: "1, 2, 3, 4" across to the 3rd line
        ((0, 0), (1, 1), "counted_from_one"),
        ((3, 5), (3, 6), None),  # off on one axis only: a slip, not a named mistake
        ((3, 5), (2, 4), None),  # one short on both axes is the reading mistake, not the writing one
    ],
)
def test_writing_a_pair_for_an_aimed_point(aim, written, misconception):
    assert diagnose_write(aim, written) == misconception


@pytest.mark.parametrize(
    "call, tapped, misconception",
    [
        ((2, 4), (4, 2), "swapped_x_and_y"),  # went 4 across and 2 up
        ((4, 0), (0, 4), "swapped_x_and_y"),
        ((2, 4), (1, 3), "counted_from_one"),  # "1, 2" across starting on the corner stops at 1
        ((2, 4), (3, 5), None),
        ((2, 4), (2, 3), None),
    ],
)
def test_reading_a_called_pair_by_tapping_its_point(call, tapped, misconception):
    assert diagnose_read(call, tapped) == misconception


def test_a_point_with_equal_coordinates_cannot_be_swapped():
    assert diagnose_write((3, 3), (3, 3)) is None
    assert diagnose_read((2, 2), (1, 1)) == "counted_from_one"


def test_the_two_mistakes_never_give_the_same_answer_so_the_order_never_matters():
    # A swap (y, x) equal to one step up (x + 1, y + 1) would need y = x + 1 and x = y + 1 at once.
    for x in range(6):
        for y in range(6):
            assert (y, x) != (x + 1, y + 1)
            assert (y, x) != (x - 1, y - 1)
