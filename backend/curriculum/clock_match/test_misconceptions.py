import pytest

from .misconceptions import (
    _read_mistakes,
    _set_mistakes,
    clock_for,
    clock_choices,
    diagnose_read,
    diagnose_set,
    level_times,
    time_choices,
)


def test_a_clock_places_the_hour_hand_between_numerals():
    assert clock_for((2, 50)) == (170, 50)
    assert clock_for((12, 0)) == (0, 0)
    assert clock_for((4, 30)) == (270, 30)


@pytest.mark.parametrize(
    ("time", "answer", "expected"),
    [
        ((2, 50), (2, 50), None),
        ((2, 50), (3, 50), "read_the_next_hour"),
        ((3, 10), (2, 15), "swapped_the_hands"),
        ((10, 10), (10, 2), "minute_numeral_as_minutes"),
        ((4, 30), (4, 6), "minute_numeral_as_minutes"),
        ((7, 0), (12, 35), "swapped_the_hands"),
        ((2, 50), (10, 15), "swapped_the_hands"),
        ((2, 20), (3, 20), None),
        ((2, 50), (2, 45), None),
    ],
)
def test_hand_worked_readings(time, answer, expected):
    assert diagnose_read(time, answer) == expected


@pytest.mark.parametrize(
    ("time", "clock", "expected"),
    [
        ((2, 50), (170, 50), None),
        ((2, 50), (120, 50), "hour_hand_on_the_numeral"),
        ((4, 30), (240, 30), "hour_hand_on_the_numeral"),
        ((2, 50), (600, 10), "swapped_the_hands"),
        ((10, 10), (610, 50), "minute_hand_on_the_minutes_numeral"),
        ((10, 10), (600, 10), None),
        ((3, 5), (185, 25), "minute_hand_on_the_minutes_numeral"),
    ],
)
def test_hand_worked_settings(time, clock, expected):
    assert diagnose_set(time, clock) == expected


def test_level_times():
    assert {m for _, m in level_times(1)} == {0, 30}
    assert {m for _, m in level_times(2)} == {5, 10, 15, 20, 25}
    assert {m for _, m in level_times(3)} == {35, 40, 45, 50, 55}
    assert {h for h, _ in level_times(1)} == set(range(1, 13))


def test_four_different_choices_with_the_answer_and_only_real_times_and_clocks():
    for level in (1, 2, 3):
        for time in level_times(level):
            times = time_choices(time)
            assert len(set(times)) == 4 and time in times
            assert all(1 <= h <= 12 and 0 <= m < 60 for h, m in times)
            clocks = clock_choices(time)
            assert len(set(clocks)) == 4 and clock_for(time) in clocks
            assert all(0 <= hour < 720 and 0 <= minute < 60 for hour, minute in clocks)


def test_every_distinct_mistake_is_among_the_choices_and_right_answers_are_never_diagnosed():
    for level in (1, 2, 3):
        for time in level_times(level):
            assert diagnose_read(time, time) is None and diagnose_set(time, clock_for(time)) is None
            reads = {diagnose_read(time, each) for each in time_choices(time)} - {None}
            sets = {diagnose_set(time, each) for each in clock_choices(time)} - {None}
            assert reads == {diagnose_read(time, answer) for _, answer in _read_mistakes(time)}
            assert sets == {diagnose_set(time, clock) for _, clock in _set_mistakes(time)}
            if level == 3:
                assert "read_the_next_hour" in reads and "hour_hand_on_the_numeral" in sets


def test_hands_that_point_at_the_same_numeral_are_named_by_order():
    """At 7:35 the short hand is almost at 8 and the long hand is on the 7, so swapping them is the same clock as
    putting the hour hand on the 7."""
    assert diagnose_set((7, 35), (420, 35)) == "hour_hand_on_the_numeral"
    assert diagnose_read((3, 15), (3, 15)) is None
