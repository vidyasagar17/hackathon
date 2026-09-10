import os

from huggingface_hub import InferenceClient

from .misconceptions import MisconceptionName
from .problems import Problem

MODEL = "Qwen/Qwen2.5-7B-Instruct"

CANNED_HINTS: dict[MisconceptionName, str] = {
    "added_instead_of_multiplied": "Multiplying means adding a number to itself several times, not adding the two numbers together once.",
    "no_carry": "When a column's product is 10 or more, write down the last digit and carry the rest over to the next column.",
    "carry_always": "Only carry a digit to the next column when that column's product is actually 10 or more.",
    "double_digit_write": "Each column can only hold one digit. If the product is 10 or more, carry the extra amount to the next column instead of writing both digits.",
    "drops_final_carry": "If the last column's product is 10 or more, you need one more digit at the front of your answer for that carry.",
}

_MISCONCEPTION_DESCRIPTIONS: dict[MisconceptionName, str] = {
    "added_instead_of_multiplied": "added the two numbers instead of multiplying them",
    "no_carry": "multiplied each digit independently and never carried into the next column",
    "carry_always": "carried a digit into the tens column even when it wasn't needed",
    "double_digit_write": "wrote the full product of a column instead of carrying",
    "drops_final_carry": "computed every column correctly but dropped the leading digit when the product needed a third digit",
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
                        f"Problem: {problem.multiplicand} x {problem.multiplier}. "
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
