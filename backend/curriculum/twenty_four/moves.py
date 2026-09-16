"""The 24 Game's moves for the curriculum engine (contract in `curriculum/engine.py`).

The student builds an expression from their four cards and checks it (graded, as many times as they like)
until it makes 24 or they ask to be shown a way (not graded). Then Robo plays its own four cards in
`computer_move`, showing only a way it can find at the level.
"""

from typing import Any

from ..engine import MoveResult
from .expressions import RULE, expression_text, number_text, resolve, step_text, work_out
from .misconceptions import diagnose_check, makes_24
from .rounds import Round, Token, robo_way, ways

MAX_TOKENS = 31


def _shown(tokens: list[Token]) -> dict[str, Any]:
    """An expression as the page shows it: its text, the steps by the rule, and its value (None after ÷ 0)."""
    worked = work_out(tokens, RULE)
    return {
        "text": expression_text(tokens),
        "steps": [step_text(step) for step in worked.steps],
        "value": None if worked.value is None else number_text(worked.value),
    }


def done(round: Round) -> bool:
    """The student's part of the hand ends when they make 24 or are shown a way."""
    return round.made_24 or round.shown_way


def visible_state(round: Round) -> dict[str, Any]:
    """The student's cards and last check; the shown way once asked for; Robo's cards and way once it has played."""
    return {
        "level": round.level,
        "cards": round.cards,
        "checks": len(round.checks),
        "last_check": _shown(round.checks[-1]) if round.checks else None,
        "made_24": round.made_24,
        "shown_way": _shown(ways(round.cards)[0]) if round.shown_way else None,
        "done": done(round),
        "robo_cards": round.robo_cards if round.robo_played else None,
        "robo_way": _shown(round.robo_way) if round.robo_way else None,
    }


def _check(round: Round, move: dict[str, Any]) -> MoveResult:
    tokens = move.get("tokens")
    if type(tokens) is not list or len(tokens) > MAX_TOKENS:
        raise ValueError(f"tokens must be a list of at most {MAX_TOKENS} tokens")
    resolved = resolve(tokens, round.cards)
    correct = makes_24(resolved)
    return MoveResult(
        correct=correct,
        misconception=diagnose_check(resolved),
        round=round.model_copy(update={"checks": [*round.checks, resolved], "made_24": correct}),
    )


def _show_way(round: Round, move: dict[str, Any]) -> MoveResult:
    return MoveResult(
        correct=True,
        misconception=None,
        round=round.model_copy(update={"shown_way": True}),
        counted=False,
    )


_MOVES = {"check": _check, "show_way": _show_way}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Check an expression (graded) or show a way (not graded).

    Raises ValueError for an unknown move, a move after the student's part of the hand is done, or bad tokens.
    """
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    if done(round):
        raise ValueError("This hand is already done.")
    return apply(round, move)


def computer_move(round: Round, level: int) -> Round:
    """Robo plays its cards once the student's part is done; otherwise the round is unchanged."""
    if not done(round) or round.robo_played:
        return round
    return round.model_copy(update={"robo_played": True, "robo_way": robo_way(ways(round.robo_cards), level)})
