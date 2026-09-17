"""Don't Break the Bank moves for the curriculum engine (contract in `curriculum/engine.py`).

Placing a rolled digit is strategy and not graded; Robo places the same digit on its own board in
`computer_move`. With the board full the student types the sum (graded) and, when it is not over the bank,
how far it is from the bank (graded). "Robo's turn" then shows Robo's numbers, sum and distance. Robo never
adds or subtracts wrongly. At level 1 it places each digit where its expected total lands nearest its aim; at
levels 2-3 it looks ahead, finishing the board many times with made-up rolls and keeping the best spot.
"""

import random
from typing import Any

from ..engine import MoveResult
from .misconceptions import diagnose_distance, diagnose_sum
from .rounds import LEVELS, Level, Round, Step, board_numbers

MAX_ANSWER = 999_999
LOOKAHEAD_GAMES = 40


def _config(round: Round) -> Level:
    return LEVELS[round.level]


def _total(board: list[int | None], config: Level) -> int:
    return sum(board_numbers(board, config.width))


def _result(total: int, bank: int) -> int | None:
    """How far under the bank, or None when the total broke it."""
    return bank - total if total <= bank else None


def winner(round: Round) -> str:
    """Closest to the bank without going over; both over is nobody; the same distance is a tie."""
    config = _config(round)
    mine = _result(_total(round.my_board, config), config.bank)
    robo = _result(_total(round.robo_board, config), config.bank)
    if mine is None and robo is None:
        return "nobody"
    if robo is None or (mine is not None and mine < robo):
        return "mine"
    if mine is None or robo < mine:
        return "robo"
    return "same"


def visible_state(round: Round) -> dict[str, Any]:
    """Both boards and the current roll; the right sum and distance once answered; Robo's result and winner at the end."""
    config = _config(round)
    full = None not in round.my_board
    placed = sum(digit is not None for digit in round.my_board)
    total = _total(round.my_board, config) if full else None
    over = round.step == "over"
    robo_total = _total(round.robo_board, config) if over else None
    return {
        "level": round.level,
        "numbers": config.numbers,
        "width": config.width,
        "bank": config.bank,
        "die": "six" if config.highest == 6 else "ten",
        "step": round.step,
        "roll": round.rolls[placed] if round.step == "place" else None,
        "rolls_left": config.spots - placed,
        "my_board": round.my_board,
        "robo_board": round.robo_board,
        "robo_last_spot": round.robo_last_spot,
        "my_numbers": board_numbers(round.my_board, config.width) if full else None,
        "sum_answer": round.sum_answer,
        "my_total": total if round.sum_answer is not None else None,
        "broke": total > config.bank if round.sum_answer is not None else None,
        "distance_answer": round.distance_answer,
        "my_distance": config.bank - total if round.distance_answer is not None else None,
        "robo_numbers": board_numbers(round.robo_board, config.width) if over else None,
        "robo_total": robo_total,
        "robo_distance": _result(robo_total, config.bank) if over else None,
        "winner": winner(round) if over else None,
    }


def _require_step(round: Round, step: Step) -> None:
    if round.step != step:
        raise ValueError(f'This game is not at the "{step}" step.')


def _answer(move: dict[str, Any]) -> int:
    answer = move.get("answer")
    if type(answer) is not int or not 0 <= answer <= MAX_ANSWER:
        raise ValueError(f"answer must be a whole number from 0 to {MAX_ANSWER}")
    return answer


def _place(round: Round, move: dict[str, Any]) -> MoveResult:
    """Put the current roll in an empty spot; not graded."""
    _require_step(round, "place")
    spot = move.get("spot")
    if type(spot) is not int or not 0 <= spot < len(round.my_board) or round.my_board[spot] is not None:
        raise ValueError("spot must be an empty spot on your board")
    placed = sum(digit is not None for digit in round.my_board)
    board = list(round.my_board)
    board[spot] = round.rolls[placed]
    step: Step = "place" if None in board else "sum"
    placed_round = round.model_copy(update={"my_board": board, "step": step})
    return MoveResult(correct=True, misconception=None, round=placed_round, counted=False)


