import db


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
