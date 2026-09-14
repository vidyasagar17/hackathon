from pydantic import BaseModel

MIN_TIER = 1
MAX_TIER = 3
ESCALATION_RUN = 3


class TierAttempt(BaseModel):
    difficulty: int
    correct: bool
    misconception: str | None


def next_tier(history: list[TierAttempt]) -> int:
    """Decide which difficulty tier the next problem should use.

    History is chronological (oldest first), scoped to one session + game.
    Escalates after ESCALATION_RUN correct answers in a row at the current tier.
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

    if len(run) >= ESCALATION_RUN and all(attempt.correct for attempt in run[:ESCALATION_RUN]):
        return min(MAX_TIER, current_tier + 1)

    return current_tier


def correct_in_a_row(history: list[TierAttempt], tier: int) -> int:
    """Count the most recent correct answers in a row at `tier`, capped at ESCALATION_RUN.

    Counting stops at the latest wrong answer or at an attempt from another tier, so a tier
    the student has just moved to starts at 0. This is the same run next_tier uses to escalate.
    """
    count = 0
    for attempt in reversed(history):
        if attempt.difficulty != tier or not attempt.correct:
            break
        count += 1
    return min(count, ESCALATION_RUN)
