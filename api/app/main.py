"""门牌盲文点位核对 API。"""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, field_validator

from .braille import check_record, parse_cells, validate_text

app = FastAPI(title="门牌盲文点位核对", version="1.0.0")


class CheckRequest(BaseModel):
    text: str
    cells: str

    @field_validator("text")
    @classmethod
    def _validate_text(cls, value: str) -> str:
        validate_text(value)
        return value

    @field_validator("cells")
    @classmethod
    def _validate_cells(cls, value: str) -> str:
        parse_cells(value)
        return value


class CheckResponse(BaseModel):
    passed: bool


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/check", response_model=CheckResponse)
def check(req: CheckRequest) -> CheckResponse:
    """整份核对，仅返回通过或不通过，不定位差异位置。"""
    return CheckResponse(passed=check_record(req.text, req.cells))
