import os
from concurrent.futures import ThreadPoolExecutor

from huggingface_hub import InferenceClient

from .hint_check import keeps_facts, vet_hint

MODEL = "Qwen/Qwen2.5-7B-Instruct"
DEADLINE_SECONDS = 4

_executor = ThreadPoolExecutor(max_workers=4)


def _ask_llm(system_prompt: str, sentence: str) -> str:
    client = InferenceClient(
        token=os.environ["HF_TOKEN"], timeout=DEADLINE_SECONDS, provider="featherless-ai"
    )
    response = client.chat_completion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f'Hint to reword: "{sentence}"'},
        ],
        max_tokens=100,
    )
    return response.choices[0].message.content


def reword_hint(sentence: str, system_prompt: str, answer: int | None, banned_words: list[str]) -> str:
    """Return a friendlier LLM rewording of a code-built hint sentence, or the sentence itself.

    The whole LLM exchange must finish within DEADLINE_SECONDS. `InferenceClient`'s own timeout
    only limits each network step, and its provider lookup has no limit, so the call runs on a
    worker thread with a total wait. A late, failed, or unsafe rewording returns the sentence.
    """
    try:
        reply = _executor.submit(_ask_llm, system_prompt, sentence).result(timeout=DEADLINE_SECONDS)
    except Exception:
        return sentence
    hint = vet_hint(reply, answer, banned_words)
    return hint if hint and keeps_facts(hint, sentence) else sentence
