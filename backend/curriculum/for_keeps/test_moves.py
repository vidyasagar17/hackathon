import random

import pytest

from .moves import allowed_keep_choices, computer_move, evaluate_move, visible_state
from .rounds import Hand, Round, new_round


def _round(my_cards=(7, 3, 5, 8), hand_number=1, step="arrange", my_numbers=None):
    hands = [Hand(my_cards=[1, 2, 3, 4], robo_cards=[5, 6, 7, 8]) for _ in range(4)]
    hands[hand_number - 1] = Hand(my_cards=list(my_cards), robo_cards=[2, 4, 6, 9], my_numbers=my_numbers)
    return Round(level=1, hands=hands, hand_number=hand_number, step=step)


def _arrange(*cards):
    return {"type": "arrange", "cards": list(cards)}


def _arranged(my_numbers=(73, 58), hand_number=1):
    return _round(hand_number=hand_number, step="difference", my_numbers=my_numbers)


def _difference(answer):
    return {"type": "difference", "answer": answer}


def test_arranging_builds_two_numbers_larger_first_and_moves_to_the_difference_step():
    result = evaluate_move(_round(), _arrange(5, 8, 7, 3))

    assert result.round.hands[0].my_numbers == (73, 58)
    assert result.round.step == "difference"


def test_arranging_is_not_graded():
    result = evaluate_move(_round(), _arrange(7, 3, 5, 8))

    assert (result.correct, result.misconception, result.counted) == (True, None, False)


def test_a_zero_card_in_the_tens_slot_makes_a_one_digit_number():
    result = evaluate_move(_round(my_cards=(0, 5, 9, 2)), _arrange(0, 5, 9, 2))

    assert result.round.hands[0].my_numbers == (92, 5)


def test_arranging_uses_the_current_hand():
    result = evaluate_move(_round(my_cards=(4, 0, 6, 1), hand_number=3), _arrange(6, 1, 4, 0))

    assert result.round.hands[2].my_numbers == (61, 40)
    assert result.round.hands[0].my_numbers is None


def test_evaluating_does_not_change_the_round_it_was_given():
    round = _round()
    evaluate_move(round, _arrange(7, 3, 5, 8))

    assert round.hands[0].my_numbers is None
    assert round.step == "arrange"


@pytest.mark.parametrize(
    "move",
    [
        _arrange(7, 3, 5, 9),
        _arrange(7, 3, 5),
        _arrange(7, 3, 5, 8, 8),
        _arrange(7, 7, 5, 8),
        _arrange("7", 3, 5, 8),
        _arrange(True, 3, 5, 8),
        {"type": "arrange"},
        {"cards": [7, 3, 5, 8]},
        {"type": "banana", "cards": [7, 3, 5, 8]},
    ],
)
def test_a_move_that_does_not_use_exactly_the_hands_four_cards_is_rejected(move):
    with pytest.raises(ValueError):
        evaluate_move(_round(), move)


def test_arranging_is_rejected_outside_the_arrange_step():
    with pytest.raises(ValueError):
        evaluate_move(_round(step="difference"), _arrange(7, 3, 5, 8))


def test_a_correct_difference_is_graded_recorded_and_moves_to_the_keep_step():
    result = evaluate_move(_arranged(), _difference(15))

    assert (result.correct, result.misconception, result.counted) == (True, None, True)
    assert result.round.hands[0].my_answer == 15
    assert result.round.step == "keep"


def test_a_wrong_difference_is_diagnosed_and_still_moves_to_the_keep_step():
    result = evaluate_move(_arranged(), _difference(25))

    assert (result.correct, result.misconception, result.counted) == (False, "smaller_from_larger", True)
    assert result.round.hands[0].my_answer == 25
    assert result.round.step == "keep"


def test_a_wrong_difference_that_matches_no_bug_is_undiagnosed():
    result = evaluate_move(_arranged(), _difference(99))

    assert (result.correct, result.misconception) == (False, None)


def test_a_zero_minus_digit_mistake_is_diagnosed_on_a_later_hand():
    result = evaluate_move(_arranged(my_numbers=(40, 23), hand_number=4), _difference(23))

    assert result.misconception == "zero_minus_digit_gives_digit"
    assert result.round.hands[3].my_answer == 23


