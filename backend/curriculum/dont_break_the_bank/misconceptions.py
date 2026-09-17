"""Rule-based diagnosis for Don't Break the Bank: the sum of the student's numbers, and how far it is from the bank.

Each mistake is a simulator that works the problem column by column the wrong way; the one whose answer
matches the student's is the diagnosis (Brown & Burton, 1978). Adding: the addition workshop's carrying
bugs for any count of numbers, plus writing each column's whole sum side by side (Price, 2002) and adding
every digit as ones (face-value thinking; Ross, 1989). Subtracting from the bank (100 or 1,000) always
borrows across zeros (Burton, 1982): stopping the borrow at a zero, turning a 0 into 9 without borrowing
further left, 0 - n = n, and 0 - n = 0. Numbers are written with a fixed count of digits.
"""

from typing import Callable, Literal

SumMisconception = Literal[
    "no_carry",
    "carry_always",
    "reversed_carry",
    "carry_drops_at_second_column",
    "drops_final_carry",
    "wrote_column_sums_side_by_side",
    "added_digits_as_ones",
]

DistanceMisconception = Literal[
    "stops_borrow_at_zero",
    "borrow_across_zero_failure",
    "zero_minus_digit_gives_digit",
    "zero_minus_digit_gives_zero",
]

MisconceptionName = SumMisconception | DistanceMisconception


def column_digits(numbers: list[int], width: int) -> list[list[int]]:
    """Each column's digits, ones column first: [[ones of each number], [tens of each number], ...]."""
    return [[number // 10**place % 10 for number in numbers] for place in range(width)]


def _written(parts: list[int | str]) -> int:
    """Join what was written in each column, ones column first, into the number the student reads off."""
    return int("".join(str(part) for part in reversed(parts)))


def _no_carry(numbers: list[int], width: int) -> int:
    return _written([sum(column) % 10 for column in column_digits(numbers, width)])


def _no_carry_full_last_column(numbers: list[int], width: int) -> int:
    columns = column_digits(numbers, width)
    return _written([sum(column) % 10 for column in columns[:-1]] + [sum(columns[-1])])


def _carry_always(numbers: list[int], width: int) -> int:
    """Carries 1 into every column after the ones, needed or not."""
    columns = column_digits(numbers, width)
    return _written([sum(columns[0]) % 10] + [(sum(column) + 1) % 10 for column in columns[1:]])


def _carry_always_full_last_column(numbers: list[int], width: int) -> int:
    columns = column_digits(numbers, width)
    middle = [(sum(column) + 1) % 10 for column in columns[1:-1]]
    return _written([sum(columns[0]) % 10] + middle + [sum(columns[-1]) + 1])


def _reversed_carry(numbers: list[int], width: int) -> int:
    """Writes a column's tens digit and carries its ones digit; the last column is written in full."""
    parts, carry = [], 0
    columns = column_digits(numbers, width)
    for column in columns[:-1]:
        total = sum(column) + carry
        parts.append(total // 10 if total >= 10 else total)
        carry = total % 10 if total >= 10 else 0
    return _written(parts + [sum(columns[-1]) + carry])


def _carry_drops_at_second_column(numbers: list[int], width: int) -> int | None:
    """Carries from the ones correctly, but not from the tens; the hundreds digit drops its own overflow.

    Only for 3-digit numbers: with two columns the second carry is the final one.
    """
    if width != 3:
        return None
    ones, tens, hundreds = (sum(column) for column in column_digits(numbers, width))
    return _written([ones % 10, (tens + ones // 10) % 10, hundreds % 10])


def _drops_final_carry(numbers: list[int], width: int) -> int:
    return sum(numbers) % 10**width


def _wrote_column_sums_side_by_side(numbers: list[int], width: int) -> int:
    """Never regroups: each column's whole sum is written next to the others, e.g. 8 | 14 | 12 -> 81412."""
    return _written([sum(column) for column in column_digits(numbers, width)])


def _added_digits_as_ones(numbers: list[int], width: int) -> int:
    return sum(sum(column) for column in column_digits(numbers, width))


_SUM_SIMULATORS: list[tuple[SumMisconception, Callable[[list[int], int], int | None]]] = [
    ("drops_final_carry", _drops_final_carry),
    ("no_carry", _no_carry),
    ("no_carry", _no_carry_full_last_column),
    ("carry_always", _carry_always),
    ("carry_always", _carry_always_full_last_column),
    ("reversed_carry", _reversed_carry),
    ("carry_drops_at_second_column", _carry_drops_at_second_column),
    ("wrote_column_sums_side_by_side", _wrote_column_sums_side_by_side),
    ("added_digits_as_ones", _added_digits_as_ones),
]


def diagnose_sum(numbers: list[int], width: int, answer: int) -> SumMisconception | None:
    """The first simulated mistake whose answer matches, most specific first; None when right or unexplained."""
    if answer == sum(numbers):
        return None
    return next((name for name, simulate in _SUM_SIMULATORS if simulate(numbers, width) == answer), None)


def _columns(bank: int, total: int) -> tuple[list[int], list[int]]:
    """Top (the bank) and bottom (the total) digits, ones first, as many columns as the bank has digits."""
    width = len(str(bank))
    digits = column_digits([bank, total], width)
    return [top for top, _ in digits], [bottom for _, bottom in digits]


def _stops_borrow_at_zero(bank: int, total: int) -> int:
    """Adds 10 to a column that needs it but never takes 1 from the column it borrowed from."""
    top, bottom = _columns(bank, total)
    return _written([t - b if t >= b else t + 10 - b for t, b in zip(top, bottom)])


def _borrow_across_zero_failure(bank: int, total: int) -> int:
    """Borrowing from a 0 turns it into 9 but takes nothing from the column further left."""
    top, bottom = _columns(bank, total)
    parts = []
    for place, b in enumerate(bottom):
        if top[place] < b:
            top[place] += 10
            if top[place + 1] == 0:
                top[place + 1] = 9
            else:
                top[place + 1] -= 1
        parts.append(top[place] - b)
    return _written(parts)


def _zero_minus_digit_gives_digit(bank: int, total: int) -> int:
    top, bottom = _columns(bank, total)
    return _written([b if t == 0 else t - b for t, b in zip(top, bottom)])


def _zero_minus_digit_gives_zero(bank: int, total: int) -> int:
    top, bottom = _columns(bank, total)
    return _written([0 if t == 0 else t - b for t, b in zip(top, bottom)])


_DISTANCE_SIMULATORS: list[tuple[DistanceMisconception, Callable[[int, int], int]]] = [
    ("stops_borrow_at_zero", _stops_borrow_at_zero),
    ("borrow_across_zero_failure", _borrow_across_zero_failure),
    ("zero_minus_digit_gives_digit", _zero_minus_digit_gives_digit),
    ("zero_minus_digit_gives_zero", _zero_minus_digit_gives_zero),
]


def diagnose_distance(bank: int, total: int, answer: int) -> DistanceMisconception | None:
    """The first simulated borrowing mistake for `bank` - `total` that matches `answer`; `total` is at most `bank`."""
    if answer == bank - total:
        return None
    return next((name for name, simulate in _DISTANCE_SIMULATORS if simulate(bank, total) == answer), None)
