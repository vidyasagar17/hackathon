import pytest

from .misconceptions import Card, same_value
from .moves import can_claim, computer_move, evaluate_move, visible_state
from .rounds import Hand, Round, new_round

TRASH = ("1/2", "2/4", "3/6", "4/8", "1/3", "2/6", "2/3", "1/4")
GAMES_PER_LEVEL = 100


def _card(text: str) -> Card:
    top, bottom = text.split("/")
    return Card(top=int(top), bottom=int(bottom))


def _cards(*texts: str) -> list[Card]:
    return [_card(text) for text in texts]


def _texts(cards: list[Card]) -> list[str]:
    return [f"{card.top}/{card.bottom}" for card in cards]


def _round(
    step="collect",
    my=("1/2", "2/4", "3/6", "1/3"),
    robo=("1/3", "2/6", "3/9", "1/4"),
    pile=("4/8", "2/3", "1/4"),
    trash=(),
    collecting=None,
    drawn=None,
    my_spoons=0,
    robo_spoons=0,
    seed=7,
    reshuffles=0,
) -> Round:
    hand = Hand(
        sets=_cards("1/2", "1/3", "1/4"),
        my_cards=_cards(*my),
        robo_cards=_cards(*robo),
        pile=_cards(*pile),
        trash=_cards(*trash),
        collecting=_card(collecting) if collecting else None,
        drawn=_card(drawn) if drawn else None,
        reshuffles=reshuffles,
    )
    return Round(level=1, hands=[hand] * 5, seed=seed, my_spoons=my_spoons, robo_spoons=robo_spoons, step=step)


def _hand(round_: Round) -> Hand:
    return round_.hands[round_.hand_number - 1]


def test_a_turn_runs_collect_draw_fit_discard_and_only_the_fit_tap_is_graded():
    collected = evaluate_move(_round(), {"type": "collect", "card": 0})
    assert (collected.counted, collected.round.step, _hand(collected.round).collecting) == (False, "draw", _card("1/2"))

    drawn = evaluate_move(collected.round, {"type": "draw"})
    assert (drawn.counted, drawn.round.step) == (False, "fit")
    assert _hand(drawn.round).drawn == _card("4/8") and _hand(drawn.round).pile == _cards("2/3", "1/4")

    fitted = evaluate_move(drawn.round, {"type": "fit", "fits": True})
    assert (fitted.counted, fitted.correct, fitted.misconception, fitted.round.step) == (True, True, None, "discard")

    discarded = evaluate_move(fitted.round, {"type": "discard", "card": 3})
    hand = _hand(discarded.round)
    assert (discarded.counted, discarded.round.step) == (False, "choose")
    assert hand.my_cards == _cards("1/2", "2/4", "3/6", "4/8") and hand.trash == _cards("1/3") and hand.drawn is None


def test_the_fit_tap_is_diagnosed_against_the_collecting_card_and_kept_for_the_hint():
    result = evaluate_move(_round(step="fit", collecting="1/2", drawn="2/3"), {"type": "fit", "fits": True})
    assert (result.correct, result.misconception) == (False, "same_difference_means_equal")
    graded = _hand(result.round).last_graded
    assert (graded.kind, graded.collecting, graded.cards, graded.said_fits) == ("fit", _card("1/2"), _cards("2/3"), True)

    rejected = evaluate_move(_round(step="fit", collecting="1/2", drawn="4/8"), {"type": "fit", "fits": False})
    assert (rejected.correct, rejected.misconception) == (False, "bigger_numbers_not_equal")


@pytest.mark.parametrize(
    "round_, move",
    [
        (_round(step="collect"), {"type": "draw"}),
        (_round(step="draw", collecting="1/2"), {"type": "fit", "fits": True}),
        (_round(step="fit", collecting="1/2", drawn="4/8"), {"type": "collect", "card": 0}),
        (_round(step="fit", collecting="1/2", drawn="4/8"), {"type": "fit", "fits": "yes"}),
        (_round(step="collect"), {"type": "collect", "card": 4}),
        (_round(step="discard", collecting="1/2", drawn="4/8"), {"type": "discard", "card": 5}),
        (_round(step="discard", collecting="1/2", drawn="4/8"), {"type": "discard", "card": True}),
        (_round(step="draw", collecting="1/2"), {"type": "claim"}),
        (_round(step="choose", collecting="1/2"), {"type": "shuffle"}),
    ],
)
def test_moves_at_the_wrong_step_or_naming_a_missing_card_are_refused(round_, move):
    with pytest.raises(ValueError):
        evaluate_move(round_, move)


def test_the_collecting_card_can_change_at_the_start_of_a_turn():
    result = evaluate_move(_round(step="draw", collecting="1/2"), {"type": "collect", "card": 3})
    assert (_hand(result.round).collecting, result.round.step, result.counted) == (_card("1/3"), "draw", False)


