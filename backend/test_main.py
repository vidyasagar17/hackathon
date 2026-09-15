from types import SimpleNamespace

from fastapi.testclient import TestClient
from pydantic import BaseModel

import db
import main
from curriculum.engine import MoveResult
from curriculum.for_keeps import hints as for_keeps_hints
from curriculum.for_keeps.rounds import Hand, Round as ForKeepsRound
from games import GAMES
from games.subtraction.problems import Problem, compute_columns
from tiering import TierAttempt

client = TestClient(main.app)


class PickRound(BaseModel):
    """Fake curriculum game for route tests: pick the bigger of two numbers."""

    a: int
    b: int
    secret: str
    computer_turns: int = 0


def _pick_evaluate(round: PickRound, move: dict) -> MoveResult:
    correct = move["pick"] == max(round.a, round.b)
    return MoveResult(correct=correct, misconception=None if correct else "picked_smaller", round=round)


PICK_GAME = SimpleNamespace(
    Round=PickRound,
    new_round=lambda level: PickRound(a=3, b=8, secret="hidden"),
    visible_state=lambda round: {"a": round.a, "b": round.b, "computer_turns": round.computer_turns},
    evaluate_move=_pick_evaluate,
    computer_move=lambda round, level: round.model_copy(update={"computer_turns": round.computer_turns + 1}),
)


def _with_pick_game(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    monkeypatch.setitem(main.CURRICULUM_GAMES, "pick", PICK_GAME)


def test_new_round_is_saved_and_returns_only_what_the_student_may_see(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)

    response = client.post("/curriculum/pick/rounds", params={"session_id": "s1"})

    body = response.json()
    assert body["visible_state"] == {"a": 3, "b": 8, "computer_turns": 0}
    assert body["progress"] == {"level": 1, "correct_in_a_row": 0, "needed": 3, "top_level": 3}
    assert db.get_round(body["round_id"]).state["secret"] == "hidden"


def test_new_round_for_an_unknown_curriculum_game_is_404(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)

    response = client.post("/curriculum/no-such-game/rounds", params={"session_id": "s1"})

    assert response.status_code == 404


def test_a_move_is_evaluated_logged_and_answered_by_the_computer(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)
    round_id = client.post("/curriculum/pick/rounds", params={"session_id": "s1"}).json()["round_id"]

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": 3}})

    assert response.json() == {
        "correct": False,
        "misconception": "picked_smaller",
        "visible_state": {"a": 3, "b": 8, "computer_turns": 1},
    }
    assert db.get_move_history("s1", "pick") == [
        TierAttempt(difficulty=1, correct=False, misconception="picked_smaller")
    ]
    assert db.get_round(round_id).state["computer_turns"] == 1


def test_a_move_for_an_unknown_round_is_404(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)

    response = client.post(f"/rounds/{'0' * 32}/moves", json={"move": {"pick": 8}})

    assert response.status_code == 404


def test_a_new_rounds_level_follows_the_students_move_history(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)
    for _ in range(3):
        round_id = client.post("/curriculum/pick/rounds", params={"session_id": "s1"}).json()["round_id"]
        client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": 8}})

    response = client.post("/curriculum/pick/rounds", params={"session_id": "s1"})

    assert response.json()["progress"]["level"] == 2
    assert db.get_round(response.json()["round_id"]).level == 2


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


def _decimal_war_dealing(tmp_path, monkeypatch, mine, robo, comparison, round_level=None):
    """Use a temp database and make Decimal War deal a fixed pair, so results are predictable.

    `round_level` forces the dealt round's level (e.g. 3 for the "same" choice) on a fresh session.
    """
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["decimal-war"]
    monkeypatch.setattr(
        game,
        "new_round",
        lambda level: game.Round(
            level=round_level or level, comparison=comparison, mine=mine, robo=robo
        ),
    )


def test_a_decimal_war_round_is_played_through_the_move_routes(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="45", robo="8", comparison="shorter_larger")
    round_id = client.post("/curriculum/decimal-war/rounds", params={"session_id": "s1"}).json()["round_id"]

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "mine"}})

    assert response.json() == {
        "correct": False,
        "misconception": "longer_is_larger",
        "visible_state": {
            "level": 1,
            "mine": "0.45",
            "robo": "0.8",
            "choices": ["mine", "robo"],
            "pick": "mine",
            "correct_pick": "robo",
        },
    }
    assert db.get_move_history("s1", "decimal-war") == [
        TierAttempt(difficulty=1, correct=False, misconception="longer_is_larger")
    ]


def test_a_second_pick_on_a_judged_round_is_rejected_and_not_logged(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="45", robo="8", comparison="shorter_larger")
    round_id = client.post("/curriculum/decimal-war/rounds", params={"session_id": "s1"}).json()["round_id"]
    client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "robo"}})

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "mine"}})

    assert response.status_code == 422
    assert len(db.get_move_history("s1", "decimal-war")) == 1


def test_same_at_level_one_is_rejected_and_not_logged(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="3", robo="4", comparison="same_length")
    round_id = client.post("/curriculum/decimal-war/rounds", params={"session_id": "s1"}).json()["round_id"]

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "same"}})

    assert response.status_code == 422
    assert db.get_move_history("s1", "decimal-war") == []


def _new_decimal_war_round() -> str:
    return client.post("/curriculum/decimal-war/rounds", params={"session_id": "s1"}).json()["round_id"]


def test_a_round_hint_before_the_round_is_judged_is_rejected(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="45", robo="8", comparison="shorter_larger")

    response = client.post(f"/rounds/{_new_decimal_war_round()}/hint")

    assert response.status_code == 422


