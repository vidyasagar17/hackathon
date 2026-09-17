"""Rule-based diagnosis for Clock Match: reading an analog clock and choosing the clock that shows a time.

A time is (hour 1-12, minute). A clock is (hour hand, minute hand): the hour hand in minutes past 12 o'clock (0-719),
so it moves between numerals, and the minute hand in minutes (0-59). Mistakes: reading the next hour when the minute
hand is past the half (Williams, 2012, via Earnest, Gonzales & Plant, 2018), putting the hour hand right on the hour's
numeral (Earnest et al.'s Number Matching), mixing up the hands (Mutlu & Korkmaz, 2020), and taking the minute hand's
numeral as the minutes.
"""

from typing import Literal

Time = tuple[int, int]
Clock = tuple[int, int]

ReadMisconception = Literal["read_the_next_hour", "swapped_the_hands", "minute_numeral_as_minutes"]
SetMisconception = Literal["hour_hand_on_the_numeral", "swapped_the_hands", "minute_hand_on_the_minutes_numeral"]
MisconceptionName = ReadMisconception | SetMisconception

LEVEL_MINUTES = {1: [0, 30], 2: [5, 10, 15, 20, 25], 3: [35, 40, 45, 50, 55]}
CHOICES = 4


def level_times(level: int) -> list[Time]:
    return [(hour, minute) for hour in range(1, 13) for minute in LEVEL_MINUTES[level]]


def next_hour(hour: int) -> int:
    return hour % 12 + 1


def numeral(minute: int) -> int:
    """The numeral the minute hand points at: 12 for 0 minutes, 2 for 10 minutes."""
    return 12 if minute == 0 else minute // 5


def nearest_hour_numeral(time: Time) -> int:
    """The numeral the hour hand is at or closest to: past the half it is almost at the next hour."""
    hour, minute = time
    return next_hour(hour) if minute > 30 else hour


def clock_for(time: Time) -> Clock:
    hour, minute = time
    return (hour % 12 * 60 + minute, minute)


def _read_mistakes(time: Time) -> list[tuple[ReadMisconception, Time]]:
    hour, minute = time
    mistakes: list[tuple[ReadMisconception, Time]] = []
    if minute > 30:
        mistakes.append(("read_the_next_hour", (next_hour(hour), minute)))
    mistakes.append(("swapped_the_hands", (numeral(minute), nearest_hour_numeral(time) % 12 * 5)))
    if minute > 0 and numeral(minute) != minute:
        mistakes.append(("minute_numeral_as_minutes", (hour, numeral(minute))))
    return [(name, answer) for name, answer in mistakes if answer != time]


def _set_mistakes(time: Time) -> list[tuple[SetMisconception, Clock]]:
    hour, minute = time
    right = clock_for(time)
    mistakes: list[tuple[SetMisconception, Clock]] = []
    if minute >= 30:
        mistakes.append(("hour_hand_on_the_numeral", (hour % 12 * 60, minute)))
    mistakes.append(("swapped_the_hands", (numeral(minute) % 12 * 60, hour % 12 * 5)))
    if 0 < minute <= 12:
        mistakes.append(("minute_hand_on_the_minutes_numeral", (right[0], minute % 12 * 5)))
    return [(name, clock) for name, clock in mistakes if clock != right]


def diagnose_read(time: Time, answer: Time) -> ReadMisconception | None:
    """The mistake behind reading the clock for `time` as `answer`, or None when it is right or none fits."""
    return next((name for name, wrong in _read_mistakes(time) if wrong == answer), None)


def diagnose_set(time: Time, clock: Clock) -> SetMisconception | None:
    """The mistake behind choosing `clock` for `time`, or None when it is right or none fits."""
    return next((name for name, wrong in _set_mistakes(time) if wrong == clock), None)


def _fillers(time: Time) -> list[Time]:
    """Nearby times that aren't mistakes, nearest first: an hour either way, then the minutes moved."""
    hour, minute = time
    previous = 12 if hour == 1 else hour - 1
    return [(next_hour(hour), minute), (previous, minute)] + [(hour, (minute + step) % 60) for step in (30, 15, 45, 5, 55)]


def time_choices(time: Time) -> list[Time]:
    """Four time cards, earliest first: the time, its reading mistakes, then the nearest fillers."""
    cards = [time] + [answer for _, answer in _read_mistakes(time)]
    for filler in _fillers(time):
        if len(set(cards)) == CHOICES:
            break
        cards.append(filler)
    return sorted(set(cards))


def clock_choices(time: Time) -> list[Clock]:
    """Four clocks in hour-hand order: the right one, its setting mistakes, then clocks for the nearest fillers."""
    clocks = [clock_for(time)] + [clock for _, clock in _set_mistakes(time)]
    for filler in _fillers(time):
        if len(set(clocks)) == CHOICES:
            break
        clocks.append(clock_for(filler))
    return sorted(set(clocks))
