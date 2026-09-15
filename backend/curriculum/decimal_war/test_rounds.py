"""Each level deals only the comparison types it diagnoses; checked over many random deals."""

from decimal import Decimal

from .misconceptions import correct_pick
from .rounds import new_round

DEALS = 400


def _value(digits: str) -> Decimal:
    return Decimal(f"0.{digits}")


def _deals(level: int):
    return [new_round(level) for _ in range(DEALS)]


def _shorter_longer(round):
    return sorted((round.mine, round.robo), key=len)


def test_every_deal_has_one_to_three_digits_a_side_and_never_identical_numbers():
    for level in (1, 2, 3):
        for round in _deals(level):
            assert 1 <= len(round.mine) <= 3 and 1 <= len(round.robo) <= 3
            assert round.mine.isdigit() and round.robo.isdigit()
            assert round.mine != round.robo
            assert round.level == level


def test_level_one_deals_same_length_numbers_without_zeros():
    for round in _deals(1):
        assert round.comparison == "same_length"
        assert len(round.mine) == len(round.robo)
        assert "0" not in round.mine + round.robo


def test_level_two_deals_different_lengths_without_zeros_both_ways():
    rounds = _deals(2)
    assert {round.comparison for round in rounds} == {"shorter_larger", "longer_larger"}
    for round in rounds:
        shorter, longer = _shorter_longer(round)
        assert len(shorter) < len(longer)
        assert "0" not in shorter + longer
        if round.comparison == "shorter_larger":
            assert _value(shorter) > _value(longer)
        else:
            assert _value(longer) > _value(shorter)


def test_level_three_deals_zero_traps_equal_pairs_and_interspersed_zeros():
    rounds = _deals(3)
    assert {round.comparison for round in rounds} == {"zero_trap", "equal_pair", "interspersed_zero"}
    for round in rounds:
        shorter, longer = _shorter_longer(round)
        if round.comparison == "zero_trap":
            assert longer.startswith("0") and longer.lstrip("0") == shorter
        elif round.comparison == "equal_pair":
            assert correct_pick(round.mine, round.robo) == "same"
            assert longer.rstrip("0") == shorter
        else:
            assert len(longer) == 3 and longer == shorter[0] + "0" + shorter[1:]


def test_the_students_number_is_sometimes_the_shorter_and_sometimes_the_longer():
    rounds = _deals(2)
    assert any(len(round.mine) < len(round.robo) for round in rounds)
    assert any(len(round.mine) > len(round.robo) for round in rounds)
