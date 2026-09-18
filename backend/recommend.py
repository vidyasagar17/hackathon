"""The personalized engine behind the home screen: what each game looks like for one
learner, and which single game to suggest next.

Pure and deterministic, like the misconception detectors. An LLM never picks the game
and never decides the reason -- it may only reword the sentence the reason maps to.
"""

from pydantic import BaseModel

from catalog import Band, games_in_band

# Accuracy at or above this counts as holding the skill, once the top level is reached.
STRONG_ACCURACY = 0.8
# Below this a game is still being learned, whatever level it reached.
LEARNING_ACCURACY = 0.6
# A misconception seen at least this many times is worth sending the student back for.
STICKY_COUNT = 2
# Too few answers to judge a game by its accuracy yet.
MIN_ATTEMPTS = 4


class GameProgress(BaseModel):
    """One game's record for one learner, summed over every session."""

    game: str
    total: int
    correct: int
    top_level: int
    last_played: str


class Misconception(BaseModel):
    game: str
    name: str
    count: int
    last_seen: str


class GameState(BaseModel):
    """What the home screen draws on a game's tile."""

    game: str
    mastery: str
    total: int
    correct: int
    level: int


class Recommendation(BaseModel):
    """The one game the home screen leads with, and why in a code the UI turns into words."""

    game: str
    reason: str
    misconception: str | None = None


def accuracy(progress: GameProgress) -> float:
    """Share of this game's answers that were right; 0.0 before the first answer."""
    return progress.correct / progress.total if progress.total else 0.0


def mastery_of(progress: GameProgress) -> str:
    """How far along one game is: learning, growing, or strong.

    A game with fewer than MIN_ATTEMPTS answers is always 'learning', so one lucky
    answer can't show a tile as strong.
    """
    if progress.total < MIN_ATTEMPTS or accuracy(progress) < LEARNING_ACCURACY:
        return "learning"
    if progress.top_level >= 3 and accuracy(progress) >= STRONG_ACCURACY:
        return "strong"
    return "growing"


def game_states(band: Band, progress: list[GameProgress]) -> list[GameState]:
    """One state per game shelved in the band, in catalog order.

    A game the learner has never opened is 'new' with an empty record.
    """
    played = {record.game: record for record in progress}
    states = []
    for game in games_in_band(band):
        record = played.get(game)
        if record is None:
            states.append(GameState(game=game, mastery="new", total=0, correct=0, level=1))
        else:
            states.append(
                GameState(
                    game=game,
                    mastery=mastery_of(record),
                    total=record.total,
                    correct=record.correct,
                    level=record.top_level,
                )
            )
    return states


def recommend(
    band: Band, progress: list[GameProgress], misconceptions: list[Misconception]
) -> Recommendation:
    """Pick the one game to lead the home screen with, and the reason for it.

    In order: a mistake that keeps coming back, then a game still being learned, then a
    game never tried, then the weakest finished game. Only games in the learner's own band
    are ever suggested. `misconceptions` is most recently seen first.
    """
    in_band = set(games_in_band(band))

    for mistake in misconceptions:
        if mistake.game in in_band and mistake.count >= STICKY_COUNT:
            return Recommendation(
                game=mistake.game, reason="stuck_on", misconception=mistake.name
            )

    in_band_progress = [record for record in progress if record.game in in_band]

    unfinished = [
        record for record in in_band_progress if mastery_of(record) != "strong"
    ]
    if unfinished:
        newest = max(unfinished, key=lambda record: record.last_played)
        return Recommendation(game=newest.game, reason="keep_going")

    played = {record.game for record in in_band_progress}
    for game in games_in_band(band):
        if game not in played:
            return Recommendation(game=game, reason="try_new")

    weakest = min(in_band_progress, key=accuracy)
    return Recommendation(game=weakest.game, reason="stay_sharp")
