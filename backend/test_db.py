import db
from tiering import TierAttempt


def _fresh_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()


def test_a_saved_round_can_be_read_back_and_updated(tmp_path, monkeypatch):
    _fresh_db(tmp_path, monkeypatch)
    round_id = db.save_round("s1", "decimal-war", 2, {"cards": [4, 0, 7]})

    db.update_round(round_id, {"cards": [4, 0, 7], "point_after": 1})

    assert db.get_round(round_id) == db.StoredRound(
        session_id="s1", game="decimal-war", level=2, state={"cards": [4, 0, 7], "point_after": 1}
    )


def test_round_ids_are_random_not_counting_up(tmp_path, monkeypatch):
    _fresh_db(tmp_path, monkeypatch)
    first = db.save_round("s1", "decimal-war", 1, {})
    second = db.save_round("s1", "decimal-war", 1, {})

    assert first != second
    assert len(first) == 32 and not first.isdigit()


def test_an_unknown_round_id_has_no_round(tmp_path, monkeypatch):
    _fresh_db(tmp_path, monkeypatch)

    assert db.get_round("0" * 32) is None


def test_move_history_lists_this_games_moves_oldest_first_at_their_round_level(tmp_path, monkeypatch):
    _fresh_db(tmp_path, monkeypatch)
    level_one = db.save_round("s1", "decimal-war", 1, {})
    level_two = db.save_round("s1", "decimal-war", 2, {})
    db.log_move(level_one, {"judged": "mine"}, True, None)
    db.log_move(level_two, {"judged": "theirs"}, False, "longer_is_larger")
    db.log_move(db.save_round("s1", "addition-war", 1, {}), {}, False, "off_by_one")
    db.log_move(db.save_round("other-session", "decimal-war", 1, {}), {}, True, None)

    assert db.get_move_history("s1", "decimal-war") == [
        TierAttempt(difficulty=1, correct=True, misconception=None),
        TierAttempt(difficulty=2, correct=False, misconception="longer_is_larger"),
    ]


def test_summary_counts_moves_alongside_workshop_attempts(tmp_path, monkeypatch):
    _fresh_db(tmp_path, monkeypatch)
    db.log_attempt("s1", "subtraction", 1, {}, 0, False, "always_borrow")
    round_id = db.save_round("s1", "decimal-war", 1, {})
    db.log_move(round_id, {}, False, "longer_is_larger")
    db.log_move(round_id, {}, True, None)
    db.log_move(db.save_round("other-session", "decimal-war", 1, {}), {}, False, "longer_is_larger")

    total_attempts, correct_count, rows = db.get_summary("s1")

    assert (total_attempts, correct_count) == (3, 1)
    assert rows == [("decimal-war", "longer_is_larger", 1), ("subtraction", "always_borrow", 1)]


def test_summary_keeps_same_named_misconceptions_separate_per_game(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    for game in ("addition", "addition", "multiplication"):
        db.log_attempt("s1", game, 1, {}, 0, False, "no_carry")
    db.log_attempt("s1", "addition", 1, {}, 5, True, None)
    db.log_attempt("other-session", "addition", 1, {}, 0, False, "no_carry")

    total_attempts, correct_count, rows = db.get_summary("s1")

    assert (total_attempts, correct_count) == (4, 1)
    assert rows == [("addition", "no_carry", 2), ("multiplication", "no_carry", 1)]
