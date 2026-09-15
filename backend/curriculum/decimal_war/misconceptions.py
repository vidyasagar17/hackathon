"""Rule-based diagnosis of a wrong Decimal War judgment.

Each side's number is its digits after "0." ("45" is 0.45). Rules follow the decimal
comparison research of Steinle & Stacey (1998, 2001) and Resnick et al. (1989).
"""

from decimal import Decimal
from typing import Literal

Pick = Literal["mine", "robo", "same"]

MisconceptionName = Literal[
    "ignores_zero",
    "longer_is_larger",
    "shorter_is_larger",
    "reciprocal_thinking",
]


def correct_pick(mine: str, robo: str) -> Pick:
    """Return the correct judgment: the larger number, or "same" when the values are equal."""
    mine_value, robo_value = Decimal(f"0.{mine}"), Decimal(f"0.{robo}")
    if mine_value == robo_value:
        return "same"
    return "mine" if mine_value > robo_value else "robo"


def diagnose(mine: str, robo: str, pick: Pick) -> MisconceptionName | None:
    """Return the misconception that explains a wrong pick, or None for a correct or unexplained one.

    - "same" for numbers equal once zeros straight after the point are dropped (0.3 vs 0.03)
      is `ignores_zero` (numerator focussed thinking). Interspersed zeros (0.45 vs 0.405)
      are not treated as equal in the research, so they are not diagnosed.
    - Picking the number with more decimal places when it is smaller or equal is
      `longer_is_larger`; with fewer places, `shorter_is_larger`.
    - Picking the smaller of two same-length numbers is `reciprocal_thinking` (0.3 > 0.4).
    """
    if pick == correct_pick(mine, robo):
        return None
    if pick == "same":
        return "ignores_zero" if mine.lstrip("0") == robo.lstrip("0") else None

    picked, other = (mine, robo) if pick == "mine" else (robo, mine)
    if len(picked) > len(other):
        return "longer_is_larger"
    if len(picked) < len(other):
        return "shorter_is_larger"
    if picked == other:
        return None
    return "reciprocal_thinking"
