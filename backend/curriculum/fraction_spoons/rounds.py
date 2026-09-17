"""Dealing Fraction Spoons: a game of hands, first to 3 spoons, against Robo.

One engine round holds the whole game, since the spoon count spans hands. Each hand's pile is built
from 3 sets of equal fractions, two copies of every card, so both players can always finish a set.
Mistake cards are added from the student's starting cards, since mistakes are judged against the
Collecting card as written. Robo's starting hand gives it the level's head start; at level 1 a
mistake card fills it. The server keeps the round, so the pile and Robo's hand stay hidden.
"""

import random
from typing import Literal

from pydantic import BaseModel

from .misconceptions import Card, MisconceptionName, same_value

HAND_SIZE = 4
SETS_PER_HAND = 3
COPIES = 2
SPOONS_TO_WIN = 3
MAX_HANDS = 2 * SPOONS_TO_WIN - 1

_LEVEL_1_BASES = [(1, 2), (1, 3), (1, 4)]
_LEVEL_2_BASES = _LEVEL_1_BASES + [(2, 3), (3, 4), (1, 5), (2, 5), (3, 5), (4, 5), (1, 6), (5, 6)]
LEVEL_BASES: dict[int, list[tuple[int, int]]] = {1: _LEVEL_1_BASES, 2: _LEVEL_2_BASES, 3: _LEVEL_2_BASES}

MISTAKE_CARDS_PER_SET = {1: 2, 2: 3, 3: 4}
MISTAKE_KINDS: dict[int, list[MisconceptionName]] = {
    1: ["same_difference_means_equal"],
    2: ["same_difference_means_equal", "changed_only_top_or_bottom"],
    3: ["same_difference_means_equal", "changed_only_top_or_bottom"],
}
LEVEL_3_MULTIPLIERS = range(1, 7)
MAX_MISTAKE_BOTTOM = 100

Step = Literal["collect", "draw", "fit", "discard", "choose", "robo", "over"]


class GradedMove(BaseModel):
    """The hand's latest graded move, kept for its hint: a fit tap on one card, or a claim of the four cards."""

    kind: Literal["fit", "claim"]
    collecting: Card
    cards: list[Card]
    said_fits: bool | None = None


class Hand(BaseModel):
    """One hand: `sets` are the three values in play, in lowest terms; Robo's first card is its value.

    `reshuffles` counts trash reshuffles, which seed the next one; `claim_tried` allows one claim per turn.
    """

    sets: list[Card]
    my_cards: list[Card]
    robo_cards: list[Card]
    pile: list[Card]
    trash: list[Card] = []
    collecting: Card | None = None
    drawn: Card | None = None
    reshuffles: int = 0
    claim_tried: bool = False
    last_graded: GradedMove | None = None
    robo_discard: Card | None = None


class Round(BaseModel):
    """A whole game. Every hand it can need is dealt up front, so moves never deal; `seed` drives trash reshuffles.

    `robo_spoon_cards` shows the set Robo just won with, until the student's next move.
    """

    level: int
    hands: list[Hand]
    seed: int
    hand_number: int = 1
    my_spoons: int = 0
    robo_spoons: int = 0
    step: Step = "collect"
    robo_spoon_cards: list[Card] | None = None


def _pick_bases(level: int) -> list[tuple[int, int]]:
    """Three different bases; at level 3 the first can reach hundredths (a bottom of 2, 4 or 5)."""
    bases = LEVEL_BASES[level]
    if level < 3:
        return random.sample(bases, SETS_PER_HAND)
    hundredths = random.choice([base for base in bases if 100 % base[1] == 0])
    others = random.sample([base for base in bases if base != hundredths], SETS_PER_HAND - 1)
    return [hundredths, *others]


