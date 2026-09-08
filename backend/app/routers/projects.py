from typing import Optional

from fastapi import APIRouter, HTTPException

from app.data.loader import load_projects, get_project_by_id

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
def list_projects(
    sector: Optional[str] = None,
    ministry: Optional[str] = None,
    risk_category: Optional[str] = None,
):
    projects = load_projects()

    if sector:
        projects = [p for p in projects if p["sector"].lower() == sector.lower()]
    if ministry:
        projects = [p for p in projects if p["ministry"].lower() == ministry.lower()]
    if risk_category:
        projects = [p for p in projects if p["risk_category"].lower() == risk_category.lower()]

    return projects


@router.get("/{project_id}")
def get_project(project_id: str):
    project = get_project_by_id(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project found with id '{project_id}'")
    return project
