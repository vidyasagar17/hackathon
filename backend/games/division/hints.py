import os

from huggingface_hub import InferenceClient

from ..hint_check import vet_hint
from .misconceptions import MisconceptionName
from .problems import Problem

MODEL = "Qwen/Qwen2.5-7B-Instruct"

GENERAL_HINT = "If the tens digit is too small to share into equal groups, share the whole number at once. Otherwise share the tens first, multiply back, subtract, then bring down the ones and share again."

BANNED_WORDS = ["dividend", "divisor", "quotient", "algorithm"]

CANNED_HINTS: dict[MisconceptionName, str] = {
    "subtracted_instead_of_divided": "Dividing means splitting into equal groups, not subtracting one number from the other.",
    "multiplied_instead_of_divided": "Dividing means splitting into equal groups, not multiplying the two numbers.",
    "only_used_first_digit": "Don't stop after dividing the tens digit — bring down the ones digit and keep going.",
    "no_regroup_in_division": "If dividing the tens digit leaves something left over, combine it with the ones digit before dividing again.",
    "reversed_quotient_digits": "Double check the order of your digits — the tens digit of your answer goes first, then the ones digit.",
}

_MISCONCEPTION_DESCRIPTIONS: dict[MisconceptionName, str] = {
    "subtracted_instead_of_divided": "subtracted the second number from the first instead of dividing",
    "multiplied_instead_of_divided": "multiplied the two numbers instead of dividing",
    "only_used_first_digit": "divided only the tens digit and ignored the ones digit",
    "no_regroup_in_division": "divided each digit on its own and dropped the leftover instead of combining it with the next digit",
    "reversed_quotient_digits": "found the right answer but wrote its digits in reversed order",
}


def generate_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return an LLM-phrased hint for the diagnosed misconception, or a canned fallback.

    The LLM text is shown only if `vet_hint` accepts it (no stated answer, no banned jargon).
    """
    try:
        client = InferenceClient(
            token=os.environ["HF_TOKEN"], timeout=5, provider="featherless-ai"
        )
        response = client.chat_completion(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You write short, encouraging math hints for a 3rd, "
                        "4th, or 5th grade student. One or two sentences. No jargon. "
                        "Never state the answer. "
                        f"Never use these words: {', '.join(BANNED_WORDS)}."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Problem: {problem.dividend} / {problem.divisor}. "
                        f"The student {_MISCONCEPTION_DESCRIPTIONS[misconception]}. "
                        "Write a hint that helps them fix this specific mistake."
                    ),
                },
            ],
            max_tokens=80,
        )
        hint = vet_hint(response.choices[0].message.content, problem.answer, BANNED_WORDS)
        return hint or CANNED_HINTS[misconception]
    except Exception:
        return CANNED_HINTS[misconception]
