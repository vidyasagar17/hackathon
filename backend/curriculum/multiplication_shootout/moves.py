"""Multiplication Shootout's move functions for the curriculum engine (contract in `curriculum/engine.py`)."""

from typing import Any

from ..engine import MoveResult
from .misconceptions import diagnose_product, diagnose_quotient
from .rounds import Fact, Round

ROBO_CUTOFFS = {1: 12, 2: 49, 3: 54}
MAX_ANSWER = 100


def _fact_state(fact: Fact) -> dict[str, Any]:
    return {"operation": fact.operation, "left": fact.left, "right": fact.right}


def visible_state(round: Round) -> dict[str, Any]:
    """The student's fact; its correct answer and Robo's turn only once the student has answered."""
    answered = round.answer is not None
    robo_answered = round.robo_answer is not None
    return {
        "level": round.level,
        "fact": _fact_state(round.fact),
        "answer": round.answer,
        "correct_answer": round.fact.correct_answer if answered else None,
        "robo_fact": _fact_state(round.robo_fact) if answered else None,
        "robo_answer": round.robo_answer,
        "robo_correct_answer": round.robo_fact.correct_answer if robo_answered else None,
    }


def _diagnose(fact: Fact, answer: int) -> str | None:
    if fact.operation == "multiply":
        return diagnose_product(fact.left, fact.right, answer)
    return diagnose_quotient(fact.left, fact.right, answer)


def evaluate_move(round: Round, move: dict[str, Any]) -> MoveResult:
    """Judge the student's answer to their fact and return the round with the answer recorded.

    Raises ValueError when the fact was already answered or the answer isn't a whole number 0-100.
    """
    if round.answer is not None:
        raise ValueError("This fact has already been answered.")
    answer = move.get("answer")
    if type(answer) is not int or not 0 <= answer <= MAX_ANSWER:
        raise ValueError(f"answer must be a whole number from 0 to {MAX_ANSWER}")
    return MoveResult(
        correct=answer == round.fact.correct_answer,
        misconception=_diagnose(round.fact, answer),
        round=round.model_copy(update={"answer": answer}),
    )


def _robo_answer(fact: Fact, level: int) -> int:
    """Right when the fact's size (product, or dividend) is within the level's cutoff; else one step down.

    Every fact above a cutoff has a second factor and a quotient of at least 2, so the wrong
    answer, a x (b - 1) or the quotient - 1, is never negative and never the correct one.
    """
    size = fact.left * fact.right if fact.operation == "multiply" else fact.left
    if size <= ROBO_CUTOFFS[level]:
        return fact.correct_answer
    if fact.operation == "multiply":
        return fact.left * (fact.right - 1)
    return fact.correct_answer - 1


def computer_move(round: Round, level: int) -> Round:
    """Robo answers its own fact once the student has answered theirs; otherwise the round is unchanged."""
    if round.answer is None or round.robo_answer is not None:
        return round
    return round.model_copy(update={"robo_answer": _robo_answer(round.robo_fact, level)})
