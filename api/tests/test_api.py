"""API 层测试：整份核对结果与 422 校验行为。"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


class TestCheck:
    def test_pass(self):
        resp = client.post(
            "/api/check",
            json={"text": "a1b 2", "cells": "1 3456 1 12 0 3456 12"},
        )
        assert resp.status_code == 200
        assert resp.json() == {"passed": True}

    def test_fail(self):
        resp = client.post(
            "/api/check",
            json={"text": "a1b 2", "cells": "1 3456 1 12 0 3456 1"},
        )
        assert resp.status_code == 200
        assert resp.json() == {"passed": False}

    def test_response_only_contains_verdict(self):
        resp = client.post("/api/check", json={"text": "ab", "cells": "1 1"})
        assert resp.status_code == 200
        assert set(resp.json().keys()) == {"passed"}

    @pytest.mark.parametrize(
        "text", ["", " a", "a ", "a  b", "A", "a-b", "中"]
    )
    def test_invalid_text_returns_422(self, text):
        resp = client.post("/api/check", json={"text": text, "cells": "1"})
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "cells", ["", "7", "11", "21", "00", "1  2", " 1", "a"]
    )
    def test_invalid_cells_returns_422(self, cells):
        resp = client.post("/api/check", json={"text": "a", "cells": cells})
        assert resp.status_code == 422

    def test_missing_field_returns_422(self):
        assert client.post("/api/check", json={"text": "a"}).status_code == 422
        assert client.post("/api/check", json={"cells": "1"}).status_code == 422

    def test_non_string_field_returns_422(self):
        resp = client.post("/api/check", json={"text": 1, "cells": "1"})
        assert resp.status_code == 422


class TestUsage:
    def test_plain_letters(self):
        resp = client.post("/api/usage", json={"text": "abc"})
        assert resp.status_code == 200
        assert resp.json() == {"cells": 3, "dots": 5, "empty_cells": 0, "number_signs": 0}

    def test_digit_run_and_space(self):
        resp = client.post("/api/usage", json={"text": "ab 12"})
        assert resp.status_code == 200
        assert resp.json() == {"cells": 6, "dots": 10, "empty_cells": 1, "number_signs": 1}

    def test_number_sign_per_digit_run(self):
        resp = client.post("/api/usage", json={"text": "1b2"})
        assert resp.status_code == 200
        assert resp.json() == {"cells": 5, "dots": 13, "empty_cells": 0, "number_signs": 2}

    def test_response_only_contains_four_non_negative_ints(self):
        resp = client.post("/api/usage", json={"text": "door 2049"})
        assert resp.status_code == 200
        body = resp.json()
        assert set(body.keys()) == {"cells", "dots", "empty_cells", "number_signs"}
        assert all(isinstance(value, int) and value >= 0 for value in body.values())

    @pytest.mark.parametrize(
        "text,reason",
        [
            ("", "不能为空"),
            (" a", "首尾空格"),
            ("a ", "首尾空格"),
            ("a  b", "连续空格"),
            ("A", "小写字母"),
            ("a-b", "小写字母"),
            ("中", "小写字母"),
        ],
    )
    def test_invalid_text_returns_422_with_reason(self, text, reason):
        resp = client.post("/api/usage", json={"text": text})
        assert resp.status_code == 422
        assert reason in str(resp.json()["detail"])

    def test_missing_field_returns_422(self):
        assert client.post("/api/usage", json={}).status_code == 422

    def test_non_string_field_returns_422(self):
        resp = client.post("/api/usage", json={"text": 1})
        assert resp.status_code == 422
