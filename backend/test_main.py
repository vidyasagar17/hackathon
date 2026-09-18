from types import SimpleNamespace

from fastapi.testclient import TestClient
from pydantic import BaseModel

import db
import main
from curriculum.card_war.rounds import Round as CardWarRound
from curriculum.engine import MoveResult
from curriculum.four_in_a_row import hints as four_in_a_row_hints
from curriculum.four_in_a_row.rounds import Round as FourInARowRound
from curriculum.for_keeps import hints as for_keeps_hints
from curriculum.for_keeps.rounds import Hand, Round as ForKeepsRound
from curriculum.fraction_spoons import hints as fraction_spoons_hints
from curriculum.fraction_spoons.misconceptions import Card as SpoonsCard
from curriculum.fraction_spoons.rounds import Hand as SpoonsHand, Round as SpoonsRound
from curriculum.clock_match import hints as clock_hints
from curriculum.clock_match.rounds import Round as ClockRound
from curriculum.coordinate_battleship import hints as battleship_hints
from curriculum.cover_the_number import hints as cover_hints
from curriculum.cover_the_number.rounds import Roll as CoverRoll, Round as CoverRound
from curriculum.coordinate_battleship.rounds import Round as BattleshipRound
from curriculum.dont_break_the_bank import hints as bank_hints
from curriculum.dont_break_the_bank.rounds import Round as BankRound
from curriculum.shut_the_box import hints as shut_the_box_hints
from curriculum.shut_the_box.rounds import Round as ShutTheBoxRound
from curriculum.target_number import hints as target_hints
from curriculum.target_number.misconceptions import Equation as TargetEquation
from curriculum.target_number.rounds import Round as TargetRound
from curriculum.twenty_four import hints as twenty_four_hints
from curriculum.twenty_four.rounds import Round as TwentyFourRound
from curriculum.volume_builder import hints as volume_hints
from curriculum.volume_builder.rounds import Round as VolumeRound
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

    response = client.post("/curriculum/pick/rounds", params={"session_id": "s1", "learner_id": "L1"})

    body = response.json()
    assert body["visible_state"] == {"a": 3, "b": 8, "computer_turns": 0}
    assert body["progress"] == {"level": 1, "correct_in_a_row": 0, "needed": 3, "top_level": 3}
    assert db.get_round(body["round_id"]).state["secret"] == "hidden"


def test_new_round_for_an_unknown_curriculum_game_is_404(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)

    response = client.post("/curriculum/no-such-game/rounds", params={"session_id": "s1", "learner_id": "L1"})

    assert response.status_code == 404


def test_a_move_is_evaluated_logged_and_answered_by_the_computer(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)
    round_id = client.post("/curriculum/pick/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": 3}})

    assert response.json() == {
        "correct": False,
        "misconception": "picked_smaller",
        "visible_state": {"a": 3, "b": 8, "computer_turns": 1},
    }
    assert db.get_move_history("L1", "pick") == [
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
        round_id = client.post("/curriculum/pick/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]
        client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": 8}})

    response = client.post("/curriculum/pick/rounds", params={"session_id": "s1", "learner_id": "L1"})

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
        json={"session_id": "s1", "learner_id": "L1", "problem": _problem_data(), "submitted_answer": 616},
    )

    assert response.json() == {"correct": False, "misconception": "smaller_from_larger"}


def test_check_rejects_a_tampered_answer_without_logging_it(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    tampered = {**_problem_data(), "answer": 616}

    response = client.post(
        "/games/subtraction/check",
        json={"session_id": "s1", "learner_id": "L1", "problem": tampered, "submitted_answer": 616},
    )

    assert response.status_code == 422
    assert db.get_summary("s1") == (0, 0, [])


def test_summary_gives_each_game_its_own_score(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    db.log_attempt("s1", "L1", "subtraction", 1, {}, 0, False, "always_borrow")
    db.log_attempt("s1", "L1", "subtraction", 1, {}, 5, True, None)

    response = client.get("/summary/s1")

    assert response.json() == {
        "total_attempts": 2,
        "correct_count": 1,
        "misconceptions": [{"game": "subtraction", "name": "always_borrow", "count": 1}],
        "games": [{"game": "subtraction", "total_attempts": 2, "correct_count": 1}],
    }


def test_problem_includes_progress_toward_the_next_level(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    for _ in range(2):
        db.log_attempt("s1", "L1", "subtraction", 1, {}, 0, True, None)

    response = client.get("/games/subtraction/problem", params={"session_id": "s1", "learner_id": "L1"})

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
    round_id = client.post("/curriculum/decimal-war/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]

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
    assert db.get_move_history("L1", "decimal-war") == [
        TierAttempt(difficulty=1, correct=False, misconception="longer_is_larger")
    ]


def test_a_second_pick_on_a_judged_round_is_rejected_and_not_logged(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="45", robo="8", comparison="shorter_larger")
    round_id = client.post("/curriculum/decimal-war/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]
    client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "robo"}})

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "mine"}})

    assert response.status_code == 422
    assert len(db.get_move_history("L1", "decimal-war")) == 1


def test_same_at_level_one_is_rejected_and_not_logged(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="3", robo="4", comparison="same_length")
    round_id = client.post("/curriculum/decimal-war/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "same"}})

    assert response.status_code == 422
    assert db.get_move_history("L1", "decimal-war") == []


def _new_decimal_war_round() -> str:
    return client.post("/curriculum/decimal-war/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]


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

    assert response.json() == {"misconception": "longer_is_larger", "hint": "hint for longer_is_larger on 0.45", "cards": None}


def test_a_correct_pick_gets_no_round_hint(tmp_path, monkeypatch):
    _decimal_war_dealing(tmp_path, monkeypatch, mine="45", robo="8", comparison="shorter_larger")
    monkeypatch.setattr(main.CURRICULUM_GAMES["decimal-war"], "hint_sentence", _fail_if_called)
    round_id = _new_decimal_war_round()
    client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "robo"}})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": None, "hint": None, "cards": None}


