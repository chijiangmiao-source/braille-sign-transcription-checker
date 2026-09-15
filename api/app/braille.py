"""六点盲文点位编码、格式校验与整份核对。

规则：
- a-j：1、12、14、145、15、124、1245、125、24、245
- k-t：在 a-j 点位上加点 3
- u、v、w、x、y、z：136、1236、2456、1346、13456、1356
- 每段连续数字前插入数字号 3456，1-0 依次复用 a-j 点位
- 文本中的空格编码为空点 0
"""
from __future__ import annotations

import re

_A_J = ["1", "12", "14", "145", "15", "124", "1245", "125", "24", "245"]
_K_T = ["13", "123", "134", "1345", "135", "1234", "12345", "1235", "234", "2345"]
_U_Z = ["136", "1236", "2456", "1346", "13456", "1356"]

LETTERS = "abcdefghijklmnopqrstuvwxyz"
DIGITS = "1234567890"

LETTER_DOTS = dict(zip(LETTERS, _A_J + _K_T + _U_Z))
DIGIT_DOTS = dict(zip(DIGITS, _A_J))

NUMBER_SIGN = "3456"
EMPTY_CELL = "0"

_TEXT_RE = re.compile(r"^[a-z0-9]+(?: [a-z0-9]+)*$")
_CELL_RE = re.compile(r"^[1-6]{1,6}$")


def validate_text(text: str) -> None:
    """校验门牌文本，不符合规范时抛出 ValueError。"""
    if text == "":
        raise ValueError("门牌文本不能为空")
    if text != text.strip(" "):
        raise ValueError("门牌文本不能包含首尾空格")
    if "  " in text:
        raise ValueError("门牌文本不能包含连续空格")
    if not _TEXT_RE.fullmatch(text):
        raise ValueError("门牌文本只能包含小写字母 a-z、数字 0-9 和单个空格")


def is_valid_cell(cell: str) -> bool:
    """点位单元：由 1-6 组成、无重复且严格升序；空点写作 0。"""
    if cell == EMPTY_CELL:
        return True
    if not _CELL_RE.fullmatch(cell):
        return False
    return all(a < b for a, b in zip(cell, cell[1:]))


def parse_cells(line: str) -> list[str]:
    """解析以单个空格分隔的点位记录，任一单元格式错误即整单拒绝。"""
    if line == "":
        raise ValueError("点位记录不能为空")
    cells = line.split(" ")
    if any(not is_valid_cell(cell) for cell in cells):
        raise ValueError("点位单元格式不正确：须由 1-6 组成、无重复且严格升序，空点写作 0")
    return cells


def encode_text(text: str) -> list[str]:
    """把门牌文本编码为点位单元序列。"""
    cells: list[str] = []
    in_number = False
    for ch in text:
        if "0" <= ch <= "9":
            if not in_number:
                cells.append(NUMBER_SIGN)
                in_number = True
            cells.append(DIGIT_DOTS[ch])
        else:
            in_number = False
            cells.append(EMPTY_CELL if ch == " " else LETTER_DOTS[ch])
    return cells


def check_record(text: str, cells_line: str) -> bool:
    """整份核对：编码结果与提交序列完全相同才通过。"""
    return parse_cells(cells_line) == encode_text(text)