def test_a_difference_with_a_one_digit_number_is_graded():
    result = evaluate_move(_arranged(my_numbers=(92, 5)), _difference(87))

    assert result.correct


def test_answering_does_not_change_the_round_it_was_given():
    round = _arranged()
    evaluate_move(round, _difference(25))

    assert round.hands[0].my_answer is None
    assert round.step == "difference"


@pytest.mark.parametrize("answer", ["15", 15.0, True, None])
def test_a_difference_that_is_not_a_whole_number_is_rejected(answer):
    with pytest.raises(ValueError):
        evaluate_move(_arranged(), _difference(answer))


@pytest.mark.parametrize("step", ["arrange", "keep"])
def test_a_difference_is_rejected_outside_the_difference_step(step):
    with pytest.raises(ValueError):
        evaluate_move(_round(step=step, my_numbers=(73, 58)), _difference(15))


def _at_keep(hand_number=1, earlier_kept=()):
    """A round at the keep step of `hand_number`, with earlier hands kept (True) or trashed (False)."""
    round = _round(hand_number=hand_number, step="keep", my_numbers=(73, 58))
    for index, kept in enumerate(earlier_kept):
        round.hands[index].my_numbers = (43, 21)
        round.hands[index].my_answer = 22
        round.hands[index].my_kept = kept
    return round


def _keep(keep):
    return {"type": "keep", "keep": keep}


@pytest.mark.parametrize("keep", [True, False])
def test_keeping_or_trashing_is_recorded_and_starts_the_next_hand(keep):
    result = evaluate_move(_at_keep(), _keep(keep))

    assert result.round.hands[0].my_kept is keep
    assert (result.round.hand_number, result.round.step) == (2, "arrange")


def test_keeping_is_not_graded():
    result = evaluate_move(_at_keep(), _keep(True))

    assert (result.correct, result.misconception, result.counted) == (True, None, False)


@pytest.mark.parametrize(
    "hand_number, earlier_kept",
    [(3, (False, False)), (4, (True, False, False)), (4, (False, False, True))],
)
def test_trashing_is_rejected_when_two_keeps_would_become_impossible(hand_number, earlier_kept):
    round = _at_keep(hand_number, earlier_kept)

    with pytest.raises(ValueError):
        evaluate_move(round, _keep(False))
    assert evaluate_move(round, _keep(True)).round.hands[hand_number - 1].my_kept is True


@pytest.mark.parametrize("hand_number, earlier_kept", [(3, (True, True)), (4, (True, False, True))])
def test_keeping_is_rejected_once_two_scores_are_kept(hand_number, earlier_kept):
    round = _at_keep(hand_number, earlier_kept)

    with pytest.raises(ValueError):
        evaluate_move(round, _keep(True))
    assert evaluate_move(round, _keep(False)).round.hands[hand_number - 1].my_kept is False


@pytest.mark.parametrize("hand_number, earlier_kept", [(1, ()), (2, (False,)), (2, (True,)), (3, (True, False))])
def test_both_choices_are_allowed_while_enough_hands_remain(hand_number, earlier_kept):
    round = _at_keep(hand_number, earlier_kept)

    for keep in (True, False):
        assert evaluate_move(round, _keep(keep)).round.hands[hand_number - 1].my_kept is keep


def test_every_path_of_allowed_choices_ends_the_game_with_exactly_two_keeps():
    finished = []
    waiting = [_at_keep()]
    while waiting:
        round = waiting.pop()
        for keep in allowed_keep_choices(round):
            after = evaluate_move(round, _keep(keep)).round
            if after.step == "over":
                finished.append(after)
            else:
                waiting.append(after.model_copy(update={"step": "keep"}))

    assert len(finished) == 6
    assert all(sum(1 for hand in round.hands if hand.my_kept) == 2 for round in finished)


def test_the_last_hands_keep_or_trash_ends_the_game():
    result = evaluate_move(_at_keep(4, (True, False, False)), _keep(True))

    assert (result.round.hand_number, result.round.step) == (4, "over")


def test_keeping_does_not_change_the_round_it_was_given():
    round = _at_keep()
    evaluate_move(round, _keep(True))

    assert round.hands[0].my_kept is None
    assert (round.hand_number, round.step) == (1, "keep")


