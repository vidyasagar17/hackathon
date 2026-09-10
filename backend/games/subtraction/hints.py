import os

from huggingface_hub import InferenceClient

from .misconceptions import MisconceptionName
from .problems import Problem

MODEL = "Qwen/Qwen2.5-7B-Instruct"

CANNED_HINTS: dict[MisconceptionName, str] = {
    "smaller_from_larger": "Look at each column. If the top number is smaller than the bottom one, borrow from the column to its left before subtracting.",
    "borrowed_without_decrementing": "When you borrow from a column, remember to make that column's number one smaller too.",
    "borrow_across_zero_failure": "When the column you want to borrow from has a 0, borrow from the next column over first, then come back.",
    "always_borrow": "Check each column first. If the top number is already bigger, you don't need to borrow there.",
    "zero_minus_digit_gives_digit": "When the top digit is 0, borrow from the column to the left instead of copying the bottom number.",
}

_MISCONCEPTION_DESCRIPTIONS: dict[MisconceptionName, str] = {
    "smaller_from_larger": "subtracted the smaller digit from the larger digit in each column, ignoring the need to borrow",
    "borrowed_without_decrementing": "borrowed correctly but forgot to reduce the column borrowed from",
    "borrow_across_zero_failure": "failed to borrow across a column containing zero",
    "always_borrow": "borrowed in columns that didn't need it",
    "zero_minus_digit_gives_digit": "wrote the bottom digit as the answer when the top digit was zero, instead of borrowing",
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
                        f"Problem: {problem.minuend} - {problem.subtrahend}. "
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