def _set_faces(base: tuple[int, int], level: int, hundredths: bool) -> list[Card]:
    """Levels 1-2: x1 to x4. Level 3: four different multipliers from x1 to x6, one of them a /100 face if `hundredths`."""
    top, bottom = base
    if level < 3:
        multipliers = [1, 2, 3, 4]
    elif hundredths:
        multipliers = random.sample(LEVEL_3_MULTIPLIERS, 3) + [100 // bottom]
    else:
        multipliers = random.sample(LEVEL_3_MULTIPLIERS, 4)
    return [Card(top=top * n, bottom=bottom * n) for n in multipliers]


def _mistake_candidates(face: Card, kind: MisconceptionName) -> list[Card]:
    """Same difference adds 1, 2 or 3 to top and bottom. One part doubles or triples the bottom, or doubles the top
    while it stays at most 1. Tripling and adding 3 keep an allowed card for every hand, even with the bottom cap
    (1/3 -> 1/9 when 1/6 and 2/3 are in play; 1/3 -> 4/6 when 1/2 and 3/5 are).
    """
    if kind == "same_difference_means_equal":
        return [Card(top=face.top + k, bottom=face.bottom + k) for k in (1, 2, 3)]
    candidates = [Card(top=face.top, bottom=face.bottom * n) for n in (2, 3)]
    if face.top * 2 <= face.bottom:
        candidates.append(Card(top=face.top * 2, bottom=face.bottom))
    return candidates


def _mistake_cards(level: int, my_cards: list[Card], sets: list[Card]) -> list[Card]:
    """The level's mistake cards, alternating its kinds, built from the student's starting cards.

    A candidate equal to a value in play is skipped, so every mistake card truly doesn't match any set,
    and so is one with a bottom over `MAX_MISTAKE_BOTTOM` (no 26/101 from a /100 face).
    """
    kinds = MISTAKE_KINDS[level]
    pools = {
        kind: [
            card
            for face in my_cards
            for card in _mistake_candidates(face, kind)
            if card.bottom <= MAX_MISTAKE_BOTTOM and not any(same_value(card, value) for value in sets)
        ]
        for kind in kinds
    }
    count = MISTAKE_CARDS_PER_SET[level] * SETS_PER_HAND
    return [random.choice(pools[kinds[index % len(kinds)]]) for index in range(count)]


def _take(cards: list[Card], value: Card, count: int) -> list[Card]:
    taken = [card for card in cards if same_value(card, value)][:count]
    for card in taken:
        cards.remove(card)
    return taken


def _robo_cards(level: int, set_cards: list[Card], sets: list[Card], mistakes: list[Card]) -> list[Card]:
    """Level 1: one of each value plus a mistake card. Level 2: 2 of one value, 1 of each other. Level 3: 2 of two values.

    Robo wins about 20%, 31% and 52% of games against a student who never makes a mistake (300 scripted games each).
    """
    order = random.sample(sets, SETS_PER_HAND)
    if level == 1:
        return [card for value in order for card in _take(set_cards, value, 1)] + [mistakes.pop()]
    if level == 2:
        return _take(set_cards, order[0], 2) + _take(set_cards, order[1], 1) + _take(set_cards, order[2], 1)
    return _take(set_cards, order[0], 2) + _take(set_cards, order[1], 2)


def deal_hand(level: int) -> Hand:
    """Deal one hand at `level` (1-3): the student's 4 set cards, Robo's head start, and a shuffled pile."""
    bases = _pick_bases(level)
    sets = [Card(top=top, bottom=bottom) for top, bottom in bases]
    faces = [
        card
        for index, base in enumerate(bases)
        for card in _set_faces(base, level, hundredths=level == 3 and index == 0)
    ]
    set_cards = [card.model_copy() for _ in range(COPIES) for card in faces]
    while True:
        random.shuffle(set_cards)
        my_cards = set_cards[:HAND_SIZE]
        if not all(same_value(my_cards[0], card) for card in my_cards):
            break
    set_cards = set_cards[HAND_SIZE:]
    mistakes = _mistake_cards(level, my_cards, sets)
    robo_cards = _robo_cards(level, set_cards, sets, mistakes)
    pile = set_cards + mistakes
    random.shuffle(pile)
    return Hand(sets=sets, my_cards=my_cards, robo_cards=robo_cards, pile=pile)


def new_round(level: int) -> Round:
    """Deal a game at `level` (1-3): all `MAX_HANDS` hands and a reshuffle seed, no spoons yet,
    starting with the student picking a Collecting card.
    """
    return Round(level=level, hands=[deal_hand(level) for _ in range(MAX_HANDS)], seed=random.getrandbits(32))
