"""Code-built 24 Game hint sentences from the student's own expression.

Each sentence names the rule the mistake broke and what the expression makes by it (its steps are already
listed above the hint), then writes the order the mistake used with the parentheses that make the rule do
it — which makes 24, since that order did.
"""

from .expressions import RULE, expression_text, number_text, work_out, written
from .misconceptions import MISTAKEN_ORDERS, MisconceptionName

_RULE_REMINDERS: dict[MisconceptionName, str] = {
    "left_to_right": "× and ÷ come before + and −",
    "pemdas_letter_order": "× and ÷ go left to right in the order they're written, and so do + and −",
}


def _made_by_rule(tokens: list) -> str:
    value = work_out(tokens, RULE).value
    return "it divides by 0, which can't be done" if value is None else f"it makes {number_text(value)}"


def specific_hint(tokens: list, misconception: MisconceptionName) -> str:
    """The hint for resolved tokens whose mistaken order makes 24."""
    order = dict(MISTAKEN_ORDERS)[misconception]
    meant = written(work_out(tokens, order).tree)
    return (
        f"In {expression_text(tokens)}, {_RULE_REMINDERS[misconception]}, so {_made_by_rule(tokens)}. "
        f"Parentheses show the order you used: {expression_text(meant)} = 24."
    )