def test_discarding_the_last_copy_of_the_collecting_card_leaves_none_and_closes_the_claim():
    result = evaluate_move(_round(step="discard", collecting="1/3", drawn="4/8"), {"type": "discard", "card": 3})
    assert _hand(result.round).collecting is None
    assert visible_state(result.round)["can_claim"] is False
    with pytest.raises(ValueError):
        evaluate_move(result.round, {"type": "claim"})


def test_discarding_one_copy_keeps_the_collecting_card_when_another_copy_is_held():
    round_ = _round(step="discard", my=("1/2", "1/2", "3/6", "1/3"), collecting="1/2", drawn="4/8")
    result = evaluate_move(round_, {"type": "discard", "card": 0})
    assert _hand(result.round).collecting == _card("1/2")


def test_a_correct_claim_wins_the_spoon_and_moves_to_the_next_hand():
    round_ = _round(step="choose", my=("1/2", "2/4", "3/6", "4/8"), collecting="1/2")
    result = evaluate_move(round_, {"type": "claim"})
    assert (result.correct, result.misconception, result.counted) == (True, None, True)
    assert (result.round.my_spoons, result.round.hand_number, result.round.step) == (1, 2, "collect")


def test_the_third_spoon_ends_the_game():
    round_ = _round(step="choose", my=("1/2", "2/4", "3/6", "4/8"), collecting="1/2", my_spoons=2)
    result = evaluate_move(round_, {"type": "claim"})
    assert (result.round.my_spoons, result.round.hand_number, result.round.step) == (3, 1, "over")


def test_a_wrong_claim_is_diagnosed_and_the_hand_carries_on_with_one_claim_per_turn():
    round_ = _round(step="choose", my=("1/2", "2/4", "3/6", "2/3"), collecting="1/2")
    result = evaluate_move(round_, {"type": "claim"})
    assert (result.correct, result.misconception, result.counted) == (False, "same_difference_means_equal", True)
    assert (result.round.my_spoons, result.round.hand_number, result.round.step) == (0, 1, "choose")
    graded = _hand(result.round).last_graded
    assert (graded.kind, graded.collecting, graded.cards) == ("claim", _card("1/2"), _cards("1/2", "2/4", "3/6", "2/3"))
    assert visible_state(result.round)["can_claim"] is False
    with pytest.raises(ValueError):
        evaluate_move(result.round, {"type": "claim"})
    handed_over = evaluate_move(result.round, {"type": "robo_turn"})
    assert (handed_over.round.step, handed_over.counted) == ("robo", False)


def test_drawing_opens_the_claim_again_for_the_new_turn():
    round_ = _round(step="draw", collecting="1/2")
    tried = round_.model_copy(update={"hands": [_hand(round_).model_copy(update={"claim_tried": True})] * 5})
    result = evaluate_move(tried, {"type": "draw"})
    assert _hand(result.round).claim_tried is False


def test_an_empty_pile_is_refilled_from_every_trash_card_the_same_way_every_time():
    round_ = _round(step="draw", collecting="1/2", pile=(), trash=TRASH)
    first = _hand(evaluate_move(round_, {"type": "draw"}).round)
    again = _hand(evaluate_move(round_, {"type": "draw"}).round)
    assert first == again
    assert sorted(_texts([first.drawn, *first.pile])) == sorted(TRASH)
    assert (first.trash, first.reshuffles) == ([], 1)


def test_the_seed_and_the_reshuffle_count_change_the_shuffle():
    def order(**changes):
        round_ = _round(step="draw", collecting="1/2", pile=(), trash=TRASH, **changes)
        hand = _hand(evaluate_move(round_, {"type": "draw"}).round)
        return _texts([hand.drawn, *hand.pile])

    assert order(seed=7) != order(seed=8)
    assert order(reshuffles=0) != order(reshuffles=1)


def test_visible_state_shows_only_the_student_s_side_and_robo_s_discard():
    state = visible_state(_round(step="fit", collecting="1/2", drawn="4/8", trash=("2/3",)))
    assert set(state) == {
        "level",
        "hand_number",
        "step",
        "my_cards",
        "collecting",
        "drawn",
        "trash_top",
        "pile_count",
        "my_spoons",
        "robo_spoons",
        "can_claim",
        "robo_discard",
        "robo_spoon_cards",
    }
    assert state["my_cards"] == [{"top": 1, "bottom": 2}, {"top": 2, "bottom": 4}, {"top": 3, "bottom": 6}, {"top": 1, "bottom": 3}]
    assert (state["collecting"], state["drawn"], state["trash_top"], state["pile_count"]) == (
        {"top": 1, "bottom": 2},
        {"top": 4, "bottom": 8},
        {"top": 2, "bottom": 3},
        3,
    )
    assert (state["can_claim"], state["robo_discard"], state["robo_spoon_cards"]) == (False, None, None)


def test_a_dealt_game_plays_its_first_draw_from_the_top_of_the_pile():
    round_ = new_round(1)
    top = _hand(round_).pile[0]
    collected = evaluate_move(round_, {"type": "collect", "card": 0}).round
    drawn = evaluate_move(collected, {"type": "draw"})
    assert _hand(drawn.round).drawn == top and drawn.round.step == "fit"


