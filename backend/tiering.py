from pydantic import BaseModel

MIN_TIER = 1
MAX_TIER = 3


class TierAttempt(BaseModel):
    difficulty: int
    correct: bool
    misconception: str | None


def next_tier(history: list[TierAttempt]) -> int:
    """Decide which difficulty tier the next problem should use.

    History is chronological (oldest first), scoped to one session + game.
    Escalates after 3 correct answers in a row at the current tier.
    De-escalates when the same misconception is diagnosed twice in a row.
    """
    if not history:
        return MIN_TIER

    current_tier = history[-1].difficulty
    run = []
    for attempt in reversed(history):
        if attempt.difficulty != current_tier:
            break
        run.append(attempt)

    if (
        len(run) >= 2
        and run[0].misconception is not None
        and run[0].misconception == run[1].misconception
    ):
        return max(MIN_TIER, current_tier - 1)

    if len(run) >= 3 and all(attempt.correct for attempt in run[:3]):
        return min(MAX_TIER, current_tier + 1)

    return current_tier
