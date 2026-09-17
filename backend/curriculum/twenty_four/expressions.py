"""Expressions for The 24 Game: tapped tokens, worked out under an order of operations, written back out.

A student's tokens are card positions (0-3) and the symbols "+", "-", "*", "/", "(", ")". Values are exact
`Fraction`s, so 8 / 3 stays 8/3. An order is a list of operation groups: each group is done leftmost first,
and parentheses are always worked out first. The rule is `RULE`; the two mistakes are the other orders.
"""

from dataclasses import dataclass
from fractions import Fraction

Operator = str
Tree = int | tuple[Operator, "Tree", "Tree"]

OPERATORS = ("+", "-", "*", "/")
RULE: list[set[Operator]] = [{"*", "/"}, {"+", "-"}]
LEFT_TO_RIGHT: list[set[Operator]] = [{"*", "/", "+", "-"}]
PEMDAS_LETTERS: list[set[Operator]] = [{"*"}, {"/"}, {"+"}, {"-"}]

SYMBOLS = {"+": "+", "-": "−", "*": "×", "/": "÷"}
_PRECEDENCE = {"+": 1, "-": 1, "*": 2, "/": 2}


@dataclass(frozen=True)
class Step:
    """One operation done: `left op right = result`."""

    left: Fraction
    operator: Operator
    right: Fraction
    result: Fraction


@dataclass(frozen=True)
class Worked:
    """An expression worked out: its value (None after a division by 0), the steps in order, and its tree."""

    value: Fraction | None
    steps: list[Step]
    tree: Tree | None


def resolve(tokens: list, cards: list[int]) -> list:
    """Replace card positions with card numbers, checking the tokens form one expression using every card once.

    Raises ValueError for an unknown token, a card used twice or not at all, or a malformed expression.
    """
    positions = [token for token in tokens if type(token) is int]
    if sorted(positions) != list(range(len(cards))):
        raise ValueError(f"Use each of the {len(cards)} cards exactly once.")
    if any(type(token) is not int and token not in (*OPERATORS, "(", ")") for token in tokens):
        raise ValueError('tokens must be card positions or one of + - * / ( )')
    resolved = [cards[token] if type(token) is int else token for token in tokens]
    _check_shape(resolved)
    return resolved


def _check_shape(tokens: list) -> None:
    """A number or ( must follow the start, an operator or (; an operator or ) must follow a number or )."""
    depth = 0
    expecting_number = True
    for token in tokens:
        if expecting_number and (type(token) is int or token == "("):
            depth += token == "("
            expecting_number = token == "("
        elif not expecting_number and (token in OPERATORS or token == ")"):
            depth -= token == ")"
            expecting_number = token in OPERATORS
            if depth < 0:
                raise ValueError("A ) has no matching (.")
        else:
            raise ValueError("The tokens don't make an expression.")
    if expecting_number or depth != 0:
        raise ValueError("The expression isn't finished.")


def work_out(tokens: list, order: list[set[Operator]]) -> Worked:
    """Work out resolved tokens under `order`, recording each step; stops at a division by 0."""
    steps: list[Step] = []
    try:
        value, tree, _ = _work_out_from(tokens, 0, order, steps)
    except ZeroDivisionError:
        return Worked(value=None, steps=steps, tree=None)
    return Worked(value=value, steps=steps, tree=tree)


def _work_out_from(tokens: list, start: int, order: list[set[Operator]], steps: list[Step]):
    """Work out from `start` to the matching ) or the end; returns (value, tree, index after it)."""
    items: list[tuple[Fraction, Tree]] = []
    operators: list[Operator] = []
    index = start
    while index < len(tokens) and tokens[index] != ")":
        token = tokens[index]
        if token == "(":
            value, tree, index = _work_out_from(tokens, index + 1, order, steps)
            items.append((value, tree))
        elif type(token) is int:
            items.append((Fraction(token), token))
        else:
            operators.append(token)
        index += 1
    for group in order:
        while any(operator in group for operator in operators):
            at = next(position for position, operator in enumerate(operators) if operator in group)
            (left, left_tree), (right, right_tree) = items[at], items[at + 1]
            result = _apply(left, operators[at], right)
            steps.append(Step(left=left, operator=operators[at], right=right, result=result))
            items[at : at + 2] = [(result, (operators[at], left_tree, right_tree))]
            del operators[at]
    value, tree = items[0]
    return value, tree, index


def _apply(left: Fraction, operator: Operator, right: Fraction) -> Fraction:
    if operator == "+":
        return left + right
    if operator == "-":
        return left - right
    if operator == "*":
        return left * right
    return left / right


def written(tree: Tree) -> list:
    """The tree as tokens with only the parentheses the rule needs.

    A lower operation under a higher one needs them, and so does a + or − right under a −, or a × or ÷
    right under a ÷ (a − (b + c) is not a − b + c).
    """
    if type(tree) is int:
        return [tree]
    operator, left, right = tree
    return [*_child(left, operator, False), operator, *_child(right, operator, True)]


def _child(tree: Tree, parent: Operator, is_right: bool) -> list:
    tokens = written(tree)
    if type(tree) is int:
        return tokens
    lower = _PRECEDENCE[tree[0]] < _PRECEDENCE[parent]
    same_on_right = is_right and _PRECEDENCE[tree[0]] == _PRECEDENCE[parent] and parent in ("-", "/")
    return ["(", *tokens, ")"] if lower or same_on_right else tokens


def number_text(value: Fraction) -> str:
    """18, 8/3, or −2 with a minus sign."""
    sign = "−" if value < 0 else ""
    size = abs(value)
    return f"{sign}{size.numerator}" if size.denominator == 1 else f"{sign}{size.numerator}/{size.denominator}"


def expression_text(tokens: list) -> str:
    """Resolved tokens as the student reads them: (3 + 5) × 3."""
    text = ""
    for token in tokens:
        if token == "(":
            text += "(" if not text or text.endswith("(") else " ("
        elif token == ")":
            text += ")"
        else:
            piece = str(token) if type(token) is int else SYMBOLS[token]
            text += piece if not text or text.endswith("(") else f" {piece}"
    return text


def step_text(step: Step) -> str:
    """5 × 3 = 15"""
    return (
        f"{number_text(step.left)} {SYMBOLS[step.operator]} {number_text(step.right)} = {number_text(step.result)}"
    )