def test_an_undiagnosed_wrong_pick_gets_the_general_hint(tmp_path, monkeypatch):
    _decimal_war_dealing(
        tmp_path, monkeypatch, mine="45", robo="405", comparison="interspersed_zero", round_level=3
    )
    game = main.CURRICULUM_GAMES["decimal-war"]
    monkeypatch.setattr(game, "hint_sentence", _fail_if_called)
    round_id = _new_decimal_war_round()
    client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": "same"}})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": None, "hint": game.GENERAL_HINT, "cards": None}


def test_a_move_the_game_does_not_count_is_applied_but_not_logged(tmp_path, monkeypatch):
    _with_pick_game(tmp_path, monkeypatch)
    monkeypatch.setattr(
        PICK_GAME,
        "evaluate_move",
        lambda round, move: MoveResult(correct=True, misconception=None, round=round, counted=False),
    )
    round_id = client.post("/curriculum/pick/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"pick": 8}})

    assert response.status_code == 200
    assert response.json()["visible_state"]["computer_turns"] == 1
    assert db.get_round(round_id).state["computer_turns"] == 1
    assert db.get_move_history("L1", "pick") == []


def _for_keeps_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal For Keeps hands of 7 3 5 8 to both players; rewording returns the sentence."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["for-keeps"]
    hands = [Hand(my_cards=[7, 3, 5, 8], robo_cards=[7, 3, 5, 8]) for _ in range(4)]
    monkeypatch.setattr(game, "new_round", lambda level: ForKeepsRound(level=level, hands=hands))
    monkeypatch.setattr(for_keeps_hints, "reword_hint", lambda sentence, *args: sentence)
    return client.post("/curriculum/for-keeps/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]


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
    assert db.get_move_history("L1", "for-keeps") == [
        TierAttempt(difficulty=1, correct=False, misconception="smaller_from_larger")
    ]


def test_a_for_keeps_arrangement_with_other_cards_is_rejected_and_not_logged(tmp_path, monkeypatch):
    round_id = _for_keeps_dealing(tmp_path, monkeypatch)

    response = _for_keeps_move(round_id, {"type": "arrange", "cards": [7, 3, 5, 9]})

    assert response.status_code == 422
    assert db.get_round(round_id).state["step"] == "arrange"
    assert db.get_move_history("L1", "for-keeps") == []


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
        "cards": None,
    }


def test_an_undiagnosed_for_keeps_difference_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _for_keeps_dealing(tmp_path, monkeypatch)
    _for_keeps_move(round_id, {"type": "arrange", "cards": [7, 3, 5, 8]})
    _for_keeps_move(round_id, {"type": "difference", "answer": 99})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": None, "hint": for_keeps_hints.GENERAL_HINT, "cards": None}


def _shootout_dealing(tmp_path, monkeypatch):
    """Use a temp database and make Multiplication Shootout deal 6 x 7 to the student and 3 x 4 to Robo."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["multiplication-shootout"]
    monkeypatch.setattr(
        game,
        "new_round",
        lambda level: game.Round(
            level=level,
            fact={"operation": "multiply", "left": 6, "right": 7},
            robo_fact={"operation": "multiply", "left": 3, "right": 4},
        ),
    )


def _new_shootout_round() -> dict:
    return client.post("/curriculum/multiplication-shootout/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def test_a_shootout_turn_is_played_through_the_move_routes(tmp_path, monkeypatch):
    _shootout_dealing(tmp_path, monkeypatch)
    new_round = _new_shootout_round()
    assert new_round["visible_state"]["robo_fact"] is None

    response = client.post(f"/rounds/{new_round['round_id']}/moves", json={"move": {"answer": 48}})

    assert response.json() == {
        "correct": False,
        "misconception": "neighboring_fact",
        "visible_state": {
            "level": 1,
            "fact": {"operation": "multiply", "left": 6, "right": 7},
            "answer": 48,
            "correct_answer": 42,
            "robo_fact": {"operation": "multiply", "left": 3, "right": 4},
            "robo_answer": 12,
            "robo_correct_answer": 12,
        },
    }
    assert db.get_move_history("L1", "multiplication-shootout") == [
        TierAttempt(difficulty=1, correct=False, misconception="neighboring_fact")
    ]


def test_a_second_answer_to_a_shootout_fact_is_rejected_and_not_logged(tmp_path, monkeypatch):
    _shootout_dealing(tmp_path, monkeypatch)
    round_id = _new_shootout_round()["round_id"]
    client.post(f"/rounds/{round_id}/moves", json={"move": {"answer": 42}})

    response = client.post(f"/rounds/{round_id}/moves", json={"move": {"answer": 42}})

    assert response.status_code == 422
    assert len(db.get_move_history("L1", "multiplication-shootout")) == 1


def test_a_shootout_answer_that_is_not_a_whole_number_to_100_is_rejected_and_not_logged(tmp_path, monkeypatch):
    _shootout_dealing(tmp_path, monkeypatch)
    round_id = _new_shootout_round()["round_id"]

    for answer in ["42", 101]:
        response = client.post(f"/rounds/{round_id}/moves", json={"move": {"answer": answer}})
        assert response.status_code == 422

    assert db.get_move_history("L1", "multiplication-shootout") == []


def test_a_diagnosed_wrong_shootout_answer_gets_the_games_hint_sentence(tmp_path, monkeypatch):
    _shootout_dealing(tmp_path, monkeypatch)
    game = main.CURRICULUM_GAMES["multiplication-shootout"]
    monkeypatch.setattr(game, "hint_sentence", lambda round, name: f"hint for {name} on {round.answer}")
    round_id = _new_shootout_round()["round_id"]
    client.post(f"/rounds/{round_id}/moves", json={"move": {"answer": 48}})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": "neighboring_fact", "hint": "hint for neighboring_fact on 48", "cards": None}


def test_an_undiagnosed_wrong_shootout_answer_gets_the_general_hint(tmp_path, monkeypatch):
    _shootout_dealing(tmp_path, monkeypatch)
    game = main.CURRICULUM_GAMES["multiplication-shootout"]
    monkeypatch.setattr(game, "hint_sentence", _fail_if_called)
    round_id = _new_shootout_round()["round_id"]
    client.post(f"/rounds/{round_id}/moves", json={"move": {"answer": 43}})

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {"misconception": None, "hint": game.GENERAL_HINT, "cards": None}


def _card_war_dealing(tmp_path, monkeypatch, game_id, operation, mine, robo):
    """Use a temp database and deal a fixed hand in Addition War or Take-Away War; returns the round id."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES[game_id]
    monkeypatch.setattr(
        game, "new_round", lambda level: CardWarRound(operation=operation, level=level, mine=mine, robo=robo)
    )
    return client.post(f"/curriculum/{game_id}/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]


def _card_war_move(round_id, move_type, pick):
    return client.post(f"/rounds/{round_id}/moves", json={"move": {"type": move_type, "pick": pick}})


def test_an_addition_war_hand_logs_the_answer_but_not_the_winner_pick(tmp_path, monkeypatch):
    round_id = _card_war_dealing(tmp_path, monkeypatch, "addition-war", "add", (3, 4), (5, 1))

    answered = _card_war_move(round_id, "answer", 6)
    judged = _card_war_move(round_id, "winner", "robo")

    assert (answered.json()["correct"], answered.json()["misconception"]) == (False, "counted_on_from_start")
    assert answered.json()["visible_state"]["choices"] == [1, 5, 6, 7]
    assert (judged.json()["correct"], judged.json()["visible_state"]["winner"]) == (False, "mine")
    assert db.get_move_history("L1", "addition-war") == [
        TierAttempt(difficulty=1, correct=False, misconception="counted_on_from_start")
    ]
    assert db.get_move_history("L1", "take-away-war") == []


def test_an_addition_war_answer_that_is_not_a_card_is_rejected_and_not_logged(tmp_path, monkeypatch):
    round_id = _card_war_dealing(tmp_path, monkeypatch, "addition-war", "add", (3, 4), (5, 1))

    assert _card_war_move(round_id, "answer", 9).status_code == 422
    assert db.get_move_history("L1", "addition-war") == []


def test_an_addition_war_hint_counts_on_from_the_students_cards(tmp_path, monkeypatch):
    round_id = _card_war_dealing(tmp_path, monkeypatch, "addition-war", "add", (3, 4), (5, 1))
    _card_war_move(round_id, "answer", 6)

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {
        "misconception": "counted_on_from_start",
        "hint": "When you count on from 4, the first number you say is 5: 5, 6, 7.",
        "cards": None,
    }


def test_an_addition_war_filler_answer_gets_the_addition_general_hint(tmp_path, monkeypatch):
    round_id = _card_war_dealing(tmp_path, monkeypatch, "addition-war", "add", (4, 3), (5, 1))
    _card_war_move(round_id, "answer", 8)

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {
        "misconception": None,
        "hint": "Start at the bigger card and count on the smaller card's number.",
        "cards": None,
    }


def test_take_away_war_hints_use_its_own_sentences_and_general_hint(tmp_path, monkeypatch):
    added = _card_war_dealing(tmp_path, monkeypatch, "take-away-war", "take_away", (3, 8), (9, 2))
    _card_war_move(added, "answer", 11)
    filler = _card_war_dealing(tmp_path, monkeypatch, "take-away-war", "take_away", (5, 5), (9, 2))
    _card_war_move(filler, "answer", 2)

    assert client.post(f"/rounds/{added}/hint").json() == {
        "misconception": "added_instead",
        "hint": "Take the smaller card away from the bigger one: 8 take away 3 is 5.",
        "cards": None,
    }
    assert client.post(f"/rounds/{filler}/hint").json() == {
        "misconception": None,
        "hint": "Start at the bigger card and count back the smaller card's number.",
        "cards": None,
    }


def _spoons_cards(*texts: str) -> list[SpoonsCard]:
    return [SpoonsCard(top=int(text.split("/")[0]), bottom=int(text.split("/")[1])) for text in texts]


def _fraction_spoons_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal a fixed hand: the student holds 1/2 2/4 3/6 1/3 and draws 2/3, Robo holds
    1/3 2/6 3/9 1/4 and draws 1/2."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["fraction-spoons"]
    hand = SpoonsHand(
        sets=_spoons_cards("1/2", "1/3", "1/4"),
        my_cards=_spoons_cards("1/2", "2/4", "3/6", "1/3"),
        robo_cards=_spoons_cards("1/3", "2/6", "3/9", "1/4"),
        pile=_spoons_cards("2/3", "1/2", "4/8"),
    )
    monkeypatch.setattr(game, "new_round", lambda level: SpoonsRound(level=level, hands=[hand] * 5, seed=7))
    return client.post("/curriculum/fraction-spoons/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]


def _spoons_move(round_id, move):
    return client.post(f"/rounds/{round_id}/moves", json={"move": move})


def _play_a_wrong_fit_turn(round_id):
    """Collect 1/2, draw 2/3, say it fits, discard it, hand the turn to Robo; returns every response."""
    moves = [
        {"type": "collect", "card": 0},
        {"type": "draw"},
        {"type": "fit", "fits": True},
        {"type": "discard", "card": 4},
        {"type": "robo_turn"},
    ]
    return [_spoons_move(round_id, move) for move in moves]


def test_a_fraction_spoons_turn_is_played_through_the_routes_and_only_the_fit_tap_is_logged(tmp_path, monkeypatch):
    round_id = _fraction_spoons_dealing(tmp_path, monkeypatch)

    _, drawn, fitted, _, robo = _play_a_wrong_fit_turn(round_id)

    assert drawn.json()["visible_state"]["drawn"] == {"top": 2, "bottom": 3}
    assert (fitted.json()["correct"], fitted.json()["misconception"]) == (False, "same_difference_means_equal")
    state = robo.json()["visible_state"]
    assert (state["step"], state["robo_discard"], state["trash_top"]) == (
        "draw",
        {"top": 1, "bottom": 2},
        {"top": 1, "bottom": 2},
    )
    assert "robo_cards" not in state and "pile" not in state
    assert db.get_move_history("L1", "fraction-spoons") == [
        TierAttempt(difficulty=1, correct=False, misconception="same_difference_means_equal")
    ]


def test_a_fraction_spoons_move_at_the_wrong_step_is_rejected_and_not_logged(tmp_path, monkeypatch):
    round_id = _fraction_spoons_dealing(tmp_path, monkeypatch)

    response = _spoons_move(round_id, {"type": "fit", "fits": True})

    assert response.status_code == 422
    assert db.get_round(round_id).state["step"] == "collect"
    assert db.get_move_history("L1", "fraction-spoons") == []


def test_a_fraction_spoons_hint_describes_the_wrong_fit_tap_after_discarding_and_robos_turn(tmp_path, monkeypatch):
    round_id = _fraction_spoons_dealing(tmp_path, monkeypatch)
    _play_a_wrong_fit_turn(round_id)

    response = client.post(f"/rounds/{round_id}/hint")

    assert response.json() == {
        "misconception": "same_difference_means_equal",
        "hint": "1/2 is 1/2 short of 1, and 2/3 is 1/3 short of 1. 1/3 is smaller than 1/2, so 2/3 is bigger than 1/2.",
        "cards": [{"top": 1, "bottom": 2}, {"top": 2, "bottom": 3}],
    }


def test_an_undiagnosed_wrong_fraction_spoons_fit_tap_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _fraction_spoons_dealing(tmp_path, monkeypatch)
    _spoons_move(round_id, {"type": "collect", "card": 1})
    _spoons_move(round_id, {"type": "draw"})

    fitted = _spoons_move(round_id, {"type": "fit", "fits": True})

    assert (fitted.json()["correct"], fitted.json()["misconception"]) == (False, None)
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": fraction_spoons_hints.GENERAL_HINT,
        "cards": None,
    }


def test_a_wrong_fraction_spoons_claim_hint_carries_the_collecting_card_and_the_odd_card(tmp_path, monkeypatch):
    round_id = _fraction_spoons_dealing(tmp_path, monkeypatch)
    moves = [
        {"type": "collect", "card": 0},
        {"type": "draw"},
        {"type": "fit", "fits": False},
        {"type": "discard", "card": 3},
    ]
    for move in moves:
        _spoons_move(round_id, move)

    claimed = _spoons_move(round_id, {"type": "claim"})

    assert (claimed.json()["correct"], claimed.json()["misconception"]) == (False, "same_difference_means_equal")
    assert client.post(f"/rounds/{round_id}/hint").json()["cards"] == [{"top": 1, "bottom": 2}, {"top": 2, "bottom": 3}]


def _twenty_four_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal the student 3, 5, 3, 1 and Robo 1, 2, 7, 7 at the session's level."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["the-24-game"]
    monkeypatch.setattr(
        game, "new_round", lambda level: TwentyFourRound(level=level, cards=[3, 5, 3, 1], robo_cards=[1, 2, 7, 7])
    )
    return client.post("/curriculum/the-24-game/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def _twenty_four_check(round_id, *tokens):
    return client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "check", "tokens": list(tokens)}})


