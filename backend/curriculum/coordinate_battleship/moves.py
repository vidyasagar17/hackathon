"""Coordinate Plane Battleship moves for the curriculum engine (contract in `curriculum/engine.py`).

A turn: aim at a point on Robo's ocean (not graded), write its ordered pair and fire (graded; the shot lands
where the written pair says), press "Robo's turn" (not graded), then tap the point Robo calls on your own
ocean (graded; Robo's shot lands at its real call). The game ends after `TURNS` turns or when a fleet is sunk.
"""

import random
from typing import Any

from ..engine import MoveResult
from .misconceptions import Point, diagnose_read, diagnose_write
from .rounds import LEVELS, TURNS, Level, Round, Step, neighbors


def _config(round: Round) -> Level:
    return LEVELS[round.level]


def _in_grid(point: Point, config: Level) -> bool:
    return 0 <= point[0] <= config.size and 0 <= point[1] <= config.size


def _hits(shots: list[Point], ships: list[list[Point]]) -> list[Point]:
    points = {point for ship in ships for point in ship}
    return [shot for shot in dict.fromkeys(shots) if shot in points]


def _sunk(shots: list[Point], ships: list[list[Point]]) -> list[list[Point]]:
    return [ship for ship in ships if all(point in shots for point in ship)]


def winner(round: Round) -> str:
    """Sinking the whole fleet wins; otherwise the most hits; equal hits tie."""
    mine_sunk = len(_sunk(round.my_shots, round.robo_ships)) == len(round.robo_ships)
    robo_sunk = len(_sunk(round.robo_shots, round.my_ships)) == len(round.my_ships)
    if mine_sunk != robo_sunk:
        return "mine" if mine_sunk else "robo"
    mine, robo = len(_hits(round.my_shots, round.robo_ships)), len(_hits(round.robo_shots, round.my_ships))
    return "mine" if mine > robo else "robo" if robo > mine else "same"


def _shots(shots: list[Point], ships: list[list[Point]]) -> list[dict[str, Any]]:
    points = {point for ship in ships for point in ship}
    return [{"x": x, "y": y, "hit": (x, y) in points} for x, y in dict.fromkeys(shots)]


def visible_state(round: Round) -> dict[str, Any]:
    """Your ships and Robo's shots on them; your shots on Robo's ocean with only sunk ships shown; Robo's fleet at the end."""
    config = _config(round)
    over = round.step == "over"
    return {
        "level": round.level,
        "size": config.size,
        "turns": TURNS,
        "turn": min(round.turn, TURNS),
        "step": round.step,
        "robo_ocean": {
            "shots": _shots(round.my_shots, round.robo_ships),
            "sunk": _sunk(round.my_shots, round.robo_ships),
            "ships": round.robo_ships if over else None,
        },
        "my_ocean": {"ships": round.my_ships, "shots": _shots(round.robo_shots, round.my_ships)},
        "aim": round.aim,
        "written": round.written,
        "robo_call": round.robo_call if round.step in ("read", "aim", "over") else None,
        "tapped": round.tapped,
        "my_hits": len(_hits(round.my_shots, round.robo_ships)),
        "robo_hits": len(_hits(round.robo_shots, round.my_ships)),
        "fleet": len(round.robo_ships),
        "my_sunk": len(_sunk(round.my_shots, round.robo_ships)),
        "robo_sunk": len(_sunk(round.robo_shots, round.my_ships)),
        "winner": winner(round) if over else None,
    }


def _require_step(round: Round, *steps: Step) -> None:
    if round.step not in steps:
        raise ValueError(f'This game is not at the "{"/".join(steps)}" step.')


def _point(round: Round, move: dict[str, Any]) -> Point:
    x, y = move.get("x"), move.get("y")
    if type(x) is not int or type(y) is not int or not _in_grid((x, y), _config(round)):
        raise ValueError(f"x and y must be whole numbers from 0 to {_config(round).size}")
    return (x, y)


def _game_over(round: Round) -> bool:
    return (
        len(_sunk(round.my_shots, round.robo_ships)) == len(round.robo_ships)
        or len(_sunk(round.robo_shots, round.my_ships)) == len(round.my_ships)
        or round.turn > TURNS
    )


def _aim(round: Round, move: dict[str, Any]) -> MoveResult:
    """Pick the point to fire at; can change the aim until the pair is written. Not graded."""
    _require_step(round, "aim", "write")
    aimed = round.model_copy(update={"aim": _point(round, move), "step": "write", "written": None, "tapped": None})
    return MoveResult(correct=True, misconception=None, round=aimed, counted=False)


def _write(round: Round, move: dict[str, Any]) -> MoveResult:
    """Grade the written pair against the aim and fire where the written pair says."""
    _require_step(round, "write")
    written = _point(round, move)
    fired = round.model_copy(update={"written": written, "my_shots": [*round.my_shots, written], "last_graded": "write"})
    step: Step = "over" if _game_over(fired) else "pass"
    return MoveResult(
        correct=written == round.aim,
        misconception=diagnose_write(round.aim, written),
        round=fired.model_copy(update={"step": step}),
    )


def _robo_turn(round: Round, move: dict[str, Any]) -> MoveResult:
    _require_step(round, "pass")
    return MoveResult(correct=True, misconception=None, round=round.model_copy(update={"step": "robo"}), counted=False)


def _read(round: Round, move: dict[str, Any]) -> MoveResult:
    """Grade the tapped point against Robo's call; Robo's shot lands at its call; the next turn starts."""
    _require_step(round, "read")
    tapped = _point(round, move)
    shot = round.model_copy(
        update={
            "tapped": tapped,
            "robo_shots": [*round.robo_shots, round.robo_call],
            "turn": round.turn + 1,
            "aim": None,
            "last_graded": "read",
        }
    )
    step: Step = "over" if _game_over(shot) else "aim"
    return MoveResult(
        correct=tapped == round.robo_call,
        misconception=diagnose_read(round.robo_call, tapped),
        round=shot.model_copy(update={"step": step}),
    )


_MOVES = {"aim": _aim, "write": _write, "robo_turn": _robo_turn, "read": _read}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Apply one student move. Raises ValueError for an unknown move, the wrong step, or a point off the grid."""
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


def robo_target(round: Round) -> Point:
    """Robo's next call. Level 1: a random untried point. Levels 2-3: a point next to an unsunk hit when there is one,
    else a random untried point (level 3 hunts only on a checkerboard while it can). Seeded by the game and shot count.
    """
    config = _config(round)
    rng = random.Random(f"{round.seed}:{len(round.robo_shots)}")
    grid = [(x, y) for x in range(config.size + 1) for y in range(config.size + 1)]
    untried = [point for point in grid if point not in round.robo_shots]
    if config.robo != "random":
        sunk = {point for ship in _sunk(round.robo_shots, round.my_ships) for point in ship}
        open_hits = [hit for hit in _hits(round.robo_shots, round.my_ships) if hit not in sunk]
        targets = sorted({near for hit in open_hits for near in neighbors(hit) if near in untried})
        if targets:
            return rng.choice(targets)
        if config.robo == "checkerboard":
            untried = [point for point in untried if (point[0] + point[1]) % 2 == 0] or untried
    return rng.choice(untried)


def computer_move(round: Round, level: int) -> Round:
    """Robo calls its shot once the student hands it the turn; otherwise the round is unchanged."""
    if round.step != "robo":
        return round
    return round.model_copy(update={"robo_call": robo_target(round), "step": "read"})