def test_a_round_hint_for_an_unknown_round_is_404(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="45", robo="8", comparison="shorter_larger")

    response = client.post(f"/rounds/{'0' * 32}/hint")

    assert response.status_code == 404


def test_a_diagnosed_wrong_pick_gets_the_games_hint_sentence(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="45", robo="8", comparison="shorter_larger")
    game = main.CURRICULUM_GAMES["decimal-war"]
    monkeypatch.setattr(game, "hint_sentence", lambda round, name: f"hint for {name} on 0.{round.mine}")
    round_id = _new_decimal_war_round()
    client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "mine"}})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": "longer_is_larger", "hint": "hint for longer_is_larger on 0.45"}


def test_a_correct_pick_gets_no_round_hint(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="45", robo="8", comparison="shorter_larger")
    monkeypatch.setattr(main.CURRICULUM_GAMES["decimal-war"], "hint_sentence", _fail_if_called)
    round_id = _new_decimal_war_round()
    client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "robo"}})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": None, "hint": None}


def test_an_undiagnosed_wrong_pick_gets_the_general_hint(tmp_path, monkeypatch):
    _decimal_war_dealing(
        tmp_path, monkeypatch, mine="45", robo="405", comparison="interspersed_zero", round_level=3
    )
    game = main.CURRICULUM_GAMES["decimal-war"]
    monkeypatch.setattr(game, "hint_sentence", _fail_if_called)
    round_id = _new_decimal_war_round()
    client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "same"}})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": None, "hint": game.GENERAL_HINT}


def test_a_move_the_game_does_not_count_is_applied_but_not_logged(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)
    monkeypatch.setattr(
        PICK_GAME,
        "evaluate_move",
        lambda round, move: MoveResult(correct=True, misconception=None, round=round, counted=False),
    )
    round_id = client.post("/curriculum/pick/rounds", params={"session_id": "s1"}).json()["round_id"]

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": 8}})

    assert response.status_code == 200
    assert response.json()["visible_state"]["computer_turns"] == 1
    assert db.get_round(round_id).state["computer_turns"] == 1
    assert db.get_move_history("s1", "pick") == []


def _for_keeps_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal For Keeps hands of 7 3 5 8 to both players; rewording returns the sentence."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["for-keeps"]
    hands = [Hand(my_cards=[7, 3, 5, 8], robo_cards=[7, 3, 5, 8]) for _ in range(4)]
    monkeypatch.setattr(game, "new_round", lambda level: ForKeepsRound(level=level, hands=hands))
    monkeypatch.setattr(for_keeps_hints, "reword_hint", lambda sentence, *args: sentence)
    return client.post("/curriculum/for-keeps/rounds", params={"session_id": "s1"}).json()["round_id"]


def _for_keeps_move(round_id, move):
    return client.post(f"/rounds/{round_id}/moves", json={"move": move})


def test_a_for_keeps_hand_is_played_and_only_the_difference_is_logged(tmp_path, monkeypatch):
    round_id = _for_keeps_dealing(tmp_path, monkeypatch)

    arranged = _for_keeps_move(round_id, {"type": "arrange", "cards": [7, 3, 5, 8]})
    answered = _for_keeps_move(round_id, {"type": "difference", "answer": 25})
    kept = _for_keeps_move(round_id, {"type": "keep", "keep": True})

    assert arranged.json()["visible_state"]["step"] == "difference"
    assert answered.json()["misconception"] == "smaller_from_larger"
    assert answered.json()["visible_state"]["hands"][0]["difference"] == 15
    state = kept.json()["visible_state"]
    assert (state["hand_number"], state["step"], state["my_total"]) == (2, "arrange", 15)
    assert (state["hands"][0]["robo_numbers"], state["hands"][0]["robo_kept"]) == ([73, 58], True)
    assert db.get_move_history("s1", "for-keeps") == [
        TierAttempt(difficulty=1, correct=False, misconception="smaller_from_larger")
    ]


def test_a_for_keeps_arrangement_with_other_cards_is_rejected_and_not_logged(tmp_path, monkeypatch):
    round_id = _for_keeps_dealing(tmp_path, monkeypatch)

    response = _for_keeps_move(round_id, {"type": "arrange", "cards": [7, 3, 5, 9]})

    assert response.status_code == 422
    assert db.get_round(round_id).state["step"] == "arrange"
    assert db.get_move_history("s1", "for-keeps") == []


def test_a_for_keeps_hint_before_any_difference_is_rejected(tmp_path, monkeypatch):
    round_id = _for_keeps_dealing(tmp_path, monkeypatch)
    _for_keeps_move(round_id, {"type": "arrange", "cards": [7, 3, 5, 8]})

    assert client.post(f"/rounds/{round_id}/hint").status_code == 422


def test_a_for_keeps_hint_describes_the_last_difference_after_the_hand_moves_on(tmp_path, monkeypatch):
    round_id = _for_keeps_dealing(tmp_path, monkeypatch)
    _for_keeps_move(round_id, {"type": "arrange", "cards": [7, 3, 5, 8]})
    _for_keeps_move(round_id, {"type": "difference", "answer": 25})
    _for_keeps_move(round_id, {"type": "keep", "keep": True})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {
        "misconception": "smaller_from_larger",
        "hint": "In the ones column, 3 is smaller than 8, so you can't subtract yet: borrow from the tens column.",
    }


def test_an_undiagnosed_for_keeps_difference_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _for_keeps_dealing(tmp_path, monkeypatch)
    _for_keeps_move(round_id, {"type": "arrange", "cards": [7, 3, 5, 8]})
    _for_keeps_move(round_id, {"type": "difference", "answer": 99})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": None, "hint": for_keeps_hints.GENERAL_HINT}