def test_a_24_game_hand_is_checked_diagnosed_hinted_and_then_robo_plays(tmp_path, monkeypatch):
    dealt = _twenty_four_dealing(tmp_path, monkeypatch)
    round_id = dealt["round_id"]
    assert dealt["visible_state"]["cards"] == [3, 5, 3, 1]
    assert dealt["visible_state"]["robo_cards"] is None

    wrong = _twenty_four_check(round_id, 0, "+", 1, "*", 2, "*", 3).json()
    assert (wrong["correct"], wrong["misconception"]) == (False, "left_to_right")
    assert wrong["visible_state"]["last_check"]["value"] == "18"
    assert wrong["visible_state"]["robo_cards"] is None
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": "left_to_right",
        "hint": (
            "In 3 + 5 × 3 × 1, × and ÷ come before + and −, so it makes 18. "
            "Parentheses show the order you used: (3 + 5) × 3 × 1 = 24."
        ),
        "cards": None,
    }

    right = _twenty_four_check(round_id, "(", 0, "+", 1, ")", "*", 2, "*", 3).json()
    assert right["correct"]
    state = right["visible_state"]
    assert state["done"] and state["robo_cards"] == [1, 2, 7, 7]
    assert state["robo_way"] is None
    assert db.get_move_history("L1", "the-24-game") == [
        TierAttempt(difficulty=1, correct=False, misconception="left_to_right"),
        TierAttempt(difficulty=1, correct=True, misconception=None),
    ]


