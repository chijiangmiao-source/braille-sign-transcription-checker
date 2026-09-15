/** 六点盲文点位编码与格式校验（与 API 端规则一致，用于提交前的即时检查）。 */

const A_J = ["1", "12", "14", "145", "15", "124", "1245", "125", "24", "245"];
const K_T = ["13", "123", "134", "1345", "135", "1234", "12345", "1235", "234", "2345"];
const U_Z = ["136", "1236", "2456", "1346", "13456", "1356"];

export const NUMBER_SIGN = "3456";
export const EMPTY_CELL = "0";

export const LETTER_DOTS: Record<string, string> = {};
"abcdefghijklmnopqrstuvwxyz".split("").forEach((letter, index) => {
  LETTER_DOTS[letter] = [...A_J, ...K_T, ...U_Z][index];
});

export const DIGIT_DOTS: Record<string, string> = {};
"1234567890".split("").forEach((digit, index) => {
  DIGIT_DOTS[digit] = A_J[index];
});

const TEXT_RE = /^[a-z0-9]+(?: [a-z0-9]+)*$/;
const CELL_RE = /^[1-6]{1,6}$/;

/** 校验门牌文本，返回错误信息；合法时返回 null。 */
export function validateText(text: string): string | null {
  if (text === "") return "门牌文本不能为空";
  if (text.startsWith(" ") || text.endsWith(" ")) return "门牌文本不能包含首尾空格";
  if (text.includes("  ")) return "门牌文本不能包含连续空格";
  if (!TEXT_RE.test(text)) return "门牌文本只能包含小写字母 a-z、数字 0-9 和单个空格";
  return null;
}

/** 点位单元：由 1-6 组成、无重复且严格升序；空点写作 0。 */
export function isValidCell(cell: string): boolean {
  if (cell === EMPTY_CELL) return true;
  if (!CELL_RE.test(cell)) return false;
  for (let i = 1; i < cell.length; i += 1) {
    if (cell[i - 1] >= cell[i]) return false;
  }
  return true;
}

/** 校验点位记录行，返回错误信息；合法时返回 null。 */
export function validateCellsLine(line: string): string | null {
  if (line === "") return "点位记录不能为空";
  if (line.split(" ").some((cell) => !isValidCell(cell))) {
    return "点位单元格式不正确：须由 1-6 组成、无重复且严格升序，空点写作 0";
  }
  return null;
}

/** 解析以单个空格分隔的点位记录，格式错误时抛出异常。 */
export function parseCells(line: string): string[] {
  const error = validateCellsLine(line);
  if (error) throw new Error(error);
  return line.split(" ");
}

/** 把门牌文本编码为点位单元序列。 */
export function encodeText(text: string): string[] {
  const cells: string[] = [];
  let inNumber = false;
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") {
      if (!inNumber) {
        cells.push(NUMBER_SIGN);
        inNumber = true;
      }
      cells.push(DIGIT_DOTS[ch]);
    } else {
      inNumber = false;
      cells.push(ch === " " ? EMPTY_CELL : LETTER_DOTS[ch]);
    }
  }
  return cells;
}

/** 整份核对：编码结果与提交序列完全相同才通过。 */
export function checkCells(text: string, cellsLine: string): boolean {
  const expected = encodeText(text);
  const actual = parseCells(cellsLine);
  return expected.length === actual.length && expected.every((cell, i) => cell === actual[i]);
}
