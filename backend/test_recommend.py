from recommend import (
    GameProgress,
    Misconception,
    game_states,
    mastery_of,
    recommend,
)


def _progress(game, total=10, correct=9, top_level=3, last_played="2026-09-18 10:00:00"):
    return GameProgress(
        game=game, total=total, correct=correct, top_level=top_level, last_played=last_played
    )


def _mistake(game, name, count=2, last_seen="2026-09-18 10:00:00"):
    return Misconception(game=game, name=name, count=count, last_seen=last_seen)


def test_too_few_answers_stays_learning_however_many_are_right():
    assert mastery_of(_progress("clock-match", total=3, correct=3)) == "learning"


def test_the_top_level_answered_well_is_strong():
    assert mastery_of(_progress("clock-match", total=10, correct=9, top_level=3)) == "strong"


def test_the_top_level_answered_poorly_is_not_strong():
    assert mastery_of(_progress("clock-match", total=10, correct=6, top_level=3)) == "growing"


def test_a_low_level_answered_well_is_growing_not_strong():
    assert mastery_of(_progress("clock-match", total=10, correct=9, top_level=1)) == "growing"


def test_every_game_in_the_band_gets_a_tile_and_unplayed_ones_read_new():
    states = game_states("k-1", [_progress("shut-the-box")])
    by_game = {state.game: state for state in states}

    assert set(by_game) == {
        "cover-the-number",
        "shut-the-box",
        "four-in-a-row",
        "addition-war",
        "take-away-war",
    }
    assert by_game["shut-the-box"].mastery == "strong"
    assert by_game["four-in-a-row"].mastery == "new"
    assert by_game["four-in-a-row"].total == 0


def test_a_game_from_another_band_gets_no_tile():
    assert all(state.game != "decimal-war" for state in game_states("k-1", [_progress("decimal-war")]))


def test_a_brand_new_learner_is_sent_to_try_something():
    suggestion = recommend("2-3", [], [])

    assert suggestion.reason == "try_new"
    assert suggestion.game in {
        "for-keeps",
        "multiplication-shootout",
        "dont-break-the-bank",
        "target-number",
        "clock-match",
    }


def test_a_repeated_mistake_wins_over_everything_else():
    suggestion = recommend(
        "2-3",
        [_progress("clock-match")],
        [_mistake("clock-match", "hour_hand_read_as_nearest", count=3)],
    )

    assert suggestion.reason == "stuck_on"
    assert suggestion.game == "clock-match"
    assert suggestion.misconception == "hour_hand_read_as_nearest"


def test_a_mistake_seen_only_once_is_not_enough_to_send_them_back():
    suggestion = recommend(
        "2-3", [_progress("clock-match")], [_mistake("clock-match", "slipped", count=1)]
    )

    assert suggestion.reason != "stuck_on"


def test_a_mistake_from_another_band_is_ignored():
    suggestion = recommend(
        "2-3", [_progress("clock-match")], [_mistake("decimal-war", "longer_is_larger", count=5)]
    )

    assert suggestion.game != "decimal-war"


def test_an_unfinished_game_is_picked_up_before_a_new_one():
    suggestion = recommend(
        "2-3", [_progress("clock-match", total=10, correct=5, top_level=1)], []
    )

    assert suggestion.reason == "keep_going"
    assert suggestion.game == "clock-match"


def test_the_most_recently_played_unfinished_game_is_the_one_resumed():
    suggestion = recommend(
        "2-3",
        [
            _progress("clock-match", total=8, correct=4, last_played="2026-09-10 09:00:00"),
            _progress("target-number", total=8, correct=4, last_played="2026-09-17 09:00:00"),
        ],
        [],
    )

    assert suggestion.game == "target-number"


def test_once_every_game_in_the_band_is_strong_the_weakest_keeps_them_sharp():
    suggestion = recommend(
        "k-1",
        [
            _progress("cover-the-number", total=10, correct=10),
            _progress("shut-the-box", total=10, correct=8),
            _progress("four-in-a-row", total=10, correct=9),
            _progress("addition-war", total=10, correct=10),
            _progress("take-away-war", total=10, correct=10),
        ],
        [],
    )

    assert suggestion.reason == "stay_sharp"
    assert suggestion.game == "shut-the-box"