def test_showing_a_24_game_way_is_not_logged_and_a_bad_check_is_rejected(tmp_path, monkeypatch):
    round_id = _twenty_four_dealing(tmp_path, monkeypatch)["round_id"]

    assert _twenty_four_check(round_id, 0, "+", 1).status_code == 422
    shown = client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "show_way"}}).json()

    assert shown["visible_state"]["shown_way"]["text"] == "(3 + 5) × 3 × 1"
    assert db.get_move_history("L1", "the-24-game") == []


def test_an_undiagnosed_wrong_24_game_check_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _twenty_four_dealing(tmp_path, monkeypatch)["round_id"]
    _twenty_four_check(round_id, 0, "+", 1, "+", 2, "+", 3)

    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": twenty_four_hints.GENERAL_HINT,
        "cards": None,
    }


def _shut_the_box_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal a level-rolled game: the student rolls 3 and 5, Robo rolls 2 and 6."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["shut-the-box"]
    monkeypatch.setattr(
        game,
        "new_round",
        lambda level: ShutTheBoxRound(
            level=level,
            my_rolls=[(3, 5)] * 6,
            robo_rolls=[(2, 6)] * 6,
            my_open=list(range(1, 10)),
            robo_open=list(range(1, 10)),
        ),
    )
    return client.post("/curriculum/shut-the-box/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()["round_id"]


def _shut_the_box_move(round_id, move):
    return client.post(f"/rounds/{round_id}/moves", json={"move": move}).json()


def test_a_shut_the_box_turn_logs_only_the_total_and_the_shut_and_each_gets_its_hint(tmp_path, monkeypatch):
    round_id = _shut_the_box_dealing(tmp_path, monkeypatch)

    assert _shut_the_box_move(round_id, {"type": "roll"})["visible_state"]["choices"] == [2, 6, 7, 8]
    total = _shut_the_box_move(round_id, {"type": "total", "pick": 7})
    assert (total["correct"], total["misconception"]) == (False, "counted_on_from_start")
    assert client.post(f"/rounds/{round_id}/hint").json()["hint"] == (
        "When you count on from 5, the first number you say is 6: 6, 7, 8."
    )

    shut = _shut_the_box_move(round_id, {"type": "shut", "tiles": [8, 2]})
    assert (shut["correct"], shut["misconception"]) == (False, "added_the_total_tile")
    assert shut["visible_state"]["shut_tiles"] == [8]
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": "added_the_total_tile",
        "hint": "The 8 tile is 8 all by itself. 8 and 2 make 10.",
        "cards": None,
    }

    robo = _shut_the_box_move(round_id, {"type": "robo_turn"})["visible_state"]
    # A new session plays at level 1, where Robo shuts the most tiles it can.
    assert robo["robo_last"] == {"dice": [2, 6], "shut": [1, 3, 4]}
    assert robo["step"] == "roll"
    assert db.get_move_history("L1", "shut-the-box") == [
        TierAttempt(difficulty=1, correct=False, misconception="counted_on_from_start"),
        TierAttempt(difficulty=1, correct=False, misconception="added_the_total_tile"),
    ]


