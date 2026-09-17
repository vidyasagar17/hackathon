"""Code-built Don't Break the Bank hint sentences from the student's own numbers.

A sum hint names one column the mistake got wrong, reading the digits top to bottom and adding the carried
1 when there is one. A distance hint says how the bank trades into smaller places (1000 is 9 hundreds,
9 tens and 10 ones), then counts up from the total to the bank. Every sentence is shown after the right
answer is on screen, so it may say it.
"""

from typing import Callable

from .misconceptions import DistanceMisconception, MisconceptionName, SumMisconception, column_digits

PLACES = ["ones", "tens", "hundreds", "thousands"]
ONE_OF = {"ones": "ten", "tens": "hundred", "hundreds": "thousand"}


def _columns(numbers: list[int], width: int) -> list[tuple[list[int], int, int]]:
    """Each column, ones first: its digits top to bottom, the carry coming in, and its total with that carry."""
    columns, carry = [], 0
    for digits in column_digits(numbers, width):
        total = sum(digits) + carry
        columns.append((digits, carry, total))
        carry = total // 10
    return columns


def _adding(place: int, digits: list[int], carry: int, total: int) -> str:
    """In the tens column, 5 + 6 + 6 plus the 1 you carried makes 18"""
    carried = f" plus the {carry} you carried" if carry else ""
    return f"In the {PLACES[place]} column, {' + '.join(str(digit) for digit in digits)}{carried} makes {total}"


def _rightmost(columns: list[tuple[list[int], int, int]], wanted: Callable[[int, int], bool]) -> int:
    """The rightmost column, not counting the last, whose total and position fit `wanted`."""
    return next(place for place, (_, _, total) in enumerate(columns[:-1]) if wanted(place, total))


def _write_and_carry(numbers: list[int], width: int) -> str:
    columns = _columns(numbers, width)
    place = _rightmost(columns, lambda _, total: total >= 10)
    digits, carry, total = columns[place]
    return (
        f"{_adding(place, digits, carry, total)}, so write {total % 10} "
        f"and carry {total // 10} to the {PLACES[place + 1]} column."
    )


def _no_carry(numbers: list[int], width: int) -> str:
    return _write_and_carry(numbers, width)


