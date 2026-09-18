import json
import sqlite3
import uuid
from contextlib import closing
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from tiering import TierAttempt

DB_PATH = Path(__file__).resolve().parent / "attempts.db"


class StoredRound(BaseModel):
    session_id: str
    game: str
    level: int
    state: dict[str, Any]


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def _add_learner_id(conn: sqlite3.Connection, table: str) -> None:
    """Give an older table the learner_id column, backfilling its session_id as the learner."""
    columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if "learner_id" in columns:
        return
    conn.execute(f"ALTER TABLE {table} ADD COLUMN learner_id TEXT NOT NULL DEFAULT ''")
    conn.execute(f"UPDATE {table} SET learner_id = session_id WHERE learner_id = ''")


def init_db() -> None:
    with closing(_connect()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                learner_id TEXT NOT NULL DEFAULT '',
                game TEXT NOT NULL,
                difficulty INTEGER NOT NULL DEFAULT 1,
                problem_data TEXT NOT NULL,
                submitted_answer INTEGER NOT NULL,
                correct INTEGER NOT NULL,
                misconception TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rounds (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                learner_id TEXT NOT NULL DEFAULT '',
                game TEXT NOT NULL,
                level INTEGER NOT NULL,
                state TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS moves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                round_id TEXT NOT NULL REFERENCES rounds(id),
                move TEXT NOT NULL,
                correct INTEGER NOT NULL,
                misconception TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        _add_learner_id(conn, "attempts")
        _add_learner_id(conn, "rounds")
        conn.commit()


def log_attempt(
    session_id: str,
    learner_id: str,
    game: str,
    difficulty: int,
    problem_data: dict,
    submitted_answer: int,
    correct: bool,
    misconception: str | None,
) -> None:
    with closing(_connect()) as conn:
        conn.execute(
            """
            INSERT INTO attempts
                (session_id, learner_id, game, difficulty, problem_data, submitted_answer,
                 correct, misconception)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                learner_id,
                game,
                difficulty,
                json.dumps(problem_data),
                submitted_answer,
                int(correct),
                misconception,
            ),
        )
        conn.commit()


def get_tier_history(learner_id: str, game: str) -> list[TierAttempt]:
    """Return this learner's attempts at this game across sessions, oldest first.

    Scoped to the learner, not the session, so a student who comes back tomorrow
    resumes at the level they reached instead of starting again at level 1.
    """
    with closing(_connect()) as conn:
        rows = conn.execute(
            """
            SELECT difficulty, correct, misconception
            FROM attempts
            WHERE learner_id = ? AND game = ?
            ORDER BY id ASC
            """,
            (learner_id, game),
        ).fetchall()

    return [
        TierAttempt(difficulty=difficulty, correct=bool(correct), misconception=misconception)
        for difficulty, correct, misconception in rows
    ]


def save_round(
    session_id: str, learner_id: str, game: str, level: int, state: dict[str, Any]
) -> str:
    """Store a new curriculum-game round and return its id.

    Ids are random so a browser can't reach another student's round by guessing.
    """
    round_id = uuid.uuid4().hex
    with closing(_connect()) as conn:
        conn.execute(
            """
            INSERT INTO rounds (id, session_id, learner_id, game, level, state)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (round_id, session_id, learner_id, game, level, json.dumps(state)),
        )
        conn.commit()
    return round_id


def get_round(round_id: str) -> StoredRound | None:
    """Return the stored round, or None when no round has this id."""
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT session_id, game, level, state FROM rounds WHERE id = ?", (round_id,)
        ).fetchone()

    if row is None:
        return None
    session_id, game, level, state = row
    return StoredRound(session_id=session_id, game=game, level=level, state=json.loads(state))


def update_round(round_id: str, state: dict[str, Any]) -> None:
    """Replace a round's state after a move."""
    with closing(_connect()) as conn:
        conn.execute("UPDATE rounds SET state = ? WHERE id = ?", (json.dumps(state), round_id))
        conn.commit()


def log_move(round_id: str, move: dict[str, Any], correct: bool, misconception: str | None) -> None:
    """Log a student's move; its session, game and level come from the round."""
    with closing(_connect()) as conn:
        conn.execute(
            "INSERT INTO moves (round_id, move, correct, misconception) VALUES (?, ?, ?, ?)",
            (round_id, json.dumps(move), int(correct), misconception),
        )
        conn.commit()


def get_last_move(round_id: str) -> tuple[bool, str | None] | None:
    """Return (correct, misconception) logged for the round's latest move, or None before its first move."""
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT correct, misconception FROM moves WHERE round_id = ? ORDER BY id DESC LIMIT 1",
            (round_id,),
        ).fetchone()

    if row is None:
        return None
    correct, misconception = row
    return bool(correct), misconception