@pytest.mark.parametrize("step", ["collect", "draw", "fit", "discard", "choose", "over"])
def test_robo_does_nothing_unless_it_is_its_turn(step):
    round_ = _round(step=step, collecting="1/2", drawn="4/8")
    assert computer_move(round_, 1) == round_


def test_robo_keeps_a_match_and_throws_away_a_mistake_card_first():
    round_ = _round(step="robo", collecting="1/2", robo=("1/2", "1/3", "1/4", "2/3"), pile=("2/4", "3/6"))
    hand = _hand(computer_move(round_, 1))
    assert hand.robo_cards == _cards("1/2", "1/3", "1/4", "2/4")
    assert (hand.robo_discard, hand.trash[-1], hand.pile) == (_card("2/3"), _card("2/3"), _cards("3/6"))


def test_robo_throws_away_a_drawn_card_that_is_not_its_value():
    round_ = _round(step="robo", collecting="1/2", robo=("1/3", "2/6", "3/9", "1/4"), pile=("1/2", "3/6"))
    hand = _hand(computer_move(round_, 1))
    assert hand.robo_cards == _cards("1/3", "2/6", "3/9", "1/4")
    assert hand.robo_discard == _card("1/2")


def test_robo_throws_away_its_first_other_card_when_the_drawn_card_matches():
    round_ = _round(step="robo", collecting="1/2", robo=("1/3", "2/6", "1/4", "1/2"), pile=("3/9", "3/6"))
    hand = _hand(computer_move(round_, 1))
    assert hand.robo_cards == _cards("1/3", "2/6", "1/2", "3/9")
    assert hand.robo_discard == _card("1/4")


def test_robo_takes_the_spoon_with_four_equal_cards_and_shows_them_until_the_student_moves():
    round_ = _round(step="robo", collecting="1/2", robo=("1/3", "2/6", "3/9", "1/4"), pile=("4/12", "3/6"))
    after = computer_move(round_, 1)
    assert (after.robo_spoons, after.hand_number, after.step) == (1, 2, "collect")
    assert after.robo_spoon_cards == _cards("1/3", "2/6", "3/9", "4/12")
    assert visible_state(after)["robo_spoon_cards"] == [card.model_dump() for card in _cards("1/3", "2/6", "3/9", "4/12")]
    assert evaluate_move(after, {"type": "collect", "card": 0}).round.robo_spoon_cards is None


def test_a_third_robo_spoon_ends_the_game():
    round_ = _round(step="robo", robo=("1/3", "2/6", "3/9", "1/4"), pile=("4/12",), robo_spoons=2)
    after = computer_move(round_, 1)
    assert (after.robo_spoons, after.hand_number, after.step) == (3, 1, "over")


def test_the_student_s_next_turn_starts_at_draw_or_collect_by_whether_they_hold_a_collecting_card():
    holding = computer_move(_round(step="robo", collecting="1/2", pile=("1/2", "3/6")), 1)
    empty_handed = computer_move(_round(step="robo", pile=("1/2", "3/6")), 1)
    assert (holding.step, empty_handed.step) == ("draw", "collect")


def test_robo_refills_an_empty_pile_the_same_seeded_way_as_the_student():
    round_ = _round(step="robo", collecting="1/2", pile=(), trash=TRASH)
    first, again = _hand(computer_move(round_, 1)), _hand(computer_move(round_, 1))
    assert first == again and first.reshuffles == 1


def _most_held_position(cards: list[Card]) -> int:
    return max(range(len(cards)), key=lambda position: sum(same_value(cards[position], card) for card in cards))


def _scripted_move(round_: Round) -> dict:
    """A student who always taps correctly, keeps cards equal to their Collecting card, and claims a finished set."""
    hand = _hand(round_)
    if round_.step == "collect":
        return {"type": "collect", "card": _most_held_position(hand.my_cards)}
    if round_.step == "draw":
        return {"type": "draw"}
    if round_.step == "fit":
        return {"type": "fit", "fits": same_value(hand.collecting, hand.drawn)}
    if round_.step == "discard":
        cards = [*hand.my_cards, hand.drawn]
        if not same_value(hand.collecting, hand.drawn):
            return {"type": "discard", "card": 4}
        return {"type": "discard", "card": next(i for i, card in enumerate(cards) if not same_value(hand.collecting, card))}
    finished = all(same_value(hand.collecting, card) for card in hand.my_cards)
    return {"type": "claim"} if can_claim(round_) and finished else {"type": "robo_turn"}


@pytest.mark.parametrize("level", [1, 2, 3])
def test_every_game_ends_with_three_spoons_within_five_hands(level):
    for _ in range(GAMES_PER_LEVEL):
        round_ = new_round(level)
        for _ in range(3000):
            if round_.step == "over":
                break
            result = evaluate_move(round_, _scripted_move(round_))
            assert result.correct
            round_ = computer_move(result.round, level)
        assert round_.step == "over"
        assert 3 in (round_.my_spoons, round_.robo_spoons) and round_.hand_number <= 5
