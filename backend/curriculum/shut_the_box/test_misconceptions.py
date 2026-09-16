import pytest

from .misconceptions import (
    diagnose_shut,
    diagnose_total,
    fewest_highest,
    most_tiles,
    total_choices,
    ways_to_shut,
)


def test_adding_the_dice_uses_addition_wars_detectors_with_the_dice_as_cards():
    # 3 then 5: one more than the second die is 6; counting on from the start says 5, 6, 7 -> 7; 5 - 3 = 2.
    assert diagnose_total((3, 5), 8) is None
    assert diagnose_total((3, 5), 6) == "one_more_than_second"
    assert diagnose_total((3, 5), 7) == "counted_on_from_start"
    assert diagnose_total((3, 5), 2) == "subtracted_instead"
    assert total_choices((3, 5)) == [2, 6, 7, 8]


def test_tiles_that_make_the_total_have_no_diagnosis():
    assert diagnose_shut(8, [8]) is None
    assert diagnose_shut(8, [5, 3]) is None
    assert diagnose_shut(8, [1, 2, 5]) is None


def test_counting_on_from_the_start_adds_one_too_many_per_tile_after_the_first():
    # 5 and 4 counted "5, 6, 7, 8" -> 8, but they make 9.
    assert diagnose_shut(8, [5, 4]) == "tiles_counted_on_from_start"
    # 1, 2 and 7 counted on twice from each start: 10 - 2 = 8.
    assert diagnose_shut(8, [1, 2, 7]) == "tiles_counted_on_from_start"


def test_the_totals_own_tile_with_another_part_is_named_first():
    assert diagnose_shut(8, [8, 2]) == "added_the_total_tile"
    # 8 and 1 is also one too many for counting on, but a child counting on wouldn't pick the 8.
    assert diagnose_shut(8, [8, 1]) == "added_the_total_tile"


@pytest.mark.parametrize("tiles", [[7], [9], [2, 3], [6, 5]])
def test_other_wrong_tiles_are_undiagnosed(tiles):
    # One tile can't show either mistake; 2 + 3 = 5 and 6 + 5 = 11 are not one too many for 8.
    assert diagnose_shut(8, tiles) is None


def test_ways_to_shut_lists_every_set_of_open_tiles_that_makes_the_total():
    assert ways_to_shut([1, 2, 3, 5, 6, 8], 8) == [(8,), (2, 6), (3, 5), (1, 2, 5)]
    assert ways_to_shut([1, 2, 4], 8) == []


def test_robos_two_ways_to_choose_and_the_way_shown_after_a_wrong_shut():
    ways = ways_to_shut([1, 2, 3, 5, 6, 7], 8)
    assert fewest_highest(ways) == (1, 7)
    assert most_tiles(ways) == (1, 2, 5)
    assert fewest_highest(ways_to_shut([2, 3, 5, 6, 8], 8)) == (8,)
