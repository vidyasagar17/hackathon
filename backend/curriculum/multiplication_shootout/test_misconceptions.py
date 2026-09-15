"""Hand-worked fact errors from LeFevre et al. (1996) and Campbell (1997)."""

from .misconceptions import diagnose_product, diagnose_quotient


def test_a_correct_product_has_no_misconception():
    assert diagnose_product(6, 7, 42) is None


def test_an_unrecognized_product_has_no_misconception():
    assert diagnose_product(6, 7, 43) is None


def test_times_zero_is_the_other_number():
    assert diagnose_product(5, 0, 5) == "times_zero_is_the_other_number"


def test_added_instead_of_multiplied():
    assert diagnose_product(4, 6, 10) == "added_instead_of_multiplied"


def test_neighboring_fact_one_group_too_many():
    assert diagnose_product(6, 7, 48) == "neighboring_fact"


def test_neighboring_fact_one_group_too_few_in_the_other_operand():
    assert diagnose_product(6, 7, 35) == "neighboring_fact"


def test_zero_wins_when_one_step_away_and_adding_give_the_same_answer():
    assert diagnose_product(0, 7, 7) == "times_zero_is_the_other_number"


def test_adding_wins_when_one_step_away_gives_the_same_answer_on_a_times_one_fact():
    assert diagnose_product(1, 7, 8) == "added_instead_of_multiplied"


def test_adding_wins_when_one_step_away_gives_the_same_answer_on_a_small_fact():
    assert diagnose_product(3, 3, 6) == "added_instead_of_multiplied"


def test_a_correct_quotient_has_no_misconception():
    assert diagnose_quotient(56, 8, 7) is None


def test_one_group_off():
    assert diagnose_quotient(56, 8, 6) == "one_group_off"
    assert diagnose_quotient(56, 8, 8) == "one_group_off"


def test_an_unrecognized_quotient_has_no_misconception():
    assert diagnose_quotient(56, 8, 448) is None


def test_every_product_error_only_fires_where_its_rule_applies():
    for a in range(10):
        for b in range(10):
            for answer in range(101):
                name = diagnose_product(a, b, answer)
                if name is None:
                    continue
                assert answer != a * b
                if name == "times_zero_is_the_other_number":
                    assert 0 in (a, b) and answer == a + b
                elif name == "added_instead_of_multiplied":
                    assert answer == a + b
                elif name == "neighboring_fact":
                    assert answer in (a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b)


def test_every_quotient_error_is_one_away_from_the_quotient():
    for divisor in range(1, 10):
        for quotient in range(1, 10):
            for answer in range(101):
                name = diagnose_quotient(divisor * quotient, divisor, answer)
                if name is not None:
                    assert abs(answer - quotient) == 1
