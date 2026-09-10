import os

from huggingface_hub import InferenceClient

from .misconceptions import MisconceptionName
from .problems import Problem

MODEL = "Qwen/Qwen2.5-7B-Instruct"

CANNED_HINTS: dict[MisconceptionName, str] = {
    "subtracted_instead_of_divided": "Dividing means splitting into equal groups, not subtracting one number from the other.",
    "multiplied_instead_of_divided": "Dividing means splitting into equal groups, not multiplying the two numbers.",
    "only_used_first_digit": "Don't stop after dividing the tens digit — bring down the ones digit and keep going.",
    "no_regroup_in_division": "If dividing the tens digit leaves something left over, combine it with the ones digit before dividing again.",
    "reversed_quotient_digits": "Double check the order of your digits — the tens digit of your answer goes first, then the ones digit.",
}

_MISCONCEPTION_DESCRIPTIONS: dict[MisconceptionName, str] = {
    "subtracted_instead_of_divided": "subtracted the divisor from the dividend instead of dividing",
    "multiplied_instead_of_divided": "multiplied the dividend by the divisor instead of dividing",
    "only_used_first_digit": "divided only the tens digit by the divisor and ignored the ones digit",
    "no_regroup_in_division": "divided each digit independently and dropped the remainder instead of combining it forward",
    "reversed_quotient_digits": "computed the correct quotient but wrote its digits in reversed order",
}


def generate_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return an LLM-phrased hint for the diagnosed misconception, or a canned fallback."""
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
                        "4th, or 5th grade student. One or two sentences. No jargon."
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
        return response.choices[0].message.content.strip()
    except Exception:
        return CANNED_HINTS[misconception]
