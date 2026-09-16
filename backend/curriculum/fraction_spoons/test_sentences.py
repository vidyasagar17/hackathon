import re
from fractions import Fraction

from games.hint_check import keeps_facts

from .misconceptions import Card, diagnose_fit
from .rounds import GradedMove, deal_hand
from .sentences import claim_card, specific_hint

DEALS_PER_LEVEL = 100
_RELATION = re.compile(r"(\d+)/(\d+) is (bigger|smaller) than (\d+)/(\d+)")
_EQUATION = re.compile(r"(\d+)/(\d+) = (\d+)/(\d+)")
_SHORT_OF_ONE = re.compile(r"(\d+)/(\d+) is (\d+)/(\d+) short of 1")
_SCALED = re.compile(r"(\d+)/(\d+) is (\d+)/(\d+) with the top and the bottom × (\d+)")
_BOTTOM = re.compile(r"\d+/(\d+)")


def _card(text: str) -> Card:
    top, bottom = text.split("/")
    return Card(top=int(top), bottom=int(bottom))


def _fit(collecting: str, card: str, said_fits: bool = True) -> GradedMove:
    return GradedMove(kind="fit", collecting=_card(collecting), cards=[_card(card)], said_fits=said_fits)


def _value(top: str, bottom: str) -> Fraction:
    return Fraction(int(top), int(bottom))


def test_same_difference_compares_how_far_each_fraction_is_short_of_a_whole():
    assert specific_hint(_fit("1/2", "2/3"), "same_difference_means_equal") == (
        "1/2 is 1/2 short of 1, and 2/3 is 1/3 short of 1. 1/3 is smaller than 1/2, so 2/3 is bigger than 1/2."
    )
    assert specific_hint(_fit("2/3", "1/2"), "same_difference_means_equal") == (
        "2/3 is 1/3 short of 1, and 1/2 is 1/2 short of 1. 1/2 is bigger than 1/3, so 1/2 is smaller than 2/3."
    )


def test_changed_only_top_or_bottom_shows_both_parts_multiplied_by_the_same_number():
    assert specific_hint(_fit("1/2", "1/4"), "changed_only_top_or_bottom") == (
        "Equal fractions have the top and the bottom × the same number: 1/2 = 2/4. "
        "1/4 has only the bottom × 2, so 1/4 is smaller than 1/2."
    )
    assert specific_hint(_fit("1/2", "2/2"), "changed_only_top_or_bottom") == (
        "Equal fractions have the top and the bottom × the same number: 1/2 = 2/4. "
        "2/2 has only the top × 2, so 2/2 is bigger than 1/2."
    )


def test_changed_only_top_or_bottom_skips_an_example_with_a_bottom_over_100():
    assert specific_hint(_fit("50/100", "100/100"), "changed_only_top_or_bottom") == (
        "Equal fractions have the top and the bottom × the same number. "
        "100/100 has only the top × 2, so 100/100 is bigger than 50/100."
    )


def test_bigger_numbers_shows_the_same_fraction_with_top_and_bottom_multiplied():
    assert specific_hint(_fit("1/2", "4/8", False), "bigger_numbers_not_equal") == (
        "4/8 is 1/2 with the top and the bottom × 4, so 4/8 and 1/2 are the same size."
    )
    assert specific_hint(_fit("4/8", "1/2", False), "bigger_numbers_not_equal") == (
        "4/8 is 1/2 with the top and the bottom × 4, so 1/2 and 4/8 are the same size."
    )
    assert specific_hint(_fit("2/4", "3/6", False), "bigger_numbers_not_equal") == (
        "2/4 and 3/6 are both 1/2 with the top and the bottom × 2 and × 3, so they are the same size."
    )


def test_a_claim_explains_the_first_odd_card_that_shows_the_named_mistake():
    claim = GradedMove(kind="claim", collecting=_card("1/2"), cards=[_card(text) for text in ("1/2", "2/2", "2/3", "3/4")])
    assert claim_card(claim, "same_difference_means_equal") == _card("2/3")
    assert claim_card(claim, "changed_only_top_or_bottom") == _card("2/2")
    assert specific_hint(claim, "same_difference_means_equal") == specific_hint(_fit("1/2", "2/3"), "same_difference_means_equal")


def _flipped(sentence: str) -> str:
    if "bigger" in sentence or "smaller" in sentence:
        return sentence.replace("bigger", "@").replace("smaller", "bigger").replace("@", "smaller")
    return sentence.replace("the same size", "different sizes")


def test_every_diagnosed_move_in_real_deals_gets_a_true_sentence_that_a_flipped_rewording_cannot_pass():
    checked = {}
    for level in (1, 2, 3):
        for _ in range(DEALS_PER_LEVEL):
            hand = deal_hand(level)
            for collecting in hand.my_cards:
                for card in hand.my_cards + hand.robo_cards + hand.pile:
                    for said_fits in (True, False):
                        misconception = diagnose_fit(collecting, card, said_fits)
                        if misconception is None:
                            continue
                        move = GradedMove(kind="fit", collecting=collecting, cards=[card], said_fits=said_fits)
                        sentence = specific_hint(move, misconception)
                        checked[misconception] = checked.get(misconception, 0) + 1

                        for a, b, relation, c, d in _RELATION.findall(sentence):
                            left, right = _value(a, b), _value(c, d)
                            assert (left > right) if relation == "bigger" else (left < right), sentence
                        for a, b, c, d in _EQUATION.findall(sentence):
                            assert _value(a, b) == _value(c, d), sentence
                        for a, b, c, d in _SHORT_OF_ONE.findall(sentence):
                            assert _value(a, b) + _value(c, d) == 1, sentence
                        for a, b, c, d, times in _SCALED.findall(sentence):
                            assert (int(a), int(b)) == (int(c) * int(times), int(d) * int(times)), sentence
                        if "same size" in sentence:
                            assert _value(collecting.top, collecting.bottom) == _value(card.top, card.bottom), sentence
                        assert all(int(bottom) <= 100 for bottom in _BOTTOM.findall(sentence)), sentence
                        assert not keeps_facts(_flipped(sentence), sentence), sentence
    assert set(checked) == {"same_difference_means_equal", "changed_only_top_or_bottom", "bigger_numbers_not_equal"}
