import os

from huggingface_hub import InferenceClient

from ..hint_check import vet_hint
from .misconceptions import MisconceptionName
from .problems import Problem

MODEL = "Qwen/Qwen2.5-7B-Instruct"

GENERAL_HINT = "Work one column at a time, starting with the ones. If a column adds up to 10 or more, write the ones digit and carry the 1 to the next column."

BANNED_WORDS = ["addend", "augend", "algorithm"]

CANNED_HINTS: dict[MisconceptionName, str] = {
    "no_carry": "When a column adds up to 10 or more, write down the last digit and carry the 1 over to the next column.",
    "carry_always": "Only carry a 1 to the next column when that column's sum is 10 or more.",
    "reversed_carry": "When a column adds up to 10 or more, write the ones digit in that column and carry the tens digit to the next column.",
    "carry_drops_at_second_column": "Check every column for a carry, not just the first one — sometimes carrying creates a new carry in the next column too.",
    "drops_final_carry": "If the last column's sum is 10 or more, you need one more digit at the front of your answer for that carry.",
}

_MISCONCEPTION_DESCRIPTIONS: dict[MisconceptionName, str] = {
    "no_carry": "added each column independently and never carried into the next column",
    "carry_always": "carried a 1 into every column, even ones that didn't need it",
    "reversed_carry": "wrote the tens digit of a column's sum and carried the ones digit, instead of the other way around",
    "carry_drops_at_second_column": "carried correctly once but failed to cascade a second carry further left",
    "drops_final_carry": "computed every column correctly but dropped the leading digit when the total needed a fourth digit",
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
                        "You write short, encouraging math hints for a 2nd or "
                        "3rd grade student. One or two sentences. No jargon. "
                        "Never state the answer. "
                        f"Never use these words: {', '.join(BANNED_WORDS)}."
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
        hint = vet_hint(response.choices[0].message.content, problem.answer, BANNED_WORDS)
        return hint or CANNED_HINTS[misconception]
    except Exception:
        return CANNED_HINTS[misconception]
