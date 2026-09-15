/** 核对 API 客户端：请求失败或校验不通过时抛出带明确信息的 CheckError。 */

export class CheckError extends Error {}

interface CheckResponse {
  passed: boolean;
}

export async function checkRecord(text: string, cells: string): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, cells }),
    });
  } catch {
    throw new CheckError("无法连接核对服务，请检查网络后重试");
  }
  if (res.status === 422) {
    throw new CheckError(`输入未通过校验：${await readDetail(res)}`);
  }
  if (!res.ok) {
    throw new CheckError(`核对服务异常（HTTP ${res.status}）`);
  }
  const data = (await res.json()) as CheckResponse;
  return data.passed;
}

async function readDetail(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    const detail = (data as { detail?: unknown })?.detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : String(item),
      );
      return messages.join("；") || "格式不符合规范";
    }
    return typeof detail === "string" ? detail : "格式不符合规范";
  } catch {
    return "格式不符合规范";
  }
}