def _played(my_numbers=(73, 58), my_answer=15, my_kept=True, robo_numbers=(83, 75), robo_kept=True):
    return Hand(
        my_cards=[7, 3, 5, 8],
        robo_cards=[8, 3, 7, 5],
        my_numbers=my_numbers,
        robo_numbers=robo_numbers,
        my_answer=my_answer,
        my_kept=my_kept,
        robo_kept=robo_kept,
    )


def test_a_new_game_shows_only_the_first_hands_cards():
    round = _round()

    assert visible_state(round) == {
        "level": 1,
        "hand_number": 1,
        "step": "arrange",
        "hands": [
            {
                "my_cards": [7, 3, 5, 8],
                "robo_cards": [2, 4, 6, 9],
                "my_numbers": None,
                "my_answer": None,
                "difference": None,
                "my_kept": None,
                "robo_numbers": None,
                "robo_difference": None,
                "robo_kept": None,
            }
        ],
        "keep_choices": None,
        "keep_reason": None,
        "my_total": 0,
        "robo_total": 0,
    }


def test_the_correct_difference_is_shown_only_after_the_student_answers():
    arranged = evaluate_move(_round(), _arrange(7, 3, 5, 8)).round
    answered = evaluate_move(arranged, _difference(25)).round

    assert visible_state(arranged)["hands"][0]["difference"] is None
    shown = visible_state(answered)["hands"][0]
    assert (shown["my_numbers"], shown["my_answer"], shown["difference"]) == ([73, 58], 25, 15)


def test_robos_arrangement_and_choice_stay_hidden_until_the_student_finishes_the_hand():
    round = _at_keep()
    round.hands[0].robo_numbers = (83, 75)
    round.hands[0].robo_kept = True

    shown = visible_state(round)["hands"][0]
    assert (shown["robo_numbers"], shown["robo_difference"], shown["robo_kept"]) == (None, None, None)

    finished = visible_state(evaluate_move(round, _keep(True)).round)["hands"][0]
    assert (finished["robo_numbers"], finished["robo_difference"], finished["robo_kept"]) == ([83, 75], 8, True)


def test_the_keep_step_shows_the_open_choices_and_why_a_choice_is_forced():
    assert (visible_state(_at_keep())["keep_choices"], visible_state(_at_keep())["keep_reason"]) == ([True, False], None)

    forced = visible_state(_at_keep(3, (False, False)))
    assert (forced["keep_choices"], forced["keep_reason"]) == ([True], "You must keep this one.")

    full = visible_state(_at_keep(3, (True, True)))
    assert (full["keep_choices"], full["keep_reason"]) == ([False], "You have your two scores.")


def test_totals_add_only_kept_correct_differences_from_finished_hands():
    hands = [
        _played(my_answer=25, my_kept=True, robo_kept=False),
        _played(my_numbers=(92, 5), my_answer=87, my_kept=False, robo_numbers=(61, 40), robo_kept=True),
        _played(my_numbers=(40, 23), my_answer=17, my_kept=True, robo_numbers=(52, 50), robo_kept=True),
        _played(my_kept=None, robo_numbers=(99, 10), robo_kept=True),
    ]
    round = Round(level=2, hands=hands, hand_number=4, step="keep")

    state = visible_state(round)
    assert (state["my_total"], state["robo_total"]) == (15 + 17, 21 + 2)


def test_future_hands_are_never_shown_and_a_finished_game_shows_all_four():
    assert len(visible_state(_round(hand_number=3))["hands"]) == 3

    over = Round(level=1, hands=[_played() for _ in range(4)], hand_number=4, step="over")
    state = visible_state(over)
    assert len(state["hands"]) == 4
    assert (state["keep_choices"], state["keep_reason"]) == (None, None)


def _robo_turn(robo_cards, level=1, hand_number=1, earlier_robo_kept=()):
    """A round on `hand_number` that Robo hasn't played, after earlier hands Robo kept or trashed."""
    hands = [Hand(my_cards=[1, 2, 3, 4], robo_cards=[5, 6, 7, 8]) for _ in range(4)]
    for index, kept in enumerate(earlier_robo_kept):
        hands[index].robo_numbers = (65, 58)
        hands[index].robo_kept = kept
    hands[hand_number - 1].robo_cards = list(robo_cards)
    return Round(level=level, hands=hands, hand_number=hand_number, step="difference")


