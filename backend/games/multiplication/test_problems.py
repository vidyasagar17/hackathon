from .problems import (
    MAX_DIFFICULTY,
    MIN_DIFFICULTY,
    classify_difficulty,
    compute_columns,
    generate_problem,
)


def test_classify_no_carry_is_tier_one():
    columns = compute_columns(21, 3)
    assert classify_difficulty(columns) == 1


def test_classify_single_carry_is_tier_two():
    columns = compute_columns(24, 3)
    assert classify_difficulty(columns) == 2


def test_classify_cascading_carry_is_tier_three():
    columns = compute_columns(47, 6)
    assert classify_difficulty(columns) == 3


def test_classify_carry_larger_than_one_is_tier_three():
    columns = compute_columns(17, 6)
    assert classify_difficulty(columns) == 3


def test_tier_three_exactly_when_product_needs_third_digit():
    for multiplicand in range(10, 100):
        for multiplier in range(2, 10):
            tier = classify_difficulty(compute_columns(multiplicand, multiplier))
            assert (tier == 3) == (multiplicand * multiplier >= 100)


def test_carry_is_the_full_carried_amount():
    by_place = {c.place: c for c in compute_columns(47, 6)}
    assert by_place["ones"].carry == 4
    assert by_place["tens"].carry == 2


def test_multiplier_digit_sits_only_under_ones_column():
    by_place = {c.place: c for c in compute_columns(47, 6)}
    assert by_place["ones"].multiplier_digit == 6
    assert by_place["tens"].multiplier_digit is None


def test_generate_problem_respects_requested_difficulty():
    for difficulty in (1, 2, 3):
        problem = generate_problem(difficulty)
        assert problem.difficulty == difficulty
        assert classify_difficulty(problem.columns) == difficulty


def test_generated_answer_fits_answer_places():
    for difficulty in (1, 2, 3):
        for _ in range(200):
            problem = generate_problem(difficulty)
            assert problem.answer < 10 ** len(problem.answer_places)


def test_generate_problem_clamps_out_of_range_difficulty():
    assert generate_problem(0).difficulty == MIN_DIFFICULTY
    assert generate_problem(99).difficulty == MAX_DIFFICULTY