def test_an_undiagnosed_wrong_shut_gets_the_shut_the_box_general_hint(tmp_path, monkeypatch):
    round_id = _shut_the_box_dealing(tmp_path, monkeypatch)
    _shut_the_box_move(round_id, {"type": "roll"})
    _shut_the_box_move(round_id, {"type": "total", "pick": 8})
    _shut_the_box_move(round_id, {"type": "shut", "tiles": [7]})

    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": shut_the_box_hints.GENERAL_HINT,
        "cards": None,
    }


def _bank_dealing(tmp_path, monkeypatch, rolls):
    """Use a temp database and deal a Don't Break the Bank game at the session's level with fixed rolls."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["dont-break-the-bank"]
    monkeypatch.setattr(
        game,
        "new_round",
        lambda level: BankRound(level=level, rolls=rolls, my_board=[None] * len(rolls), robo_board=[None] * len(rolls)),
    )
    monkeypatch.setattr(bank_hints, "reword_hint", lambda sentence, prompt, answer, banned: sentence)
    return client.post("/curriculum/dont-break-the-bank/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def _bank_move(round_id, move):
    return client.post(f"/rounds/{round_id}/moves", json={"move": move}).json()


def test_a_level_1_bank_game_logs_only_the_sum_and_distance_and_hints_each(tmp_path, monkeypatch):
    dealt = _bank_dealing(tmp_path, monkeypatch, [4, 6, 3, 8])
    round_id = dealt["round_id"]
    assert (dealt["visible_state"]["bank"], dealt["visible_state"]["roll"]) == (100, 4)

    for spot in range(4):
        placed = _bank_move(round_id, {"type": "place", "spot": spot})
    state = placed["visible_state"]
    assert (state["step"], state["my_numbers"]) == ("sum", [46, 38])
    assert None not in state["robo_board"]

    summed = _bank_move(round_id, {"type": "sum", "answer": 74})
    assert (summed["correct"], summed["misconception"]) == (False, "no_carry")
    assert client.post(f"/rounds/{round_id}/hint").json()["hint"] == (
        "In the ones column, 6 + 8 makes 14, so write 4 and carry 1 to the tens column."
    )

    distance = _bank_move(round_id, {"type": "distance", "answer": 116})
    assert (distance["correct"], distance["misconception"]) == (False, "borrow_across_zero_failure")
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": "borrow_across_zero_failure",
        "hint": (
            "A 0 has nothing to lend until it borrows from the column to its left: 100 is 9 tens and 10 ones, "
            "so 100 − 84 = 16. Or count up: 84 + 6 = 90, and 90 + 10 = 100."
        ),
        "cards": None,
    }

    over = _bank_move(round_id, {"type": "robo_turn"})["visible_state"]
    assert over["step"] == "over"
    assert over["robo_total"] == sum(over["robo_numbers"])
    assert db.get_move_history("L1", "dont-break-the-bank") == [
        TierAttempt(difficulty=1, correct=False, misconception="no_carry"),
        TierAttempt(difficulty=1, correct=False, misconception="borrow_across_zero_failure"),
    ]


def test_a_bank_sum_over_the_bank_skips_the_distance_and_a_wrong_step_is_rejected(tmp_path, monkeypatch):
    round_id = _bank_dealing(tmp_path, monkeypatch, [6, 6, 6, 6])["round_id"]
    assert client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "sum", "answer": 132}}).status_code == 422
    for spot in range(4):
        _bank_move(round_id, {"type": "place", "spot": spot})

    summed = _bank_move(round_id, {"type": "sum", "answer": 132})

    assert summed["correct"] and summed["visible_state"]["broke"] is True
    assert summed["visible_state"]["step"] == "pass"
    assert client.post(f"/rounds/{round_id}/hint").json() == {"misconception": None, "hint": None, "cards": None}


def test_an_undiagnosed_wrong_bank_sum_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _bank_dealing(tmp_path, monkeypatch, [4, 6, 3, 8])["round_id"]
    for spot in range(4):
        _bank_move(round_id, {"type": "place", "spot": spot})
    _bank_move(round_id, {"type": "sum", "answer": 85})

    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": bank_hints.GENERAL_HINT,
        "cards": None,
    }


def _battleship_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal fixed fleets: Robo's ships along y = 4 and up x = 0 on a level-1 game."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["coordinate-plane-battleship"]
    monkeypatch.setattr(
        game,
        "new_round",
        lambda level: BattleshipRound(
            level=level,
            seed=3,
            my_ships=[[(1, 1), (2, 1), (3, 1)], [(4, 3), (4, 4)]],
            robo_ships=[[(1, 4), (2, 4), (3, 4)], [(1, 1), (1, 2)]],
        ),
    )
    return client.post("/curriculum/coordinate-plane-battleship/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def _battleship_move(round_id, move):
    return client.post(f"/rounds/{round_id}/moves", json={"move": move}).json()


def test_a_battleship_turn_logs_the_written_and_read_pairs_and_hints_each(tmp_path, monkeypatch):
    dealt = _battleship_dealing(tmp_path, monkeypatch)
    round_id = dealt["round_id"]
    assert dealt["visible_state"]["robo_ocean"]["ships"] is None

    _battleship_move(round_id, {"type": "aim", "x": 2, "y": 4})
    written = _battleship_move(round_id, {"type": "write", "x": 4, "y": 2})
    assert (written["correct"], written["misconception"]) == (False, "swapped_x_and_y")
    assert written["visible_state"]["robo_ocean"]["shots"] == [{"x": 4, "y": 2, "hit": False}]
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": "swapped_x_and_y",
        "hint": "Across comes first, then up. Your aim is 2 across and 4 up, so it is (2, 4), not (4, 2).",
        "cards": None,
    }

    call = _battleship_move(round_id, {"type": "robo_turn"})["visible_state"]["robo_call"]
    tapped = (call[0] - 1, call[1] - 1) if min(call) >= 1 else tuple(call)
    read = _battleship_move(round_id, {"type": "read", "x": tapped[0], "y": tapped[1]})
    assert read["visible_state"]["my_ocean"]["shots"][0]["x"] == call[0]
    history = db.get_move_history("L1", "coordinate-plane-battleship")
    assert [attempt.misconception for attempt in history][0] == "swapped_x_and_y"
    assert len(history) == 2


def test_an_undiagnosed_wrong_battleship_pair_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _battleship_dealing(tmp_path, monkeypatch)["round_id"]
    _battleship_move(round_id, {"type": "aim", "x": 2, "y": 4})
    _battleship_move(round_id, {"type": "write", "x": 3, "y": 4})

    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": battleship_hints.GENERAL_HINT,
        "cards": None,
    }


def _volume_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal a level-1 turn: a 4 x 3 x 2 box for the student, 2 x 3 x 4 for Robo."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["volume-builder"]
    monkeypatch.setattr(game, "new_round", lambda level: VolumeRound(level=level, box=(4, 3, 2), robo_box=(2, 3, 4)))
    return client.post("/curriculum/volume-builder/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def _volume_move(round_id, move):
    return client.post(f"/rounds/{round_id}/moves", json={"move": move})


def test_a_volume_turn_logs_the_count_and_the_build_and_hints_each(tmp_path, monkeypatch):
    dealt = _volume_dealing(tmp_path, monkeypatch)
    round_id = dealt["round_id"]
    assert dealt["visible_state"]["box"] == [4, 3, 2] and dealt["visible_state"]["volume"] is None

    counted = _volume_move(round_id, {"type": "count", "answer": 18}).json()
    assert (counted["correct"], counted["misconception"]) == (False, "counted_visible_cubes")
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": "counted_visible_cubes",
        "hint": "18 is the cubes you can see. 6 more cubes are hidden behind and under them. "
        "The top layer has 4 × 3 = 12 cubes, and 2 layers make 2 × 12 = 24.",
        "cards": None,
    }

    built = _volume_move(round_id, {"type": "build", "box": [2, 2, 5]}).json()
    assert (built["correct"], built["misconception"]) == (False, "counted_visible_faces")
    assert built["visible_state"]["robo"] == {"box": [2, 3, 4], "layer": 6, "layers": 4, "volume": 24, "built": [2, 6, 2]}
    assert client.post(f"/rounds/{round_id}/hint").json()["hint"].startswith("24 is the squares you can see on your box's")

    history = db.get_move_history("L1", "volume-builder")
    assert [attempt.misconception for attempt in history] == ["counted_visible_cubes", "counted_visible_faces"]


def test_building_the_same_box_is_refused_and_not_logged(tmp_path, monkeypatch):
    round_id = _volume_dealing(tmp_path, monkeypatch)["round_id"]
    _volume_move(round_id, {"type": "count", "answer": 24})
    assert _volume_move(round_id, {"type": "build", "box": [2, 4, 3]}).status_code == 422
    assert len(db.get_move_history("L1", "volume-builder")) == 1


def test_an_undiagnosed_wrong_count_gets_the_general_volume_hint(tmp_path, monkeypatch):
    round_id = _volume_dealing(tmp_path, monkeypatch)["round_id"]
    _volume_move(round_id, {"type": "count", "answer": 25})
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": volume_hints.GENERAL_HINT,
        "cards": None,
    }


def _target_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal a fixed level-2 hand: cards 9 5 3 1 8 to 25; Robo 7 9 2 6 4; 1 + 24 = 2 + box."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["target-number"]
    monkeypatch.setattr(
        game,
        "new_round",
        lambda level: TargetRound(
            level=2,
            cards=[9, 5, 3, 1, 8],
            robo_cards=[7, 9, 2, 6, 4],
            target=25,
            equation=TargetEquation(left=[1, 24], right=2),
        ),
    )
    return client.post("/curriculum/target-number/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def _target_move(round_id, move):
    return client.post(f"/rounds/{round_id}/moves", json={"move": move})


def test_a_target_number_hand_logs_steps_and_the_equation_but_not_starting(tmp_path, monkeypatch):
    round_id = _target_dealing(tmp_path, monkeypatch)["round_id"]

    assert _target_move(round_id, {"type": "start", "card": 0}).status_code == 200
    wrong = _target_move(round_id, {"type": "step", "sign": "+", "card": 4, "answer": 7}).json()
    assert (wrong["correct"], wrong["misconception"]) == (False, "forgot_to_change_the_tens")
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": "forgot_to_change_the_tens",
        "hint": "9 + 8 makes 17 ones, which is 1 ten and 7 ones, so 9 + 8 = 17.",
        "cards": None,
    }
    made = _target_move(round_id, {"type": "step", "sign": "+", "card": 2, "answer": 20}).json()
    assert made["visible_state"]["total"] == 20

    shown = _target_move(round_id, {"type": "show_way"}).json()["visible_state"]
    assert shown["done"] and shown["robo"]["cards"] == [7, 9, 2, 6, 4]
    assert shown["equation"] == {"left": [1, 24], "right": 2}
    answered = _target_move(round_id, {"type": "equation", "answer": 25}).json()
    assert (answered["correct"], answered["misconception"]) == (False, "answer_to_equal_sign")
    assert client.post(f"/rounds/{round_id}/hint").json()["hint"].startswith("1 + 24 = 25 is only the left side.")

    history = db.get_move_history("L1", "target-number")
    assert [attempt.misconception for attempt in history] == ["forgot_to_change_the_tens", None, "answer_to_equal_sign"]


def test_a_target_number_step_past_the_top_is_refused_and_not_logged(tmp_path, monkeypatch):
    round_id = _target_dealing(tmp_path, monkeypatch)["round_id"]
    _target_move(round_id, {"type": "start", "card": 2})
    assert _target_move(round_id, {"type": "step", "sign": "-", "card": 0, "answer": 0}).status_code == 422
    assert db.get_move_history("L1", "target-number") == []


def test_an_undiagnosed_wrong_target_step_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _target_dealing(tmp_path, monkeypatch)["round_id"]
    _target_move(round_id, {"type": "start", "card": 0})
    _target_move(round_id, {"type": "step", "sign": "+", "card": 1, "answer": 30})
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": target_hints.GENERAL_HINT,
        "cards": None,
    }


def _four_in_a_row_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal a fixed level-2 board: 14 at 0-4, 41 at 5, 13 at 6, 11 elsewhere; fact 10 + 4."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["four-in-a-row"]
    cells = [14, 14, 14, 14, 14, 41, 13] + [11] * 18
    monkeypatch.setattr(
        game, "new_round", lambda level: FourInARowRound(level=2, seed=7, cells=cells, owners=[None] * 25, fact=(10, 4))
    )
    return client.post("/curriculum/four-in-a-row/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def test_a_four_in_a_row_turn_logs_the_tap_and_not_robos_turn(tmp_path, monkeypatch):
    round_id = _four_in_a_row_dealing(tmp_path, monkeypatch)["round_id"]

    tap = client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "tap", "cell": 5}}).json()
    assert (tap["correct"], tap["misconception"]) == (False, "reversed_teen_digits")
    assert tap["visible_state"]["right_cells"] == [0, 1, 2, 3, 4]
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": "reversed_teen_digits",
        "hint": "Fourteen is 1 ten and 4 ones, so the 1 comes first: 14.",
        "cards": None,
    }

    robo = client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "robo_turn"}}).json()["visible_state"]
    assert robo["robo_last"] is not None and robo["step"] == "tap"
    history = db.get_move_history("L1", "four-in-a-row")
    assert [attempt.misconception for attempt in history] == ["reversed_teen_digits"]


def test_a_four_in_a_row_tap_on_a_covered_space_is_refused_and_not_logged(tmp_path, monkeypatch):
    round_id = _four_in_a_row_dealing(tmp_path, monkeypatch)["round_id"]
    client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "tap", "cell": 0}})
    client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "robo_turn"}})
    assert client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "tap", "cell": 0}}).status_code == 422
    assert len(db.get_move_history("L1", "four-in-a-row")) == 1


def test_an_undiagnosed_four_in_a_row_tap_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _four_in_a_row_dealing(tmp_path, monkeypatch)["round_id"]
    client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "tap", "cell": 10}})
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": four_in_a_row_hints.GENERAL_HINT,
        "cards": None,
    }


def _cover_dealing(tmp_path, monkeypatch):
    """Use a temp database and deal a level-1 game: the student rolls 4 every time, Robo rolls 2."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["cover-the-number"]
    monkeypatch.setattr(
        game,
        "new_round",
        lambda level: CoverRound(level=1, my_rolls=[CoverRoll(values=[4])] * 30, robo_rolls=[CoverRoll(values=[2])] * 30),
    )
    return client.post("/curriculum/cover-the-number/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def _cover_move(round_id, move):
    return client.post(f"/rounds/{round_id}/moves", json={"move": move})


def test_a_cover_the_number_turn_logs_only_the_tap(tmp_path, monkeypatch):
    round_id = _cover_dealing(tmp_path, monkeypatch)["round_id"]

    _cover_move(round_id, {"type": "roll"})
    tap = _cover_move(round_id, {"type": "tap", "number": 5}).json()
    assert (tap["correct"], tap["misconception"]) == (False, "counted_one_too_many")
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": "counted_one_too_many",
        "hint": "Say one number for each dot, and each dot only once: 1, 2, 3, 4. That's 4.",
        "cards": None,
    }
    robo = _cover_move(round_id, {"type": "robo_turn"}).json()["visible_state"]
    assert robo["robo_covered"] == [2] and robo["turn"] == 2
    assert [attempt.misconception for attempt in db.get_move_history("L1", "cover-the-number")] == ["counted_one_too_many"]


