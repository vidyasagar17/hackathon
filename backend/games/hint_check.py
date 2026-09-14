import re

_FILLER_OPENER = re.compile(
    r"^\s*(sure thing|sure|certainly|of course|absolutely|here'?s a hint|here is a hint)\b[\s!,.:]*",
    re.IGNORECASE,
)
_QUOTED_HINT = re.compile(r'["“]([^"“”]{20,})["”]')
_FACT = re.compile(
    r"\d+|\b(?:ones|tens|hundreds|thousands|tenths?|hundredths?|thousandths?|same"
    r"|smaller|bigger|larger|greater|less|more|fewer"
    r"|carr(?:y|ies|ied|ying)|borrow(?:s|ed|ing)?)\b",
    re.IGNORECASE,
)


def vet_hint(text: str, answer: int | None, banned_words: list[str]) -> str | None:
    """Return the LLM hint with any chatty wrapping removed, or None if it must not be shown.

    When the model wraps its hint in quotes (e.g. 'Here's a rewording: "..."'), only the
    longest quoted text is kept. Rejects a hint that uses a banned jargon word (or its plural),
    or that states `answer` as a standalone number. Pass answer=None for hints shown after the
    answer is already on screen. The caller falls back to its own hint.
    """
    quoted = _QUOTED_HINT.findall(text)
    hint = max(quoted, key=len) if quoted else text
    hint = _FILLER_OPENER.sub("", hint).strip()
    if not hint:
        return None
    if answer is not None and re.search(rf"(?<!\d){answer}(?!\d)", hint):
        return None
    if any(re.search(rf"\b{word}s?\b", hint, re.IGNORECASE) for word in banned_words):
        return None
    return hint[0].upper() + hint[1:]


def _facts(text: str) -> list[str]:
    """List the text's numbers, place names, "same", comparison words, and carry/borrow verbs, in order."""
    facts = []
    for fact in _FACT.findall(text):
        word = fact.lower()
        if word.startswith("carr"):
            word = "carry"
        elif word.startswith("borrow"):
            word = "borrow"
        facts.append(word)
    return facts


def keeps_facts(rewrite: str, sentence: str) -> bool:
    """True when a reworded hint keeps the sentence's facts in the same order.

    Facts are numbers, place names (including tenths, hundredths, thousandths), "same",
    comparison words, and any form of "carry" or "borrow". This stops an LLM rewording from
    inventing numbers, moving a digit to the wrong place, inventing or dropping a comparison,
    or replacing "carry"/"borrow" with a vaguer verb.
    """
    return _facts(rewrite) == _facts(sentence)
