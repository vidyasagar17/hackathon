"""Shared pieces of the move engine for curriculum games.

Every curriculum game is a package under `curriculum/` exporting:
- `Round`: Pydantic model of the full round state, hidden parts included.
- `new_round(level) -> Round`
- `visible_state(round) -> dict`: only what the student may see.
- `evaluate_move(round, move) -> MoveResult`: pure; the diagnosis is rule-based, never an LLM.
  Raises ValueError for a move the round doesn't allow; the route answers 422 and logs nothing.
- `computer_move(round, level) -> Round`: pure and deterministic; returns the round
  unchanged when it isn't the computer's turn.
- `hint_sentence(round, misconception) -> str`: a code-built sentence from the round's own
  values, optionally reworded by the LLM under `keeps_facts`.
- `GENERAL_HINT`: shown for a wrong move with no diagnosed misconception, never an LLM hint.
"""

from pydantic import BaseModel


class MoveResult(BaseModel):
    """What one student move did: whether it was right, its diagnosed misconception, and the round after it.

    `counted` is False for a move that changes the game but isn't math to grade (e.g. arranging cards
    or keep/trash); it is applied but not logged, so it doesn't affect levels or the summary.
    """

    correct: bool
    misconception: str | None
    round: BaseModel
    counted: bool = True