def test_a_cover_the_number_tap_off_the_board_is_refused_and_not_logged(tmp_path, monkeypatch):
    round_id = _cover_dealing(tmp_path, monkeypatch)["round_id"]
    _cover_move(round_id, {"type": "roll"})
    assert _cover_move(round_id, {"type": "tap", "number": 9}).status_code == 422
    assert db.get_move_history("L1", "cover-the-number") == []


def test_an_undiagnosed_cover_the_number_tap_gets_the_general_hint(tmp_path, monkeypatch):
    round_id = _cover_dealing(tmp_path, monkeypatch)["round_id"]
    _cover_move(round_id, {"type": "roll"})
    _cover_move(round_id, {"type": "tap", "number": 1})
    assert client.post(f"/rounds/{round_id}/hint").json() == {
        "misconception": None,
        "hint": cover_hints.GENERAL_HINT,
        "cards": None,
    }


def _clock_dealing(tmp_path, monkeypatch, kind="read"):
    """Use a temp database and deal a level-3 card: 2:50 to read (or set); Robo's card 7:45, known."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "attempts.db")
    db.init_db()
    game = main.CURRICULUM_GAMES["clock-match"]
    monkeypatch.setattr(
        game,
        "new_round",
        lambda level: ClockRound(level=3, kind=kind, time=(2, 50), robo_kind="set", robo_time=(7, 45), robo_knows=True),
    )
    return client.post("/curriculum/clock-match/rounds", params={"session_id": "s1", "learner_id": "L1"}).json()


def test_a_clock_match_reading_is_logged_diagnosed_and_hinted(tmp_path, monkeypatch):
    dealt = _clock_dealing(tmp_path, monkeypatch)
    round_id = dealt["round_id"]
    assert dealt["visible_state"]["time"] is None
    choice = dealt["visible_state"]["choices"].index([3, 50])

    picked = client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "pick", "choice": choice}}).json()
    assert (picked["correct"], picked["misconception"]) == (False, "read_the_next_hour")
    assert picked["visible_state"]["robo"]["time"] == [7, 45]
    assert client.post(f"/rounds/{round_id}/hint").json()["hint"].startswith("The minute hand on the 10 means 50 minutes")
    assert [attempt.misconception for attempt in db.get_move_history("L1", "clock-match")] == ["read_the_next_hour"]


def test_a_second_clock_match_pick_is_refused_and_not_logged(tmp_path, monkeypatch):
    round_id = _clock_dealing(tmp_path, monkeypatch, kind="set")["round_id"]
    client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "pick", "choice": 0}})
    assert client.post(f"/rounds/{round_id}/moves", json={"move": {"type": "pick", "choice": 1}}).status_code == 422
    assert len(db.get_move_history("L1", "clock-match")) == 1


def test_an_undiagnosed_clock_match_pick_gets_the_general_hint(tmp_path, monkeypatch):
    dealt = _clock_dealing(tmp_path, monkeypatch, kind="set")
    choice = dealt["visible_state"]["choices"].index([230, 50])
    client.post(f"/rounds/{dealt['round_id']}/moves", json={"move": {"type": "pick", "choice": choice}})
    assert client.post(f"/rounds/{dealt['round_id']}/hint").json() == {
        "misconception": None,
        "hint": clock_hints.GENERAL_HINT,
        "cards": None,
    }
