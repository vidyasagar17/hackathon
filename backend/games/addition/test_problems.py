from .problems import (
    MAX_DIFFICULTY,
    MIN_DIFFICULTY,
    classify_difficulty,
    compute_columns,
    generate_problem,
)


def test_classify_single_carry_is_tier_one():
    columns = compute_columns(214, 119)
    assert classify_difficulty(columns) == 1


def test_classify_cascading_carry_is_tier_two():
    columns = compute_columns(269, 156)
    assert classify_difficulty(columns) == 2


def test_classify_overflow_is_tier_three():
    columns = compute_columns(950, 950)
    assert classify_difficulty(columns) == 3


def test_generate_problem_respects_requested_difficulty():
    for difficulty in (1, 2, 3):
        problem = generate_problem(difficulty)
        assert problem.difficulty == difficulty
        assert classify_difficulty(problem.columns) == difficulty


def test_generate_problem_clamps_out_of_range_difficulty():
    assert generate_problem(0).difficulty == MIN_DIFFICULTY
    assert generate_problem(99).difficulty == MAX_DIFFICULTY
