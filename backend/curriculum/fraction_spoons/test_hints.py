from . import hints
from .misconceptions import Card
from .rounds import GradedMove, deal_hand, new_round


def test_general_hint_is_the_approved_wording():
    assert hints.GENERAL_HINT == "Two fractions are the same size when the top and the bottom are × the same number."


def _graded(collecting: str, card: str) -> GradedMove:
    def card_of(text):
        top, bottom = text.split("/")
        return Card(top=int(top), bottom=int(bottom))

    return GradedMove(kind="fit", collecting=card_of(collecting), cards=[card_of(card)], said_fits=True)


def test_hint_sentence_is_the_code_built_sentence_for_the_latest_graded_move_even_after_the_hand_moved_on():
    earlier = deal_hand(1).model_copy(update={"last_graded": _graded("1/2", "2/3")})
    later_unplayed = deal_hand(1).model_copy(update={"last_graded": _graded("1/3", "2/4")})
    round_ = new_round(1).model_copy(
        update={"hands": [earlier, deal_hand(1), later_unplayed, deal_hand(1), deal_hand(1)], "hand_number": 2}
    )

    assert hints.hint_sentence(round_, "same_difference_means_equal") == (
        "1/2 is 1/2 short of 1, and 2/3 is 1/3 short of 1. 1/3 is smaller than 1/2, so 2/3 is bigger than 1/2."
    )


def test_fraction_spoons_hints_never_call_the_llm():
    assert not hasattr(hints, "reword_hint")


def test_hint_cards_are_the_collecting_card_and_the_claimed_card_the_sentence_explains():
    claim = GradedMove(
        kind="claim",
        collecting=Card(top=1, bottom=2),
        cards=[Card(top=1, bottom=2), Card(top=2, bottom=2), Card(top=2, bottom=3), Card(top=3, bottom=4)],
    )
    played = deal_hand(1).model_copy(update={"last_graded": claim})
    round_ = new_round(1).model_copy(update={"hands": [played, deal_hand(1), deal_hand(1)], "hand_number": 2})

    assert hints.hint_cards(round_, "same_difference_means_equal") == [Card(top=1, bottom=2), Card(top=2, bottom=3)]
    assert hints.hint_cards(round_, "changed_only_top_or_bottom") == [Card(top=1, bottom=2), Card(top=2, bottom=2)]
