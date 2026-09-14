import os

from huggingface_hub import InferenceClient

from ..hint_check import keeps_facts, vet_hint
from .misconceptions import MisconceptionName
from .problems import Problem
from .sentences import specific_hint

MODEL = "Qwen/Qwen2.5-7B-Instruct"

GENERAL_HINT = "Multiply the ones digit first and write down its ones digit. Carry the tens, then multiply the tens digit and add what you carried."

BANNED_WORDS = ["multiplicand", "multiplier", "algorithm"]


def generate_hint(problem: Problem, misconception: MisconceptionName) -> str:
    """Return the misconception's hint sentence, reworded by the LLM only when that is safe.

    The sentence is built deterministically from the student's digits. The LLM rewording is
    shown only if `vet_hint` accepts it and `keeps_facts` confirms it states the same numbers,
    column names and comparison words in the same order; otherwise the sentence is shown.
    """
    sentence = specific_hint(problem, misconception)
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
                        "You reword a math hint for a 3rd, 4th, or 5th grade student so it "
                        "sounds friendly and encouraging. Keep every number and every "
                        "column name (ones, tens, hundreds) exactly as written and in the "
                        "same order. Do not add numbers, steps, or advice. No jargon. "
                        f"Never use these words: {', '.join(BANNED_WORDS)}."
                    ),
                },
                {"role": "user", "content": f'Hint to reword: "{sentence}"'},
            ],
            max_tokens=100,
        )
        hint = vet_hint(response.choices[0].message.content, problem.answer, BANNED_WORDS)
    except Exception:
        return sentence
    return hint if hint and keeps_facts(hint, sentence) else sentence
