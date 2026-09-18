"""Code-built Clock Match hint sentences from the student's own clock or time.

Reading hints say what the minute hand's position means and where the hour hand really is, and end with the right
time. Setting hints say where each hand goes for the time.
"""

from .misconceptions import MisconceptionName, Time, next_hour, numeral


def _fives(count: int) -> str:
    return "1 five" if count == 1 else f"{count} fives"


def time_text(time: Time) -> str:
    hour, minute = time
    return f"{hour}:{minute:02d}"


def _hour_hand_place(time: Time) -> str:
    hour, minute = time
    if minute == 0:
        return f"on the {hour}"
    if minute < 30:
        return f"just past the {hour}"
    if minute == 30:
        return f"halfway between the {hour} and the {next_hour(hour)}"
    return f"almost at the {next_hour(hour)}"


def read_hint(time: Time, misconception: MisconceptionName) -> str:
    hour, minute = time
    if misconception == "read_the_next_hour":
        return (
            f"The minute hand on the {numeral(minute)} means {minute} minutes, so it isn't {next_hour(hour)} o'clock yet. "
            f"The hour hand is almost at the {next_hour(hour)} but still after the {hour}: {time_text(time)}."
        )
    if misconception == "swapped_the_hands":
        minutes = "o'clock" if minute == 0 else f"{minute} minutes"
        return (
            "The short hand shows the hour and the long hand shows the minutes. "
            f"The short hand is {_hour_hand_place(time)}, and the long hand on the {numeral(minute)} means {minutes}: "
            f"{time_text(time)}."
        )
    return (
        f"The minute hand counts by fives: on the {numeral(minute)} it means {_fives(numeral(minute))}, {minute} minutes. "
        f"So it's {time_text(time)}."
    )


def set_hint(time: Time, misconception: MisconceptionName) -> str:
    hour, minute = time
    if misconception == "hour_hand_on_the_numeral":
        part = "half an hour" if minute == 30 else "most of an hour"
        where = f"halfway to the {next_hour(hour)}" if minute == 30 else f"almost at the {next_hour(hour)}"
        return f"{minute} minutes is {part}, so at {time_text(time)} the hour hand has moved past the {hour} and is {where}."
    if misconception == "swapped_the_hands":
        minutes = "o'clock is on the 12" if minute == 0 else f"{minute} minutes is on the {numeral(minute)}"
        return (
            f"For {time_text(time)}, the short hand shows the hour, so it goes by the {hour}. "
            f"The long hand shows the minutes: {minutes}."
        )
    return (
        f"For {time_text(time)}, the minute hand counts by fives: {minute} minutes is {_fives(numeral(minute))}, "
        f"so it points at the {numeral(minute)}, not the {minute}."
    )
