from . import hints
from .misconceptions import diagnose_read, diagnose_write
from .rounds import Round
from .sentences import read_hint, write_hint


def test_write_hints_say_the_right_pair_across_then_up():
    assert write_hint((3, 5), (5, 3), "swapped_x_and_y") == (
        "Across comes first, then up. Your aim is 3 across and 5 up, so it is (3, 5), not (5, 3)."
    )
    assert write_hint((3, 5), (4, 6), "counted_from_one") == (
        "The corner is (0, 0), so start counting at 0 there. Your aim is 3 across and 5 up, so it is (3, 5), not (4, 6)."
    )


def test_read_hints_walk_the_call_across_then_up():
    assert read_hint((2, 4), (4, 2), "swapped_x_and_y") == "(2, 4) means 2 across first, then 4 up. You went 4 across and 2 up."
    assert read_hint((2, 4), (1, 3), "counted_from_one") == (
        "Start at the corner, (0, 0), and count from 0: (2, 4) is 2 across and 4 up. You stopped at (1, 3), 1 short each way."
    )


def test_hint_sentence_uses_the_latest_graded_move_and_is_never_reworded():
    base = Round(level=2, seed=1, my_ships=[], robo_ships=[], aim=(3, 5), written=(5, 3), robo_call=(2, 4), tapped=(1, 3))
    assert hints.hint_sentence(base.model_copy(update={"last_graded": "write"}), "swapped_x_and_y").endswith("not (5, 3).")
    assert hints.hint_sentence(base.model_copy(update={"last_graded": "read"}), "counted_from_one").endswith("1 short each way.")
    assert not hasattr(hints, "reword_hint")


def test_every_diagnosed_hint_on_the_grid_names_the_right_pair_and_the_student_answer_truthfully():
    grid = [(x, y) for x in range(6) for y in range(6)]
    for right in grid:
        for answer in grid:
            if diagnosis := diagnose_write(right, answer):
                sentence = write_hint(right, answer, diagnosis)
                assert f"{right[0]} across and {right[1]} up, so it is ({right[0]}, {right[1]})" in sentence
                assert sentence.endswith(f"not ({answer[0]}, {answer[1]}).")
            if diagnosis := diagnose_read(right, answer):
                sentence = read_hint(right, answer, diagnosis)
                assert sentence.startswith(f"({right[0]}, {right[1]})") or f"({right[0]}, {right[1]}) is" in sentence
                if diagnosis == "swapped_x_and_y":
                    assert sentence.endswith(f"You went {answer[0]} across and {answer[1]} up.")
                else:
                    assert f"You stopped at ({answer[0]}, {answer[1]})" in sentence
