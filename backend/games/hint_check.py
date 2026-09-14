import re

_FILLER_OPENER = re.compile(
    r"^\s*(sure thing|sure|certainly|of course|absolutely|here'?s a hint|here is a hint)\b[\s!,.:]*",
    re.IGNORECASE,
)
_QUOTED_HINT = re.compile(r'["“]([^"“”]{20,})["”]')
_FACT = re.compile(
    r"\d+|\b(?:ones|tens|hundreds|thousands|smaller|bigger|larger|greater|less|more|fewer)\b",
    re.IGNORECASE,
)


def vet_hint(text: str, answer: int, banned_words: list[str]) -> str | None:
    """Return the LLM hint with any chatty wrapping removed, or None if it must not be shown.

    When the model wraps its hint in quotes (e.g. 'Here's a rewording: "..."'), only the
    longest quoted text is kept. Rejects a hint that states the correct answer as a
    standalone number or uses a banned jargon word (or its plural), so the caller falls
    back to its own hint.
    """
    quoted = _QUOTED_HINT.findall(text)
    hint = max(quoted, key=len) if quoted else text
    hint = _FILLER_OPENER.sub("", hint).strip()
    if not hint:
        return None
    if re.search(rf"(?<!\d){answer}(?!\d)", hint):
        return None
    if any(re.search(rf"\b{word}s?\b", hint, re.IGNORECASE) for word in banned_words):
        return None
    return hint[0].upper() + hint[1:]


def keeps_facts(rewrite: str, sentence: str) -> bool:
    """True when a reworded hint states exactly the sentence's numbers and column names, in order.

    This stops an LLM rewording from inventing numbers or moving a digit to the wrong column.
    """
    return [f.lower() for f in _FACT.findall(rewrite)] == [f.lower() for f in _FACT.findall(sentence)]