def get_move_history(learner_id: str, game: str) -> list[TierAttempt]:
    """Return this learner's moves in this curriculum game, oldest first, at each round's level.

    Scoped to the learner across sessions, like `get_tier_history`.
    """
    with closing(_connect()) as conn:
        rows = conn.execute(
            """
            SELECT rounds.level, moves.correct, moves.misconception
            FROM moves JOIN rounds ON rounds.id = moves.round_id
            WHERE rounds.learner_id = ? AND rounds.game = ?
            ORDER BY moves.id ASC
            """,
            (learner_id, game),
        ).fetchall()

    return [
        TierAttempt(difficulty=level, correct=bool(correct), misconception=misconception)
        for level, correct, misconception in rows
    ]


_SESSION_RESULTS = """
    SELECT game, correct, misconception FROM attempts WHERE session_id = :session_id
    UNION ALL
    SELECT rounds.game, moves.correct, moves.misconception
    FROM moves JOIN rounds ON rounds.id = moves.round_id
    WHERE rounds.session_id = :session_id
"""


def get_summary(session_id: str) -> tuple[int, int, list[tuple[str, str, int]]]:
    """Return (total, correct_count, [(game, misconception, count)]) for a session.

    Counts workshop attempts and curriculum-game moves together. Misconceptions are
    counted per game, since different games reuse names like `no_carry`.
    """
    params = {"session_id": session_id}
    with closing(_connect()) as conn:
        total_attempts, correct_count = conn.execute(
            f"SELECT COUNT(*), COALESCE(SUM(correct), 0) FROM ({_SESSION_RESULTS})", params
        ).fetchone()

        rows = conn.execute(
            f"""
            SELECT game, misconception, COUNT(*)
            FROM ({_SESSION_RESULTS})
            WHERE misconception IS NOT NULL
            GROUP BY game, misconception
            ORDER BY game, misconception
            """,
            params,
        ).fetchall()

    return total_attempts, correct_count, rows


_LEARNER_RESULTS = """
    SELECT game, difficulty AS level, correct, misconception, created_at
    FROM attempts WHERE learner_id = :learner_id
    UNION ALL
    SELECT rounds.game, rounds.level, moves.correct, moves.misconception, moves.created_at
    FROM moves JOIN rounds ON rounds.id = moves.round_id
    WHERE rounds.learner_id = :learner_id
"""


def get_learner_progress(learner_id: str) -> list[tuple[str, int, int, int, str]]:
    """Return [(game, total, correct_count, top_level_reached, last_played)] for a learner.

    One row per game the learner has ever played, across every session. Games never
    played are absent, which is how the home screen tells new games from started ones.
    """
    with closing(_connect()) as conn:
        return conn.execute(
            f"""
            SELECT game, COUNT(*), COALESCE(SUM(correct), 0), MAX(level), MAX(created_at)
            FROM ({_LEARNER_RESULTS})
            GROUP BY game
            ORDER BY game
            """,
            {"learner_id": learner_id},
        ).fetchall()


def get_learner_misconceptions(learner_id: str) -> list[tuple[str, str, int, str]]:
    """Return [(game, misconception, count, last_seen)] for a learner, most recent first.

    The recommendation engine reads this to name why it is sending a student somewhere.
    """
    with closing(_connect()) as conn:
        return conn.execute(
            f"""
            SELECT game, misconception, COUNT(*), MAX(created_at)
            FROM ({_LEARNER_RESULTS})
            WHERE misconception IS NOT NULL
            GROUP BY game, misconception
            ORDER BY MAX(created_at) DESC
            """,
            {"learner_id": learner_id},
        ).fetchall()


def get_game_scores(session_id: str) -> list[tuple[str, int, int]]:
    """Return [(game, total, correct_count)] for a session, one row per game played, by game id.

    Counts workshop attempts and curriculum-game moves together, like `get_summary`.
    """
    with closing(_connect()) as conn:
        return conn.execute(
            f"""
            SELECT game, COUNT(*), COALESCE(SUM(correct), 0)
            FROM ({_SESSION_RESULTS})
            GROUP BY game
            ORDER BY game
            """,
            {"session_id": session_id},
        ).fetchall()
