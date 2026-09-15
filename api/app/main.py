"""门牌盲文点位核对 API。"""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field, field_validator

from .braille import check_record, parse_cells, usage_stats, validate_text

app = FastAPI(title="门牌盲文点位核对", version="1.1.0")


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


class UsageRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def _validate_text(cls, value: str) -> str:
        validate_text(value)
        return value


class UsageResponse(BaseModel):
    """用量核算结果：仅四项非负整数。"""

    cells: int = Field(ge=0)
    dots: int = Field(ge=0)
    empty_cells: int = Field(ge=0)
    number_signs: int = Field(ge=0)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/check", response_model=CheckResponse)
def check(req: CheckRequest) -> CheckResponse:
    """整份核对，仅返回通过或不通过，不定位差异位置。"""
    return CheckResponse(passed=check_record(req.text, req.cells))


@app.post("/api/usage", response_model=UsageResponse)
def usage(req: UsageRequest) -> UsageResponse:
    """用量核算：根据门牌文本返回单元、凸点、空点、数字号四项统计。"""
    return UsageResponse(**usage_stats(req.text))
