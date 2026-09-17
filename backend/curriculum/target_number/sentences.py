"""Code-built Target Number hint sentences from the student's own step or equation.

A step hint counts on or back (small cards), or works through a ten (bigger cards and steps across a ten), and ends
with the right total. An equation hint says what = means and finishes the right side. Every sum and difference in a
sentence is true.
"""

from .misconceptions import Equation, EquationMisconception, Sign, StepMisconception, equation_answer, step_total


def _ones(count: int) -> str:
    return "1 one" if count == 1 else f"{count} ones"


def _counted(numbers: range) -> str:
    return ", ".join(str(number) for number in numbers)


def _add_by_tens(total: int, card: int) -> str:
    """How to add a card of 6 or more: through 10, or the tens then the ones."""
    right = total + card
    if card == 10:
        return f"Adding 10 makes the tens go up by one: {total} + 10 = {right}."
    if card < 10:
        return f"{total} + 10 = {total + 10}, and {card} is {10 - card} less than 10, so {total} + {card} = {right}."
    tens = card // 10 * 10
    if card % 10 == 0:
        return f"Add the tens: {total} + {card} = {right}."
    return f"Add the tens, then the ones: {total} + {tens} = {total + tens} and {total + tens} + {card % 10} = {right}."


def _take_by_tens(total: int, card: int) -> str:
    """How to take away a card of 6 or more from a total of 10 or more."""
    right = total - card
    if card == 10:
        return f"Taking away 10 makes the tens go down by one: {total} − 10 = {right}."
    if card < 10:
        give = 10 - card
        return (
            f"Take away 10, then give {give} back, because {card} is {give} less than 10: "
            f"{total} − 10 = {total - 10} and {total - 10} + {give} = {right}. So {total} − {card} = {right}."
        )
    tens = card // 10 * 10
    if card % 10 == 0:
        return f"Take away the tens: {total} − {card} = {right}."
    return f"Take away the tens, then the ones: {total} − {tens} = {total - tens} and {total - tens} − {card % 10} = {right}."


def _use_a_ten(total: int, card: int) -> str:
    """A take-away step across a ten, worked by trading a ten for ones."""
    ones, rest = total % 10, total - total % 10 - 10
    tens = card // 10 * 10
    if rest == 0 and not tens:
        return f"{total} has only {_ones(ones)}, so use the ten: {total} is {total} ones, and {total} − {card} = {total - card}."
    worked = f"{ones + 10} − {card % 10} = {ones + 10 - card % 10}"
    if tens:
        worked += f" and {rest} − {tens} = {rest - tens}"
    return f"{total} has only {_ones(ones)}, so use a ten: {total} is {rest} and {ones + 10}. {worked}, so {total} − {card} = {total - card}."


def step_hint(total: int, sign: Sign, card: int, answer: int, misconception: StepMisconception) -> str:
    """The hint for typing `answer` for `total sign card`."""
    right = step_total(total, sign, card)
    if misconception == "counted_on_from_start":
        if card <= 5:
            return (
                f"When you count on from {total}, the first number you say is {total + 1}: "
                f"{_counted(range(total + 1, right + 1))}. So {total} + {card} = {right}."
            )
        if card == 10:
            return _add_by_tens(total, card)
        return f"When you count on from {total}, the first number you say is {total + 1}, not {total}. {_add_by_tens(total, card)}"
    if misconception == "counted_back_one_off":
        if card <= 5 or total < 10:
            return f"Start at {total} and count back {card}: {_counted(range(total - 1, right - 1, -1))}. So {total} − {card} = {right}."
        return _take_by_tens(total, card)
    if misconception == "subtracted_instead":
        return f"The sign is +, so put them together: {total} + {card} = {right}."
    if misconception == "added_instead":
        return f"The sign is −, so take {card} away: {total} − {card} = {right}."
    if sign == "+":
        ones = total % 10 + card % 10
        if total < 10 and card < 10:
            return f"{total} + {card} makes {ones} ones, which is 1 ten and {_ones(ones - 10)}, so {total} + {card} = {right}."
        return (
            f"The ones make {total % 10} + {card % 10} = {ones}, which is 1 ten and {_ones(ones - 10)}, "
            f"so the tens go up by one: {total} + {card} = {right}."
        )
    if misconception == "smaller_from_larger":
        return (
            f"You can't take {_ones(card % 10)} from {_ones(total % 10)}, and turning it around to "
            f"{card % 10} − {total % 10} gives the wrong answer. {_use_a_ten(total, card)}"
        )
    return _use_a_ten(total, card)


def equation_hint(equation: Equation, answer: int, misconception: EquationMisconception) -> str:
    """The hint for writing `answer` in the box of `equation`."""
    target, right = sum(equation.left), equation.right
    finish = f"so {right} + □ must make {target} too: {right} + {equation_answer(equation)} = {target}."
    if len(equation.left) == 1:
        return f"= means both sides are the same amount. The left side is {target}, {finish}"
    left = f"{equation.left[0]} + {equation.left[1]} = {target}"
    if misconception == "answer_to_equal_sign":
        return f"{left} is only the left side. = means both sides are the same amount, {finish}"
    return f"= means both sides are the same amount. {left}, {finish}"
