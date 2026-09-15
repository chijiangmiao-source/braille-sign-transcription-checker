import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckError, checkRecord, fetchUsage } from "../../src/lib/api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchMock(impl: () => Promise<Response>) {
  const mock = vi.fn((..._args: unknown[]) => impl());
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkRecord", () => {
  it("整份通过返回 true，且请求体正确", async () => {
    const mock = fetchMock(async () => jsonResponse(200, { passed: true }));
    await expect(checkRecord("a1", "1 3456 1")).resolves.toBe(true);
    expect(mock).toHaveBeenCalledWith(
      "/api/check",
      expect.objectContaining({ method: "POST" }),
    );
    const init = mock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ text: "a1", cells: "1 3456 1" });
  });

  it("整份不通过返回 false", async () => {
    fetchMock(async () => jsonResponse(200, { passed: false }));
    await expect(checkRecord("a1", "1 3456 12")).resolves.toBe(false);
  });

  it("422 抛出带服务端明细的 CheckError", async () => {
    fetchMock(async () =>
      jsonResponse(422, {
        detail: [{ loc: ["body", "text"], msg: "Value error, 门牌文本不能为空", type: "value_error" }],
      }),
    );
    await expect(checkRecord("", "1")).rejects.toThrow(CheckError);
    await expect(checkRecord("", "1")).rejects.toThrow(/门牌文本不能为空/);
  });

  it("其他 HTTP 错误抛出带状态码的 CheckError", async () => {
    fetchMock(async () => jsonResponse(500, {}));
    await expect(checkRecord("a", "1")).rejects.toThrow(/HTTP 500/);
  });

  it("网络异常抛出明确错误", async () => {
    const mock = vi.fn(() => Promise.reject(new TypeError("fetch failed")));
    vi.stubGlobal("fetch", mock);
    await expect(checkRecord("a", "1")).rejects.toThrow(/无法连接核对服务/);
  });
});

describe("fetchUsage", () => {
  it("返回四项统计，且请求体正确", async () => {
    const stats = { cells: 6, dots: 10, empty_cells: 1, number_signs: 1 };
    const mock = fetchMock(async () => jsonResponse(200, stats));
    await expect(fetchUsage("ab 12")).resolves.toEqual(stats);
    expect(mock).toHaveBeenCalledWith(
      "/api/usage",
      expect.objectContaining({ method: "POST" }),
    );
    const init = mock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ text: "ab 12" });
  });

  it("422 抛出带服务端明细的 CheckError", async () => {
    fetchMock(async () =>
      jsonResponse(422, {
        detail: [{ loc: ["body", "text"], msg: "Value error, 门牌文本不能包含连续空格", type: "value_error" }],
      }),
    );
    await expect(fetchUsage("a  b")).rejects.toThrow(CheckError);
    await expect(fetchUsage("a  b")).rejects.toThrow(/门牌文本不能包含连续空格/);
  });

  it("其他 HTTP 错误抛出带状态码的 CheckError", async () => {
    fetchMock(async () => jsonResponse(500, {}));
    await expect(fetchUsage("abc")).rejects.toThrow(/HTTP 500/);
  });

  it("网络异常抛出明确错误", async () => {
    const mock = vi.fn(() => Promise.reject(new TypeError("fetch failed")));
    vi.stubGlobal("fetch", mock);
    await expect(fetchUsage("abc")).rejects.toThrow(/无法连接核算服务/);
  });
});
