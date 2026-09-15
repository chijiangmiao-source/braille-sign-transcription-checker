"""编码映射、数字段、整份核对与格式校验的单元测试。"""
import pytest

from app.braille import (
    DIGIT_DOTS,
    LETTER_DOTS,
    NUMBER_SIGN,
    check_record,
    encode_text,
    parse_cells,
    validate_text,
)


class TestLetterMapping:
    @pytest.mark.parametrize(
        "letter,dots",
        [
            ("a", "1"), ("b", "12"), ("c", "14"), ("d", "145"), ("e", "15"),
            ("f", "124"), ("g", "1245"), ("h", "125"), ("i", "24"), ("j", "245"),
            ("k", "13"), ("l", "123"), ("m", "134"), ("n", "1345"), ("o", "135"),
            ("p", "1234"), ("q", "12345"), ("r", "1235"), ("s", "234"), ("t", "2345"),
            ("u", "136"), ("v", "1236"), ("w", "2456"), ("x", "1346"),
            ("y", "13456"), ("z", "1356"),
        ],
    )
    def test_letter_mapping(self, letter, dots):
        assert LETTER_DOTS[letter] == dots
        assert encode_text(letter) == [dots]

    def test_k_to_t_is_a_to_j_plus_dot3(self):
        for offset in range(10):
            base = LETTER_DOTS[chr(ord("a") + offset)]
            raised = LETTER_DOTS[chr(ord("k") + offset)]
            assert raised == "".join(sorted(base + "3"))


class TestDigitSegments:
    @pytest.mark.parametrize(
        "digit,dots",
        [
            ("1", "1"), ("2", "12"), ("3", "14"), ("4", "145"), ("5", "15"),
            ("6", "124"), ("7", "1245"), ("8", "125"), ("9", "24"), ("0", "245"),
        ],
    )
    def test_digit_reuses_a_to_j(self, digit, dots):
        assert DIGIT_DOTS[digit] == dots
        assert encode_text(digit) == [NUMBER_SIGN, dots]

    def test_single_sign_per_digit_run(self):
        assert encode_text("123") == ["3456", "1", "12", "14"]

    def test_sign_repeated_for_each_run(self):
        assert encode_text("1b2") == ["3456", "1", "12", "3456", "12"]

    def test_space_separates_digit_runs(self):
        assert encode_text("1 2") == ["3456", "1", "0", "3456", "12"]

    def test_zero_maps_to_j(self):
        assert encode_text("0") == ["3456", "245"]


class TestSpace:
    def test_space_encodes_to_empty_cell(self):
        assert encode_text("a b") == ["1", "0", "12"]


class TestWholeRecordCheck:
    def test_exact_match_passes(self):
        assert check_record("a1b 2", "1 3456 1 12 0 3456 12") is True

    def test_wrong_cell_fails(self):
        assert check_record("a1b 2", "1 3456 1 12 0 3456 1") is False

    def test_missing_cell_fails(self):
        assert check_record("a1b 2", "1 3456 1 12 0 3456") is False

    def test_extra_cell_fails(self):
        assert check_record("a1", "1 3456 1 1") is False

    def test_missing_number_sign_fails(self):
        assert check_record("12", "1 12") is False

    def test_full_text_round_trip(self):
        text = "door 2049 room 306"
        assert check_record(text, " ".join(encode_text(text))) is True


class TestTextValidation:
    @pytest.mark.parametrize("text", ["a", "abc", "a1", "0", "a b c", "abc 123 x9"])
    def test_valid(self, text):
        validate_text(text)

    @pytest.mark.parametrize(
        "text",
        ["", " a", "a ", " a ", "  ", "a  b", "A", "aB", "a-b", "a,b", "中", "a\tb"],
    )
    def test_invalid(self, text):
        with pytest.raises(ValueError):
            validate_text(text)


class TestCellsValidation:
    @pytest.mark.parametrize(
        "line", ["0", "1", "123456", "16 26", "0 1 12 3456", "245"]
    )
    def test_valid(self, line):
        assert parse_cells(line) == line.split(" ")

    @pytest.mark.parametrize(
        "line",
        ["", "7", "11", "21", "61", "00", "01", "34567", "a", "1 2x",
         "0  1", " 1", "1 ", "1  2"],
    )
    def test_invalid(self, line):
        with pytest.raises(ValueError):
            parse_cells(line)
