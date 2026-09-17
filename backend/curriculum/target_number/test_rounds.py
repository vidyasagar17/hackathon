from .misconceptions import equation_answer, step_total
from .rounds import HAND_SIZE, ROBO_MOST_CARDS, TOPS, Round, find_way, new_round, robo_way


def _makes(cards, way, target, top):
    """A way uses different cards, starts with no sign, keeps every total in 0..top and ends at the target."""
    first_sign, first = way[0]
    assert first_sign is None
    total = cards[first]
    for sign, index in way[1:]:
        total = step_total(total, sign, cards[index])
        assert 0 <= total <= top
    assert len({index for _, index in way}) == len(way) >= 2
    return total == target


def _shortest(cards, target, top):
    """The fewest cards any way needs, by trying every order and sign (independent of `find_way`)."""
    from itertools import permutations, product

    for size in range(2, len(cards) + 1):
        for order in permutations(range(len(cards)), size):
            for signs in product("+-", repeat=size - 1):
                way = [(None, order[0]), *zip(signs, order[1:])]
                total, fits = cards[order[0]], True
                for sign, index in way[1:]:
                    total = step_total(total, sign, cards[index])
                    fits = fits and 0 <= total <= top
                if fits and total == target:
                    return size
    return None


def test_ways_are_found_with_the_fewest_cards():
    for cards, target in (([9, 5, 3, 1, 8], 16), ([9, 7, 3, 1, 2], 16), ([10, 10, 5, 2, 7], 3)):
        way = find_way(cards, target, 20)
        assert _makes(cards, way, target, 20)
        assert len(way) == _shortest(cards, target, 20)
    assert find_way([1, 1, 1, 1, 1], 16, 20) is None


def test_totals_may_not_leave_the_range():
    """10 + 10 + 5 makes 25 only by going past a top of 20, so with top 20 there is no way."""
    assert len(find_way([10, 10, 5], 25, 25)) == 3
    assert find_way([10, 10, 5], 25, 20) is None


def test_dealt_hands_fit_their_level():
    for level in (1, 2, 3):
        for _ in range(150):
            round = new_round(level)
            top = TOPS[level]
            assert len(round.cards) == len(round.robo_cards) == HAND_SIZE
            if level == 3:
                assert sorted(card > 10 for card in round.cards) == [False, False, False, True, True]
                assert all(11 <= card <= 40 for card in round.cards if card > 10)
                assert 30 <= round.target <= 99
            else:
                assert all(1 <= card <= 10 for card in round.cards + round.robo_cards)
                assert (10 <= round.target <= 20) if level == 1 else (21 <= round.target <= 40)
            assert _makes(round.cards, find_way(round.cards, round.target, top), round.target, top)
            assert _makes(round.robo_cards, find_way(round.robo_cards, round.target, top), round.target, top)


def test_the_equation_uses_the_hand():
    for level in (1, 2, 3):
        for _ in range(100):
            round = new_round(level)
            equation = round.equation
            assert equation.right == min(round.robo_cards)
            assert equation_answer(equation) >= 1
            if level == 1:
                assert equation.left == [round.target]
            else:
                assert equation.left[0] == min(round.cards) and sum(equation.left) == round.target
                assert equation.left[0] != equation.right


def test_robo_uses_at_most_its_level_cards_and_never_shows_a_wrong_way():
    assert ROBO_MOST_CARDS == {1: 2, 2: 4, 3: 4}
    for level in (1, 2, 3):
        found = 0
        for _ in range(200):
            round = new_round(level)
            way = robo_way(round.robo_cards, round.target, level)
            if way:
                found += 1
                assert len(way) <= ROBO_MOST_CARDS[level]
                assert _makes(round.robo_cards, way, round.target, TOPS[level])
        assert 0 < found < 200


def test_a_new_hand_starts_with_no_cards_played():
    round = new_round(1)
    assert round == Round(level=1, cards=round.cards, robo_cards=round.robo_cards, target=round.target, equation=round.equation)
