import json
import sqlite3
from contextlib import closing
from pathlib import Path

from tiering import TierAttempt

DB_PATH = Path(__file__).resolve().parent / "attempts.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def init_db() -> None:
    with closing(_connect()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
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
        conn.commit()


def log_attempt(
    session_id: str,
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
                (session_id, game, difficulty, problem_data, submitted_answer, correct, misconception)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                game,
                difficulty,
                json.dumps(problem_data),
                submitted_answer,
                int(correct),
                misconception,
            ),
        )
        conn.commit()


def get_tier_history(session_id: str, game: str) -> list[TierAttempt]:
    """Return this session's attempts at this game, oldest first."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            """
            SELECT difficulty, correct, misconception
            FROM attempts
            WHERE session_id = ? AND game = ?
            ORDER BY id ASC
            """,
            (session_id, game),
        ).fetchall()

    return [
        TierAttempt(difficulty=difficulty, correct=bool(correct), misconception=misconception)
        for difficulty, correct, misconception in rows
    ]


def get_summary(session_id: str) -> tuple[int, int, list[tuple[str, str, int]]]:
    """Return (total_attempts, correct_count, [(game, misconception, count)]) for a session.

    Misconceptions are counted per game, since different games reuse names like `no_carry`.
    """
    with closing(_connect()) as conn:
        total_attempts, correct_count = conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(correct), 0) FROM attempts WHERE session_id = ?",
            (session_id,),
        ).fetchone()

        rows = conn.execute(
            """
            SELECT game, misconception, COUNT(*)
            FROM attempts
            WHERE session_id = ? AND misconception IS NOT NULL
            GROUP BY game, misconception
            ORDER BY game, misconception
            """,
            (session_id,),
        ).fetchall()

    return total_attempts, correct_count, rows
