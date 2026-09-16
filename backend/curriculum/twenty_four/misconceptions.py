"""Rule-based diagnosis of a 24 Game check: an expression the student built as their way to 24.

A mistake is named only when the expression makes 24 under that mistaken order but not under the rule:
working strictly left to right (Bye et al., 2024; Blando et al., 1989; Tabak, 2019) or reading PEMDAS as
letter order, × before ÷ and + before − (Glidden, 2008). When both fit, left to right wins: it has the
stronger evidence for children.
"""

from typing import Literal

from .expressions import LEFT_TO_RIGHT, PEMDAS_LETTERS, RULE, Operator, work_out

TARGET = 24

MisconceptionName = Literal["left_to_right", "pemdas_letter_order"]

MISTAKEN_ORDERS: list[tuple[MisconceptionName, list[set[Operator]]]] = [
    ("left_to_right", LEFT_TO_RIGHT),
    ("pemdas_letter_order", PEMDAS_LETTERS),
]


def makes_24(tokens: list) -> bool:
    """Whether resolved tokens make exactly 24 by the rule."""
    return work_out(tokens, RULE).value == TARGET


def diagnose_check(tokens: list) -> MisconceptionName | None:
    """Name the mistaken order that makes resolved tokens 24, or None when they make 24 by the rule or no order fits."""
    if makes_24(tokens):
        return None
    return next((name for name, order in MISTAKEN_ORDERS if work_out(tokens, order).value == TARGET), None)
