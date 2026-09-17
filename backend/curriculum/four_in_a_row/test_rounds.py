from .misconceptions import mistake_numbers
from .rounds import CELLS, FACTS, LINES, deal_fact, line_for, new_round, robo_cell


def test_there_are_28_lines_of_four_on_a_5_by_5_board():
    assert len(LINES) == 28
    assert [0, 1, 2, 3] in LINES and [0, 5, 10, 15] in LINES and [0, 6, 12, 18] in LINES and [4, 8, 12, 16] in LINES
    assert all(len(line) == 4 for line in LINES)


def test_level_facts_follow_the_standards():
    assert all(0 <= a <= 5 and 0 <= b <= 5 for a, b in FACTS[1])
    assert all(10 in (a, b) and 11 <= a + b <= 19 for a, b in FACTS[2])
    assert all(0 <= a <= 10 and 0 <= b <= 10 and 11 <= a + b <= 20 for a, b in FACTS[3])


def test_a_new_game_has_a_board_and_a_first_fact_with_an_open_space():
    for level in (1, 2, 3):
        for _ in range(100):
            round = new_round(level)
            assert len(round.cells) == len(round.owners) == CELLS
            assert round.owners == [None] * CELLS
            assert round.fact in FACTS[level]
            assert sum(round.fact) in round.cells
            assert round.step == "tap"


def test_every_space_is_a_level_sum_or_a_mistake_number_and_teen_boards_show_reversals():
    for level in (1, 2, 3):
        allowed = {a + b for a, b in FACTS[level]} | {n for fact in FACTS[level] for n in mistake_numbers(*fact)}
        boards = [new_round(level).cells for _ in range(200)]
        assert all(cell in allowed for cells in boards for cell in cells)
        if level > 1:
            assert sum(any(cell > 20 for cell in cells) for cells in boards) > 150


def test_dealing_is_repeatable_and_prefers_a_fact_whose_mistake_is_on_the_board():
    cells = [14, 41, 7, 7, 7] + [2] * 20
    owners = [None] * CELLS
    fact = deal_fact(cells, owners, 2, seed=5, deal=0)
    assert fact == deal_fact(cells, owners, 2, seed=5, deal=0)
    assert sum(fact) == 14 and 41 in mistake_numbers(*fact)


def test_no_fact_is_dealt_when_no_open_space_holds_a_sum():
    cells = [14] + [99] * 24
    owners = ["mine"] + [None] * 24
    assert deal_fact(cells, owners, 2, seed=1, deal=3) is None


def test_lines():
    owners = [None] * CELLS
    for cell in (6, 7, 8, 9):
        owners[cell] = "robo"
    assert line_for(owners) == ("robo", [6, 7, 8, 9])
    owners[9] = "mine"
    assert line_for(owners) is None


def test_robo_level_1_takes_the_first_open_space():
    cells = [5] * CELLS
    owners = [None] * CELLS
    owners[0] = "mine"
    assert robo_cell(cells, owners, 1, 5) == 1


def test_robo_level_2_builds_its_own_line():
    cells = [5] * CELLS
    owners = [None] * CELLS
    owners[20], owners[21] = "robo", "robo"
    assert robo_cell(cells, owners, 2, 5) == 22


def test_robo_level_3_wins_first_then_blocks_three():
    cells = [5] * CELLS
    owners = [None] * CELLS
    for cell in (0, 1, 2):
        owners[cell] = "mine"
    assert robo_cell(cells, owners, 3, 5) == 3
    for cell in (10, 11, 12):
        owners[cell] = "robo"
    assert robo_cell(cells, owners, 3, 5) == 13
