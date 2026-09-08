"""
backend/app/models.py — Pydantic models matching docs/CONTRACT.md exactly. Nothing downstream
should invent field names that aren't in the contract.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class Project(BaseModel):
    project_id: str
    project_name: str
    ministry: str
    sector: str
    original_cost_cr: float
    revised_cost_cr: float
    expenditure_cr: float
    physical_progress_pct: float = Field(ge=0, le=100)
    status: str  # "On Track" | "Delayed" | "Critical" | "Completed"
    cost_overrun_pct: float
    predicted_cost_overrun_pct: float
    predicted_time_overrun_days: float
    risk_score: float = Field(ge=0, le=100)
    risk_category: str  # "Low" | "Medium" | "High" | "Critical"
    top_risk_factors: List[str]
    revised_cost_missing: bool
    possible_outlier: bool
    date_is_synthetic: bool


class PredictRequest(BaseModel):
    original_cost_cr: float
    sector: str
    ministry: str
    physical_progress_pct: Optional[float] = None
    # optional what-if input from the frontend slider — additional assumed delay in months
    additional_delay_months: Optional[float] = 0


class PredictResponse(BaseModel):
    original_cost_cr: float
    sector: str
    ministry: str
    physical_progress_pct: Optional[float] = None
    additional_delay_months: Optional[float] = 0
    cost_overrun_pct: float
    predicted_cost_overrun_pct: float
    predicted_time_overrun_days: float
    risk_score: float
    risk_category: str
    top_risk_factors: List[str]


class ErrorResponse(BaseModel):
    detail: str
