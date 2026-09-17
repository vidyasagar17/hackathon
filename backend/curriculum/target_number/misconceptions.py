"""Rule-based diagnosis for Target Number: typed step totals and the equation question.

A step adds a card to the running total or takes it away, done mentally. Its mistakes: counting on and saying the
start number again (Secada, Fuson & Hall, 1983), counting back one step off (Fuson, 1984, 1986), the other operation
(Fuson, 1984), and, on a step across a ten, smaller from larger in the ones and not changing the tens (Brown & Burton,
1978). The equation question fills a box in an equation; its mistakes read = as "the answer comes next": the left
side's answer, or every number added (Falkner, Levi & Carpenter, 1999; McNeil & Alibali, 2005).
"""

from typing import Literal

from pydantic import BaseModel

Sign = Literal["+", "-"]

StepMisconception = Literal[
    "smaller_from_larger",
    "forgot_to_change_the_tens",
    "counted_on_from_start",
    "counted_back_one_off",
    "subtracted_instead",
    "added_instead",
]

EquationMisconception = Literal["answer_to_equal_sign", "added_all_numbers"]

MisconceptionName = StepMisconception | EquationMisconception


def step_total(total: int, sign: Sign, card: int) -> int:
    return total + card if sign == "+" else total - card


def crosses_a_ten(total: int, sign: Sign, card: int) -> bool:
    """Adding makes 10 or more ones; taking away needs more ones than the total has."""
    if sign == "+":
        return total % 10 + card % 10 >= 10
    return total % 10 < card % 10


def _step_mistakes(total: int, sign: Sign, card: int) -> list[tuple[StepMisconception, set[int]]]:
    right = step_total(total, sign, card)
    crossing = crosses_a_ten(total, sign, card)
    if sign == "+":
        return [
            ("forgot_to_change_the_tens", {right - 10} if crossing else set()),
            ("counted_on_from_start", {right - 1}),
            ("subtracted_instead", {total - card} if total >= card else set()),
        ]
    smaller_from_larger = (total // 10 - card // 10) * 10 + (card % 10 - total % 10)
    return [
        ("smaller_from_larger", {smaller_from_larger} if crossing else set()),
        ("forgot_to_change_the_tens", {right + 10} if crossing else set()),
        ("counted_back_one_off", {right - 1, right + 1}),
        ("added_instead", {total + card}),
    ]


def diagnose_step(total: int, sign: Sign, card: int, answer: int) -> StepMisconception | None:
    """The mistake that gives `answer` for `total sign card`, or None when it is right or no mistake gives it.

    Smaller from larger is named before not changing the tens when both give the answer (43 - 8 -> 45).
    """
    if answer == step_total(total, sign, card):
        return None
    return next((name for name, numbers in _step_mistakes(total, sign, card) if answer in numbers), None)


class Equation(BaseModel):
    """`left` = `right` + box: the left side is one number (17 = 12 + box) or two added (9 + 8 = 12 + box)."""

    left: list[int]
    right: int


def equation_answer(equation: Equation) -> int:
    return sum(equation.left) - equation.right


def diagnose_equation(equation: Equation, answer: int) -> EquationMisconception | None:
    """Name the "answer comes next" reading behind `answer`, or None when it is right or none fits.

    Writing the left side's answer only counts as a mistake when the left side has an operation to do.
    """
    if answer == equation_answer(equation):
        return None
    if len(equation.left) > 1 and answer == sum(equation.left):
        return "answer_to_equal_sign"
    if answer == sum(equation.left) + equation.right:
        return "added_all_numbers"
    return None
