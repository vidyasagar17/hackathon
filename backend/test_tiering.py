from tiering import TierAttempt, correct_in_a_row, next_tier


def _attempt(difficulty: int, correct: bool, misconception: str | None = None) -> TierAttempt:
    return TierAttempt(difficulty=difficulty, correct=correct, misconception=misconception)


def test_no_history_starts_at_tier_one():
    assert next_tier([]) == 1


def test_three_correct_in_a_row_escalates():
    history = [_attempt(1, True), _attempt(1, True), _attempt(1, True)]
    assert next_tier(history) == 2


def test_two_correct_in_a_row_does_not_escalate():
    history = [_attempt(1, False), _attempt(1, True), _attempt(1, True)]
    assert next_tier(history) == 1


def test_same_misconception_twice_in_a_row_deescalates():
    history = [
        _attempt(2, False, "no_carry"),
        _attempt(2, False, "no_carry"),
    ]
    assert next_tier(history) == 1


def test_different_misconceptions_in_a_row_does_not_deescalate():
    history = [
        _attempt(2, False, "no_carry"),
        _attempt(2, False, "carry_always"),
    ]
    assert next_tier(history) == 2


def test_escalation_caps_at_max_tier():
    history = [_attempt(3, True), _attempt(3, True), _attempt(3, True)]
    assert next_tier(history) == 3


def test_deescalation_floors_at_min_tier():
    history = [
        _attempt(1, False, "no_carry"),
        _attempt(1, False, "no_carry"),
    ]
    assert next_tier(history) == 1


def test_only_considers_run_at_current_tier():
    history = [
        _attempt(1, True),
        _attempt(1, True),
        _attempt(2, True),
        _attempt(2, True),
    ]
    assert next_tier(history) == 2


def test_correct_in_a_row_with_no_history_is_zero():
    assert correct_in_a_row([], 1) == 0


def test_correct_in_a_row_counts_recent_correct_answers_at_the_tier():
    history = [_attempt(1, False), _attempt(1, True), _attempt(1, True)]
    assert correct_in_a_row(history, 1) == 2


def test_correct_in_a_row_resets_after_a_miss():
    history = [_attempt(2, True), _attempt(2, True), _attempt(2, False, "no_carry")]
    assert correct_in_a_row(history, 2) == 0


def test_correct_in_a_row_starts_at_zero_after_moving_up():
    history = [_attempt(1, True), _attempt(1, True), _attempt(1, True)]
    assert correct_in_a_row(history, next_tier(history)) == 0


def test_correct_in_a_row_caps_at_three_on_the_top_tier():
    history = [_attempt(3, True) for _ in range(5)]
    assert correct_in_a_row(history, 3) == 3