def _carry_always(numbers: list[int], width: int) -> str:
    """Point at the rightmost column whose carry isn't 1: none, or 2 when three digits and a carry make 20 or more."""
    columns = _columns(numbers, width)
    place = _rightmost(columns, lambda _, total: total // 10 != 1)
    digits, carry, total = columns[place]
    if total < 10:
        return f"{_adding(place, digits, carry, total)}, less than 10, so don't carry anything to the {PLACES[place + 1]} column."
    return f"{_adding(place, digits, carry, total)}, so carry {total // 10} to the {PLACES[place + 1]} column."


def _reversed_carry(numbers: list[int], width: int) -> str:
    columns = _columns(numbers, width)
    place = _rightmost(columns, lambda _, total: total >= 10)
    digits, carry, total = columns[place]
    return (
        f"{_adding(place, digits, carry, total)}: write the ones digit, {total % 10}, "
        f"and carry the tens digit, {total // 10}, to the {PLACES[place + 1]} column."
    )


def _carry_drops_at_second_column(numbers: list[int], width: int) -> str:
    """Only diagnosed when the tens column carries."""
    digits, carry, total = _columns(numbers, width)[1]
    return f"{_adding(1, digits, carry, total)}, so carry {total // 10} to the hundreds column too."


def _drops_final_carry(numbers: list[int], width: int) -> str:
    place = width - 1
    digits, carry, total = _columns(numbers, width)[place]
    return f"{_adding(place, digits, carry, total)}: write all of {total}, so the sum is {sum(numbers)}."


def _wrote_column_sums_side_by_side(numbers: list[int], width: int) -> str:
    columns = _columns(numbers, width)
    place = _rightmost(columns, lambda _, total: total >= 10)
    return f"10 {PLACES[place]} make 1 {ONE_OF[PLACES[place]]}. {_write_and_carry(numbers, width)}"


def _place_name(place: int, count: int) -> str:
    """hundreds, or hundred for a count of 1."""
    return PLACES[place] if count != 1 else PLACES[place].removesuffix("s")


def _added_digits_as_ones(numbers: list[int], width: int) -> str:
    """Name what the largest number's digits left of the ones are worth, skipping zeros (a 0-9 die makes 045)."""
    number = max(numbers)
    digits = [int(digit) for digit in str(number).zfill(width)]
    worth = [
        f"the {digit} means {digit} {_place_name(width - 1 - index, digit)}, or {digit * 10 ** (width - 1 - index)}"
        for index, digit in enumerate(digits[:-1])
        if digit
    ]
    order = f"Add the {', then the '.join(PLACES[:width])}."
    return f"In {number}, {', and '.join(worth)}. {order}" if worth else order


def _trade(bank: int) -> str:
    """1000 is 9 hundreds, 9 tens and 10 ones."""
    if bank == 1000:
        return "1000 is 9 hundreds, 9 tens and 10 ones"
    return "100 is 9 tens and 10 ones"


def _count_up(bank: int, total: int) -> str:
    """Count up to the next hundred (or ten, for 100), then to the bank."""
    step = bank // 10
    middle = -(-total // step) * step
    if middle in (total, bank):
        return f"Or count up: {total} + {bank - total} = {bank}."
    return f"Or count up: {total} + {middle - total} = {middle}, and {middle} + {bank - middle} = {bank}."


def _first_zero_over_digit(bank: int, total: int) -> int:
    """The rightmost digit of the total that sits under a 0 of the bank."""
    return next(total // 10**place % 10 for place in range(len(str(bank)) - 1) if total // 10**place % 10)


def _distance(bank: int, total: int, opening: str) -> str:
    return f"{opening} {_trade(bank)}, so {bank} − {total} = {bank - total}. {_count_up(bank, total)}"


def _stops_borrow_at_zero(bank: int, total: int) -> str:
    return _distance(bank, total, "When a column borrows, the column it borrows from goes down by 1:")


def _borrow_across_zero_failure(bank: int, total: int) -> str:
    return _distance(bank, total, "A 0 has nothing to lend until it borrows from the column to its left:")


def _zero_minus_digit_gives_digit(bank: int, total: int) -> str:
    digit = _first_zero_over_digit(bank, total)
    return _distance(bank, total, f"0 take away {digit} is not {digit}, so borrow first:")


def _zero_minus_digit_gives_zero(bank: int, total: int) -> str:
    digit = _first_zero_over_digit(bank, total)
    return _distance(bank, total, f"0 take away {digit} is not 0, so borrow first:")


_SUM_BUILDERS: dict[SumMisconception, Callable[[list[int], int], str]] = {
    "no_carry": _no_carry,
    "carry_always": _carry_always,
    "reversed_carry": _reversed_carry,
    "carry_drops_at_second_column": _carry_drops_at_second_column,
    "drops_final_carry": _drops_final_carry,
    "wrote_column_sums_side_by_side": _wrote_column_sums_side_by_side,
    "added_digits_as_ones": _added_digits_as_ones,
}

_DISTANCE_BUILDERS: dict[DistanceMisconception, Callable[[int, int], str]] = {
    "stops_borrow_at_zero": _stops_borrow_at_zero,
    "borrow_across_zero_failure": _borrow_across_zero_failure,
    "zero_minus_digit_gives_digit": _zero_minus_digit_gives_digit,
    "zero_minus_digit_gives_zero": _zero_minus_digit_gives_zero,
}


def sum_hint(numbers: list[int], width: int, misconception: MisconceptionName) -> str:
    return _SUM_BUILDERS[misconception](numbers, width)


def distance_hint(bank: int, total: int, misconception: MisconceptionName) -> str:
    return _DISTANCE_BUILDERS[misconception](bank, total)
