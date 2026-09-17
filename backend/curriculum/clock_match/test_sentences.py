from .hints import GENERAL_HINT, hint_sentence
from .misconceptions import clock_choices, diagnose_read, diagnose_set, level_times, time_choices
from .rounds import Round
from .sentences import read_hint, set_hint, time_text


def test_time_text():
    assert time_text((2, 5)) == "2:05" and time_text((12, 0)) == "12:00"


def test_hand_worked_reading_hints():
    assert read_hint((2, 50), "read_the_next_hour") == (
        "The minute hand on the 10 means 50 minutes, so it isn't 3 o'clock yet. "
        "The hour hand is almost at the 3 but still after the 2: 2:50."
    )
    assert read_hint((3, 10), "swapped_the_hands") == (
        "The short hand shows the hour and the long hand shows the minutes. "
        "The short hand is just past the 3, and the long hand on the 2 means 10 minutes: 3:10."
    )
    assert read_hint((10, 10), "minute_numeral_as_minutes") == (
        "The minute hand counts by fives: on the 2 it means 2 fives, 10 minutes. So it's 10:10."
    )


def test_hand_worked_setting_hints():
    assert set_hint((2, 50), "hour_hand_on_the_numeral") == (
        "50 minutes is most of an hour, so at 2:50 the hour hand has moved past the 2 and is almost at the 3."
    )
    assert set_hint((4, 30), "hour_hand_on_the_numeral") == (
        "30 minutes is half an hour, so at 4:30 the hour hand has moved past the 4 and is halfway to the 5."
    )
    assert set_hint((2, 50), "swapped_the_hands") == (
        "For 2:50, the short hand shows the hour, so it goes by the 2. The long hand shows the minutes: 50 minutes is on the 10."
    )
    assert set_hint((10, 10), "minute_hand_on_the_minutes_numeral") == (
        "For 10:10, the minute hand counts by fives: 10 minutes is 2 fives, so it points at the 2, not the 10."
    )


def test_every_diagnosed_hint_ends_with_or_names_the_right_time():
    for level in (1, 2, 3):
        for time in level_times(level):
            for answer in time_choices(time):
                name = diagnose_read(time, answer)
                if name:
                    assert read_hint(time, name).endswith(f"{time_text(time)}.")
            for clock in clock_choices(time):
                name = diagnose_set(time, clock)
                if name:
                    sentence = set_hint(time, name)
                    assert time_text(time) in sentence


def test_hint_sentence_uses_the_card_kind():
    round = Round(level=3, kind="set", time=(2, 50), robo_kind="read", robo_time=(1, 5), robo_knows=True, pick=0)
    assert hint_sentence(round, "swapped_the_hands").startswith("For 2:50, the short hand shows the hour")
    assert hint_sentence(round.model_copy(update={"kind": "read"}), "swapped_the_hands").startswith("The short hand shows the hour and")
    assert GENERAL_HINT == "The short hand shows the hour. The long hand shows the minutes: count by fives from the 12."


def test_one_five_is_singular():
    assert "on the 1 it means 1 five, 5 minutes" in read_hint((4, 5), "minute_numeral_as_minutes")
