"""整栈一次性验收：直连 API，并经 Web 反向代理完成页面联调链路的核对。

通过环境变量 API_URL / WEB_URL 指向运行中的服务，全部检查通过后以 0 退出。
"""
from __future__ import annotations

import os
import re
import sys
import time

import httpx

API_URL = os.environ.get("API_URL", "http://localhost:8000").rstrip("/")
WEB_URL = os.environ.get("WEB_URL", "http://localhost:8080").rstrip("/")

PASS_CASE = {"text": "a1b 2", "cells": "1 3456 1 12 0 3456 12"}
FAIL_CASE = {"text": "a1b 2", "cells": "1 3456 1 12 0 3456 1"}
INVALID_TEXT_CASE = {"text": "A1", "cells": "1"}
INVALID_CELLS_CASE = {"text": "a1", "cells": "1 3456 21"}

failures: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def wait_ready(url: str, attempts: int = 30) -> bool:
    for _ in range(attempts):
        try:
            if httpx.get(url, timeout=2).status_code == 200:
                return True
        except httpx.HTTPError:
            pass
        time.sleep(1)
    return False


def main() -> int:
    check("API 健康检查就绪", wait_ready(f"{API_URL}/api/health"))
    check("Web 页面就绪", wait_ready(f"{WEB_URL}/"))
    if failures:
        return 1

    resp = httpx.post(f"{API_URL}/api/check", json=PASS_CASE, timeout=5)
    check("API 整份通过", resp.status_code == 200 and resp.json().get("passed") is True,
          f"HTTP {resp.status_code} {resp.text}")

    resp = httpx.post(f"{API_URL}/api/check", json=FAIL_CASE, timeout=5)
    check("API 整份不通过", resp.status_code == 200 and resp.json().get("passed") is False,
          f"HTTP {resp.status_code} {resp.text}")

    resp = httpx.post(f"{API_URL}/api/check", json=INVALID_TEXT_CASE, timeout=5)
    check("API 非法文本返回 422", resp.status_code == 422, f"HTTP {resp.status_code}")

    resp = httpx.post(f"{API_URL}/api/check", json=INVALID_CELLS_CASE, timeout=5)
    check("API 非法点位返回 422", resp.status_code == 422, f"HTTP {resp.status_code}")

    page = httpx.get(f"{WEB_URL}/", timeout=5)
    check("Web 页面包含应用挂载点", page.status_code == 200 and 'id="app"' in page.text)
    asset = re.search(r'src="(/assets/[^"]+\.js)"', page.text)
    if check("Web 页面引用构建产物", asset is not None):
        asset_resp = httpx.get(f"{WEB_URL}{asset.group(1)}", timeout=5)
        check("构建产物可访问", asset_resp.status_code == 200)

    resp = httpx.post(f"{WEB_URL}/api/check", json=PASS_CASE, timeout=5)
    check("经 Web 代理整份通过", resp.status_code == 200 and resp.json().get("passed") is True,
          f"HTTP {resp.status_code} {resp.text}")

    resp = httpx.post(f"{WEB_URL}/api/check", json=FAIL_CASE, timeout=5)
    check("经 Web 代理整份不通过", resp.status_code == 200 and resp.json().get("passed") is False,
          f"HTTP {resp.status_code} {resp.text}")

    resp = httpx.post(f"{WEB_URL}/api/check", json=INVALID_TEXT_CASE, timeout=5)
    check("经 Web 代理非法输入返回 422", resp.status_code == 422, f"HTTP {resp.status_code}")

    print(f"\n验收结果：{'全部通过' if not failures else f'{len(failures)} 项失败'}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
