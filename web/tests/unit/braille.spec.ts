import { describe, expect, it } from "vitest";
import {
  DIGIT_DOTS,
  LETTER_DOTS,
  NUMBER_SIGN,
  checkCells,
  encodeText,
  isValidCell,
  parseCells,
  validateCellsLine,
  validateText,
} from "../../src/lib/braille";

describe("字母点位映射", () => {
  const cases: Array<[string, string]> = [
    ["a", "1"], ["b", "12"], ["c", "14"], ["d", "145"], ["e", "15"],
    ["f", "124"], ["g", "1245"], ["h", "125"], ["i", "24"], ["j", "245"],
    ["k", "13"], ["l", "123"], ["m", "134"], ["n", "1345"], ["o", "135"],
    ["p", "1234"], ["q", "12345"], ["r", "1235"], ["s", "234"], ["t", "2345"],
    ["u", "136"], ["v", "1236"], ["w", "2456"], ["x", "1346"],
    ["y", "13456"], ["z", "1356"],
  ];

  it.each(cases)("%s -> %s", (letter, dots) => {
    expect(LETTER_DOTS[letter]).toBe(dots);
    expect(encodeText(letter)).toEqual([dots]);
  });

  it("k-t 在 a-j 上加点 3", () => {
    for (let offset = 0; offset < 10; offset += 1) {
      const base = LETTER_DOTS[String.fromCharCode(97 + offset)];
      const raised = LETTER_DOTS[String.fromCharCode(107 + offset)];
      expect(raised).toBe([...(base + "3")].sort().join(""));
    }
  });
});

describe("数字段编码", () => {
  const digitCases: Array<[string, string]> = [
    ["1", "1"], ["2", "12"], ["3", "14"], ["4", "145"], ["5", "15"],
    ["6", "124"], ["7", "1245"], ["8", "125"], ["9", "24"], ["0", "245"],
  ];

  it.each(digitCases)("数字 %s 复用 a-j 点位 %s", (digit, dots) => {
    expect(DIGIT_DOTS[digit]).toBe(dots);
    expect(encodeText(digit)).toEqual([NUMBER_SIGN, dots]);
  });

  it("每段连续数字前只插入一个 3456", () => {
    expect(encodeText("123")).toEqual(["3456", "1", "12", "14"]);
  });

  it("字母隔开的数字段各自插入 3456", () => {
    expect(encodeText("1b2")).toEqual(["3456", "1", "12", "3456", "12"]);
  });

  it("空格隔开的数字段各自插入 3456", () => {
    expect(encodeText("1 2")).toEqual(["3456", "1", "0", "3456", "12"]);
  });

  it("文本空格编码为 0", () => {
    expect(encodeText("a b")).toEqual(["1", "0", "12"]);
  });
});

describe("整份核对", () => {
  it("编码结果与提交序列完全相同才通过", () => {
    expect(checkCells("a1b 2", "1 3456 1 12 0 3456 12")).toBe(true);
  });

  it("点位不一致不通过", () => {
    expect(checkCells("a1b 2", "1 3456 1 12 0 3456 1")).toBe(false);
  });

  it("少一个单元不通过", () => {
    expect(checkCells("a1b 2", "1 3456 1 12 0 3456")).toBe(false);
  });

  it("多一个单元不通过", () => {
    expect(checkCells("a1", "1 3456 1 1")).toBe(false);
  });

  it("缺数字号不通过", () => {
    expect(checkCells("12", "1 12")).toBe(false);
  });

  it("长文本往返一致", () => {
    const text = "door 2049 room 306";
    expect(checkCells(text, encodeText(text).join(" "))).toBe(true);
  });
});

describe("门牌文本校验", () => {
  it.each(["a", "abc", "a1", "0", "a b c", "abc 123 x9"])("合法：%s", (text) => {
    expect(validateText(text)).toBeNull();
  });

  it.each(["", " a", "a ", " a ", "  ", "a  b", "A", "aB", "a-b", "a,b", "中", "a\tb"])(
    "非法：%j",
    (text) => {
      expect(validateText(text)).not.toBeNull();
    },
  );
});

describe("点位单元校验", () => {
  it.each(["0", "1", "123456", "16", "245"])("合法单元：%s", (cell) => {
    expect(isValidCell(cell)).toBe(true);
  });

  it.each(["", "7", "11", "21", "61", "00", "01", "34567", "a"])("非法单元：%j", (cell) => {
    expect(isValidCell(cell)).toBe(false);
  });

  it.each(["0", "1", "0 1 12 3456", "16 26"])("合法记录：%s", (line) => {
    expect(validateCellsLine(line)).toBeNull();
    expect(parseCells(line)).toEqual(line.split(" "));
  });

  it.each(["", "7", "11", "21", "0  1", " 1", "1 ", "1  2", "a"])("非法记录：%j", (line) => {
    expect(validateCellsLine(line)).not.toBeNull();
    expect(() => parseCells(line)).toThrow();
  });
});