def _sum(round: Round, move: dict[str, Any]) -> MoveResult:
    """Grade the typed sum; a sum over the bank skips the distance question."""
    _require_step(round, "sum")
    answer = _answer(move)
    config = _config(round)
    numbers = board_numbers(round.my_board, config.width)
    total = sum(numbers)
    step: Step = "distance" if total <= config.bank else "pass"
    return MoveResult(
        correct=answer == total,
        misconception=diagnose_sum(numbers, config.width, answer),
        round=round.model_copy(update={"sum_answer": answer, "step": step, "last_graded": "sum"}),
    )


def _distance(round: Round, move: dict[str, Any]) -> MoveResult:
    """Grade how far the sum is from the bank."""
    _require_step(round, "distance")
    answer = _answer(move)
    config = _config(round)
    total = _total(round.my_board, config)
    return MoveResult(
        correct=answer == config.bank - total,
        misconception=diagnose_distance(config.bank, total, answer),
        round=round.model_copy(update={"distance_answer": answer, "step": "pass", "last_graded": "distance"}),
    )


def _robo_turn(round: Round, move: dict[str, Any]) -> MoveResult:
    """Show Robo's result and the winner; not graded."""
    _require_step(round, "pass")
    return MoveResult(correct=True, misconception=None, round=round.model_copy(update={"step": "over"}), counted=False)


_MOVES = {"place": _place, "sum": _sum, "distance": _distance, "robo_turn": _robo_turn}


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Apply one student move. Raises ValueError for an unknown move, the wrong step, or a bad spot or answer."""
    apply = _MOVES.get(move.get("type"))
    if apply is None:
        raise ValueError(f"type must be one of {list(_MOVES)}")
    return apply(round, move)


def robo_spot(board: list[int | None], digit: int, config: Level) -> int:
    """The empty spot where the running total, plus the average roll in every other empty spot, lands nearest the aim.

    Ties go to the earliest spot, so Robo is deterministic.
    """
    empty = [spot for spot, placed in enumerate(board) if placed is None]
    average = (config.lowest + config.highest) / 2

    def place_value(spot: int) -> int:
        return 10 ** (config.width - 1 - spot % config.width)

    filled = sum(placed * place_value(spot) for spot, placed in enumerate(board) if placed is not None)

    def gap(spot: int) -> float:
        rest = sum(place_value(other) for other in empty if other != spot)
        return abs(config.aim * config.bank - (filled + digit * place_value(spot) + average * rest))

    return min(empty, key=lambda spot: (gap(spot), spot))


def _finished_score(board: list[int | None], config: Level) -> int:
    """Distance under the bank for a full board, or the whole bank when it broke (the worst score)."""
    result = _result(_total(board, config), config.bank)
    return config.bank if result is None else result


def lookahead_spot(board: list[int | None], digit: int, config: Level) -> int:
    """The empty spot with the lowest total score over `LOOKAHEAD_GAMES` finishes of the board.

    Each finish rolls the empty spots at random and places them with `robo_spot`. The rolls are seeded by the
    board and digit, so the same position always gets the same spot. Ties go to the earliest spot.
    """
    rolls = random.Random(repr((board, digit)))
    best_spot, best_score = -1, None
    for spot in (spot for spot, placed in enumerate(board) if placed is None):
        score = 0
        for _ in range(LOOKAHEAD_GAMES):
            finished = list(board)
            finished[spot] = digit
            while None in finished:
                roll = rolls.randint(config.lowest, config.highest)
                finished[robo_spot(finished, roll, config)] = roll
            score += _finished_score(finished, config)
        if best_score is None or score < best_score:
            best_spot, best_score = spot, score
    return best_spot


def computer_move(round: Round, level: int) -> Round:
    """Robo places the same roll on its board after each student placement; otherwise the round is unchanged."""
    mine = sum(digit is not None for digit in round.my_board)
    robos = sum(digit is not None for digit in round.robo_board)
    if robos >= mine:
        return round
    digit = round.rolls[robos]
    config = LEVELS[level]
    choose = lookahead_spot if config.looks_ahead else robo_spot
    spot = choose(round.robo_board, digit, config)
    board = list(round.robo_board)
    board[spot] = digit
    return round.model_copy(update={"robo_board": board, "robo_last_spot": spot})