def _robo_play(robo_cards, level=1, hand_number=1, earlier_robo_kept=()):
    round = computer_move(_robo_turn(robo_cards, level, hand_number, earlier_robo_kept), level)
    hand = round.hands[hand_number - 1]
    return hand.robo_numbers, hand.robo_kept


@pytest.mark.parametrize(
    "robo_cards, level, expected",
    [
        ((7, 3, 5, 8), 1, ((73, 58), True)),
        ((9, 1, 2, 3), 1, ((91, 23), False)),
        ((7, 3, 5, 8), 2, ((83, 75), True)),
        ((7, 3, 5, 8), 3, ((83, 75), True)),
        ((0, 2, 4, 6), 2, ((40, 26), True)),
        ((0, 2, 4, 6), 3, ((40, 26), False)),
        ((0, 3, 6, 9), 2, ((60, 39), False)),
    ],
)
def test_robo_arranges_and_keeps_by_its_level_rules(robo_cards, level, expected):
    assert _robo_play(robo_cards, level) == expected


def test_robo_keeps_a_large_difference_when_trashing_would_make_two_keeps_impossible():
    assert _robo_play((9, 1, 2, 3), level=1, hand_number=3, earlier_robo_kept=(False, False)) == ((91, 23), True)


def test_robo_trashes_a_small_difference_once_it_has_two_scores():
    assert _robo_play((7, 3, 5, 8), level=3, hand_number=3, earlier_robo_kept=(True, True)) == ((83, 75), False)


def test_robo_plays_the_same_way_every_time_for_the_same_cards():
    for level in (1, 2, 3):
        assert len({_robo_play((0, 2, 4, 6), level) for _ in range(5)}) == 1


def test_robo_leaves_a_hand_it_has_already_played_and_a_finished_game_alone():
    played = computer_move(_robo_turn((7, 3, 5, 8)), 1)
    assert computer_move(played, 1) == played

    over = Round(level=1, hands=[_played() for _ in range(4)], hand_number=4, step="over")
    assert computer_move(over, 1) == over


def test_robo_does_not_touch_the_students_hand_or_the_round_it_was_given():
    round = _robo_turn((7, 3, 5, 8))
    after = computer_move(round, 2)

    assert round.hands[0].robo_numbers is None
    student_fields = ("my_cards", "my_numbers", "my_answer", "my_kept")
    assert [getattr(after.hands[0], name) for name in student_fields] == [getattr(round.hands[0], name) for name in student_fields]
    assert (after.hand_number, after.step) == (round.hand_number, round.step)


@pytest.mark.parametrize("level", [1, 2, 3])
def test_a_whole_game_through_the_engine_leaves_robo_with_every_hand_played_and_two_keeps(level):
    random.seed(level)
    round = new_round(level)
    while round.step != "over":
        hand = round.hands[round.hand_number - 1]
        round = computer_move(evaluate_move(round, _arrange(*hand.my_cards)).round, level)
        larger, smaller = round.hands[round.hand_number - 1].my_numbers
        round = computer_move(evaluate_move(round, _difference(larger - smaller)).round, level)
        round = computer_move(evaluate_move(round, _keep(allowed_keep_choices(round)[0])).round, level)

    assert all(hand.robo_numbers is not None for hand in round.hands)
    assert sum(1 for hand in round.hands if hand.robo_kept) == 2
    assert sum(1 for hand in round.hands if hand.my_kept) == 2


@pytest.mark.parametrize("keep", [1, "true", None])
def test_a_keep_choice_that_is_not_true_or_false_is_rejected(keep):
    with pytest.raises(ValueError):
        evaluate_move(_at_keep(), _keep(keep))


@pytest.mark.parametrize("step", ["arrange", "difference", "over"])
def test_keeping_is_rejected_outside_the_keep_step(step):
    with pytest.raises(ValueError):
        evaluate_move(_round(step=step, my_numbers=(73, 58)), _keep(True))
