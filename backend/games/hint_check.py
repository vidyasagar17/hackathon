import re

_FILLER_OPENER = re.compile(
    r"^\s*(sure|certainly|of course|absolutely|here'?s a hint|here is a hint)\b[\s!,.:]*",
    re.IGNORECASE,
)


def vet_hint(text: str, answer: int, banned_words: list[str]) -> str | None:
    """Return the LLM hint with any chatty opener removed, or None if it must not be shown.

    Rejects a hint that states the correct answer as a standalone number or uses a
    banned jargon word (or its plural), so the caller falls back to its canned hint.
    """
    hint = _FILLER_OPENER.sub("", text).strip()
    if not hint:
        return None
    if re.search(rf"(?<!\d){answer}(?!\d)", hint):
        return None
    if any(re.search(rf"\b{word}s?\b", hint, re.IGNORECASE) for word in banned_words):
        return None
    return hint[0].upper() + hint[1:]
