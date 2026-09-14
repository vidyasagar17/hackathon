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


def test_cors_allows_a_frontend_on_the_home_network():
    origin = "http://192.168.1.23:5173"
    response = client.get("/health", headers={"Origin": origin})
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_refuses_an_unknown_website():
    response = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_refuses_a_lookalike_of_a_dev_origin():
    response = client.get("/health", headers={"Origin": "http://localhost:5173.evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_allowed_origins_env_var_takes_precedence(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://number-quest.onrender.com, https://example.org")
    assert main._cors_settings() == {
        "allow_origins": ["https://number-quest.onrender.com", "https://example.org"]
    }


def test_check_diagnoses_without_generating_a_hint(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    monkeypatch.setattr(GAMES["subtraction"], "generate_hint", _fail_if_called)

    response = client.post(
        "/games/subtraction/check",
        json={"session_id": "s1", "problem": _problem_data(), "submitted_answer": 616},
    )

    assert response.json() == {"correct": False, "misconception": "smaller_from_larger"}


def test_check_rejects_a_tampered_answer_without_logging_it(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    tampered = {**_problem_data(), "answer": 616}

    response = client.post(
        "/games/subtraction/check",
        json={"session_id": "s1", "problem": tampered, "submitted_answer": 616},
    )

    assert response.status_code == 422
    assert db.get_summary("s1") == (0, 0, [])


def test_problem_includes_progress_toward_the_next_level(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    for _ in range(2):
        db.log_attempt("s1", "subtraction", 1, {}, 0, True, None)

    response = client.get("/games/subtraction/problem", params={"session_id": "s1"})

    body = response.json()
    assert body["problem"]["difficulty"] == 1
    assert body["progress"] == {"level": 1, "correct_in_a_row": 2, "needed": 3, "top_level": 3}


def test_hint_rejects_a_tampered_answer():
    tampered = {**_problem_data(), "answer": 616}

    response = client.post(
        "/games/subtraction/hint",
        json={"problem": tampered, "submitted_answer": 616},
    )

    assert response.status_code == 422


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
