import pytest

from .moves import computer_move, evaluate_move, visible_state
from .rounds import CELLS, FACTS, Round, new_round


def _round(**update) -> Round:
    """A level 2 board: 14 at 0-4, 41 at 5, 13 at 6, 11 everywhere else; the student's fact is 10 + 4."""
    cells = [14, 14, 14, 14, 14, 41, 13] + [11] * (CELLS - 7)
    return Round(level=2, seed=7, cells=cells, owners=[None] * CELLS, fact=(10, 4)).model_copy(update=update)


def _play(round, *moves):
    results = []
    for move in moves:
        result = evaluate_move(round, move)
        round = computer_move(result.round, round.level)
        results.append(result)
    return round, results


def test_the_page_sees_the_board_and_the_fact():
    state = visible_state(_round())
    assert state["cells"][:7] == [14, 14, 14, 14, 14, 41, 13]
    assert state["owners"] == [None] * CELLS
    assert (state["fact"], state["step"], state["tapped"], state["right_cells"]) == ([10, 4], "tap", None, None)
    assert (state["my_count"], state["robo_count"], state["winner"], state["line"]) == (0, 0, None, None)


def test_a_right_tap_covers_the_space_and_passes_the_turn():
    result = evaluate_move(_round(), {"type": "tap", "cell": 2})
    assert (result.correct, result.misconception, result.counted) == (True, None, True)
    state = visible_state(result.round)
    assert state["owners"][2] == "mine" and state["step"] == "pass"
    assert state["right_cells"] == [2] and state["my_count"] == 1


def test_a_wrong_tap_is_diagnosed_covers_nothing_and_shows_the_open_right_spaces():
    result = evaluate_move(_round(owners=["robo"] + [None] * (CELLS - 1)), {"type": "tap", "cell": 5})
    assert (result.correct, result.misconception) == (False, "reversed_teen_digits")
    state = visible_state(result.round)
    assert state["owners"][5] is None and state["tapped"] == 5
    assert state["right_cells"] == [1, 2, 3, 4]


@pytest.mark.parametrize("cell", [-1, CELLS, "3", True, None])
def test_a_tap_needs_a_space_on_the_board(cell):
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "tap", "cell": cell})


def test_a_covered_space_cannot_be_tapped_and_moves_come_in_order():
    with pytest.raises(ValueError):
        evaluate_move(_round(owners=["robo"] + [None] * (CELLS - 1)), {"type": "tap", "cell": 0})
    with pytest.raises(ValueError):
        evaluate_move(_round(), {"type": "robo_turn"})
    passed = evaluate_move(_round(), {"type": "tap", "cell": 2}).round
    with pytest.raises(ValueError):
        evaluate_move(passed, {"type": "tap", "cell": 3})


def test_robos_turn_covers_a_space_for_its_fact_and_deals_the_next_fact():
    round, (_, robo) = _play(_round(), {"type": "tap", "cell": 2}, {"type": "robo_turn"})
    assert not robo.counted
    state = visible_state(round)
    fact, cell = state["robo_last"]["fact"], state["robo_last"]["cell"]
    assert state["cells"][cell] == sum(fact) and state["owners"][cell] == "robo"
    assert tuple(fact) in FACTS[2]
    assert state["step"] == "tap" and state["fact"] is not None
    assert state["tapped"] is None and state["right_cells"] is None


def test_four_in_a_row_ends_the_game():
    owners = ["mine", "mine", "mine", None] + [None] * (CELLS - 4)
    result = evaluate_move(_round(owners=owners), {"type": "tap", "cell": 3})
    state = visible_state(computer_move(result.round, 2))
    assert (state["step"], state["winner"], state["line"]) == ("over", "mine", [0, 1, 2, 3])


def test_when_no_fact_can_be_dealt_most_spaces_wins():
    owners = ["mine", "mine", "mine", None, None, "robo"] + [None] * (CELLS - 6)
    cells = [14, 14, 14] + [99] * (CELLS - 3)
    round = _round(cells=cells, owners=owners, fact=None, step="robo")
    state = visible_state(computer_move(round, 2))
    assert (state["step"], state["winner"], state["line"]) == ("over", "mine", None)


def test_whole_games_at_every_level_finish():
    for level in (1, 2, 3):
        for _ in range(60):
            round = new_round(level)
            while round.step != "over":
                right = [i for i, cell in enumerate(round.cells) if round.owners[i] is None and cell == sum(round.fact)]
                round = computer_move(evaluate_move(round, {"type": "tap", "cell": right[0]}).round, level)
                if round.step == "pass":
                    round = computer_move(evaluate_move(round, {"type": "robo_turn"}).round, level)
            assert visible_state(round)["winner"] in ("mine", "robo", "same")
