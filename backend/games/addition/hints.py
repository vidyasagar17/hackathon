import os

from huggingface_hub import InferenceClient

from .misconceptions import MisconceptionName
from .problems import Problem

MODEL = "Qwen/Qwen2.5-7B-Instruct"

CANNED_HINTS: dict[MisconceptionName, str] = {
    "no_carry": "When a column adds up to 10 or more, write down the last digit and carry the 1 over to the next column.",
    "carry_always": "Only carry a 1 to the next column when that column's sum is 10 or more.",
    "double_digit_write": "Each column can only hold one digit. If the sum is 10 or more, carry the extra 1 to the next column instead of writing both digits.",
    "carry_drops_at_second_column": "Check every column for a carry, not just the first one — sometimes carrying creates a new carry in the next column too.",
    "drops_final_carry": "If the last column's sum is 10 or more, you need one more digit at the front of your answer for that carry.",
}

_MISCONCEPTION_DESCRIPTIONS: dict[MisconceptionName, str] = {
    "no_carry": "added each column independently and never carried into the next column",
    "carry_always": "carried a 1 into every column, even ones that didn't need it",
    "double_digit_write": "wrote the full two-digit sum of a column instead of carrying",
    "carry_drops_at_second_column": "carried correctly once but failed to cascade a second carry further left",
    "drops_final_carry": "computed every column correctly but dropped the leading digit when the total needed a fourth digit",
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
                        "You write short, encouraging math hints for a 2nd or "
                        "3rd grade student. One or two sentences. No jargon."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Problem: {problem.addend1} + {problem.addend2}. "
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
