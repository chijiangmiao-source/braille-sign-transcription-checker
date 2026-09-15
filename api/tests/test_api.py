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
