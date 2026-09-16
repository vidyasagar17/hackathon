import itertools
import re

from . import hints
from .misconceptions import diagnose_shut, diagnose_total, total_choices
from .rounds import GradedMove, Round
from .sentences import specific_hint


def _total(dice):
    return GradedMove(kind="total", dice=dice, total=sum(dice))


def _shut(total, tiles):
    return GradedMove(kind="shut", dice=(1, total - 1), total=total, tiles=tiles)


def test_a_total_hint_is_addition_wars_counting_sentence_with_the_dice_as_cards():
    assert specific_hint(_total((3, 5)), "one_more_than_second") == "Start at 5 and count on 3 more: 6, 7, 8."
    assert specific_hint(_total((3, 5)), "counted_on_from_start") == (
        "When you count on from 5, the first number you say is 6: 6, 7, 8."
    )
    assert specific_hint(_total((3, 5)), "subtracted_instead") == "Put the dice together: 3 and 5 make 8."


def test_a_counted_on_shut_hint_counts_on_from_the_biggest_tile():
    assert specific_hint(_shut(8, [4, 5]), "tiles_counted_on_from_start") == (
        "Start at 5 and count on: 6, 7, 8, 9. 5 and 4 make 9. You need 8."
    )
    assert specific_hint(_shut(8, [1, 2, 7]), "tiles_counted_on_from_start") == (
        "Start at 7 and count on: 8, 9, 10. 7, 2 and 1 make 10. You need 8."
    )


def test_a_total_tile_hint_says_the_tile_is_the_total_by_itself():
    assert specific_hint(_shut(8, [2, 8]), "added_the_total_tile") == "The 8 tile is 8 all by itself. 8 and 2 make 10."


def test_hint_sentence_uses_the_latest_graded_move():
    round_ = Round(level=2, my_rolls=[], robo_rolls=[], my_open=[], robo_open=[], last_graded=_shut(8, [4, 5]))
    assert hints.hint_sentence(round_, "tiles_counted_on_from_start").startswith("Start at 5 and count on")
    assert not hasattr(hints, "reword_hint")


def test_every_diagnosed_shut_hint_counts_to_the_real_sum_and_names_the_total():
    for total in range(2, 13):
        for size in (2, 3):
            for tiles in itertools.combinations(range(1, 13), size):
                misconception = diagnose_shut(total, list(tiles))
                if misconception is None:
                    continue
                sentence = specific_hint(_shut(total, list(tiles)), misconception)
                assert f"make {sum(tiles)}." in sentence, sentence
                if misconception == "tiles_counted_on_from_start":
                    counted = [int(number) for number in re.findall(r"\d+", sentence.split(": ")[1].split(".")[0])]
                    assert counted[-1] == sum(tiles), sentence
                    assert sentence.endswith(f"You need {total}."), sentence


def test_every_diagnosed_dice_total_has_a_hint_ending_at_the_real_total():
    for dice in itertools.product(range(1, 7), repeat=2):
        for pick in total_choices(dice):
            misconception = diagnose_total(dice, pick)
            if misconception is None:
                continue
            sentence = specific_hint(_total(dice), misconception)
            assert re.findall(r"\d+", sentence)[-1] == str(sum(dice)), sentence
