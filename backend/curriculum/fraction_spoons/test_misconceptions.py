from .misconceptions import Card, diagnose_claim, diagnose_fit, same_value


def _card(text: str) -> Card:
    top, bottom = text.split("/")
    return Card(top=int(top), bottom=int(bottom))


def _hand(*texts: str) -> list[Card]:
    return [_card(text) for text in texts]


def test_a_correct_fit_tap_has_no_diagnosis():
    assert diagnose_fit(_card("1/2"), _card("3/6"), said_fits=True) is None
    assert diagnose_fit(_card("1/2"), _card("2/3"), said_fits=False) is None


def test_saying_a_card_with_the_same_difference_fits_is_same_difference_thinking():
    assert diagnose_fit(_card("1/2"), _card("2/3"), said_fits=True) == "same_difference_means_equal"
    assert diagnose_fit(_card("1/2"), _card("3/4"), said_fits=True) == "same_difference_means_equal"
    assert diagnose_fit(_card("2/3"), _card("5/6"), said_fits=True) == "same_difference_means_equal"
    assert diagnose_fit(_card("1/3"), _card("2/4"), said_fits=True) == "same_difference_means_equal"


def test_saying_a_card_with_only_the_top_or_bottom_multiplied_fits_is_one_part_thinking():
    assert diagnose_fit(_card("1/2"), _card("2/2"), said_fits=True) == "changed_only_top_or_bottom"
    assert diagnose_fit(_card("1/2"), _card("1/4"), said_fits=True) == "changed_only_top_or_bottom"
    assert diagnose_fit(_card("2/5"), _card("6/5"), said_fits=True) == "changed_only_top_or_bottom"
    assert diagnose_fit(_card("2/5"), _card("2/15"), said_fits=True) == "changed_only_top_or_bottom"


def test_one_part_thinking_is_judged_against_the_collecting_card_as_written():
    assert diagnose_fit(_card("2/4"), _card("2/2"), said_fits=True) is None
    assert diagnose_fit(_card("2/4"), _card("1/4"), said_fits=True) is None


def test_saying_a_true_match_does_not_fit_is_bigger_numbers_thinking_in_either_direction():
    assert diagnose_fit(_card("1/2"), _card("4/8"), said_fits=False) == "bigger_numbers_not_equal"
    assert diagnose_fit(_card("4/8"), _card("1/2"), said_fits=False) == "bigger_numbers_not_equal"


def test_rejecting_a_copy_of_the_collecting_card_is_undiagnosed():
    assert diagnose_fit(_card("2/4"), _card("2/4"), said_fits=False) is None


def test_a_correct_claim_has_no_diagnosis():
    assert diagnose_claim(_card("1/3"), _hand("1/3", "2/6", "3/9", "4/12")) is None


def test_a_wrong_claim_is_named_by_the_card_that_does_not_belong():
    assert diagnose_claim(_card("1/2"), _hand("1/2", "2/4", "3/6", "2/3")) == "same_difference_means_equal"
    assert diagnose_claim(_card("1/2"), _hand("1/2", "2/3", "3/4", "4/5")) == "same_difference_means_equal"


def test_a_wrong_claim_names_the_mistake_most_odd_cards_show():
    assert diagnose_claim(_card("1/2"), _hand("1/2", "2/2", "1/4", "2/3")) == "changed_only_top_or_bottom"


def test_same_difference_wins_a_tie_between_odd_cards():
    assert diagnose_claim(_card("1/2"), _hand("1/2", "2/4", "2/2", "3/4")) == "same_difference_means_equal"


def test_a_wrong_claim_whose_odd_card_fits_no_mistake_is_undiagnosed():
    assert not same_value(_card("1/2"), _card("1/5"))
    assert diagnose_claim(_card("1/2"), _hand("1/2", "2/4", "3/6", "1/5")) is None


def test_mistake_cards_never_equal_the_collecting_card_and_never_show_both_mistakes():
    for target_bottom in range(2, 13):
        for target_top in range(1, target_bottom):
            target = Card(top=target_top, bottom=target_bottom)
            for top in range(1, 25):
                for bottom in range(1, 25):
                    card = Card(top=top, bottom=bottom)
                    mistake = diagnose_fit(target, card, said_fits=True)
                    if same_value(target, card):
                        assert mistake is None
                    else:
                        same_difference = bottom - top == target_bottom - target_top
                        only_top = bottom == target_bottom and top % target_top == 0 and top > target_top
                        only_bottom = top == target_top and bottom % target_bottom == 0 and bottom > target_bottom
                        one_part = only_top or only_bottom
                        assert not (same_difference and one_part)
                        assert (mistake == "same_difference_means_equal") == same_difference
                        assert (mistake == "changed_only_top_or_bottom") == one_part
