from .problems import (
    MAX_DIFFICULTY,
    MIN_DIFFICULTY,
    classify_difficulty,
    generate_problem,
)


def test_classify_single_digit_quotient_is_tier_one():
    assert classify_difficulty(12, 3) == 1


def test_classify_two_digit_no_regroup_is_tier_two():
    assert classify_difficulty(84, 4) == 2


def test_classify_regroup_needed_is_tier_three():
    assert classify_difficulty(78, 3) == 3


def test_generate_problem_respects_requested_difficulty():
    for difficulty in (1, 2, 3):
        problem = generate_problem(difficulty)
        assert problem.difficulty == difficulty
        assert classify_difficulty(problem.dividend, problem.divisor) == difficulty


def test_generate_problem_is_exact_division():
    for difficulty in (1, 2, 3):
        problem = generate_problem(difficulty)
        assert problem.dividend == problem.divisor * problem.answer


def test_generate_problem_clamps_out_of_range_difficulty():
    assert generate_problem(0).difficulty == MIN_DIFFICULTY
    assert generate_problem(99).difficulty == MAX_DIFFICULTY
