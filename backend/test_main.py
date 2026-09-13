from fastapi.testclient import TestClient

import db
import main
from games import GAMES
from games.subtraction.problems import Problem, compute_columns

client = TestClient(main.app)


def _problem_data() -> dict:
    return Problem(
        minuend=742,
        subtrahend=158,
        answer=584,
        columns=compute_columns(742, 158),
        difficulty=1,
    ).model_dump()


def _fail_if_called(*args):
    raise AssertionError("generate_hint must not be called")


def test_check_diagnoses_without_generating_a_hint(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    monkeypatch.setattr(GAMES["subtraction"], "generate_hint", _fail_if_called)

    response = client.post(
        "/games/subtraction/check",
        json={"session_id": "s1", "problem": _problem_data(), "submitted_answer": 616},
    )

    assert response.json() == {"correct": False, "misconception": "smaller_from_larger"}


def test_hint_rediagnoses_and_phrases_the_hint(monkeypatch):
    monkeypatch.setattr(
        GAMES["subtraction"], "generate_hint", lambda problem, name: f"hint for {name}"
    )

    response = client.post(
        "/games/subtraction/hint",
        json={"problem": _problem_data(), "submitted_answer": 616},
    )

    assert response.json() == {
        "misconception": "smaller_from_larger",
        "hint": "hint for smaller_from_larger",
    }


def test_hint_falls_back_to_general_hint_for_undiagnosed_answer(monkeypatch):
    monkeypatch.setattr(GAMES["subtraction"], "generate_hint", _fail_if_called)

    response = client.post(
        "/games/subtraction/hint",
        json={"problem": _problem_data(), "submitted_answer": 999},
    )

    assert response.json() == {
        "misconception": None,
        "hint": GAMES["subtraction"].GENERAL_HINT,
    }


def test_hint_is_empty_for_a_correct_answer(monkeypatch):
    monkeypatch.setattr(GAMES["subtraction"], "generate_hint", _fail_if_called)

    response = client.post(
        "/games/subtraction/hint",
        json={"problem": _problem_data(), "submitted_answer": 584},
    )

    assert response.json() == {"misconception": None, "hint": None}
