from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_current_user, get_db
from app.models.department import Department
from app.models.lead import Lead
from app.models.user import User

router = APIRouter(dependencies=[Depends(get_current_user)])


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class DepartmentUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class DepartmentResponse(BaseModel):
    id: str
    name: str
    lead_count: int = 0


@router.get("/departments", response_model=list[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DepartmentResponse]:
    result = await db.execute(
        select(Department)
        .where(Department.company_id == user.company_id)
        .order_by(Department.name.asc())
    )
    departments = result.scalars().all()

    lead_counts: dict[str, int] = {}
    if departments:
        counts = await db.execute(
            select(Lead.department_id, func.count(Lead.id))
            .where(
                Lead.company_id == user.company_id,
                Lead.department_id.in_([d.id for d in departments]),
            )
            .group_by(Lead.department_id)
        )
        lead_counts = dict(counts.all())

    return [
        DepartmentResponse(id=d.id, name=d.name, lead_count=lead_counts.get(d.id, 0))
        for d in departments
    ]


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
async def create_department(
    body: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> DepartmentResponse:
    name = body.name.strip()
    existing = await db.scalar(
        select(Department).where(
            Department.company_id == user.company_id,
            func.lower(Department.name) == name.lower(),
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="A department with this name already exists")

    department = Department(company_id=user.company_id, name=name)
    db.add(department)
    await db.commit()
    await db.refresh(department)
    return DepartmentResponse(id=department.id, name=department.name)


@router.patch("/departments/{department_id}", response_model=DepartmentResponse)
async def rename_department(
    department_id: str,
    body: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> DepartmentResponse:
    department = await db.get(Department, department_id)
    if not department or department.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Department not found")

    name = body.name.strip()
    duplicate = await db.scalar(
        select(Department).where(
            Department.company_id == user.company_id,
            Department.id != department_id,
            func.lower(Department.name) == name.lower(),
        )
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="A department with this name already exists")

    department.name = name
    await db.commit()
    return DepartmentResponse(id=department.id, name=department.name)


@router.delete("/departments/{department_id}", status_code=204)
async def delete_department(
    department_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> None:
    department = await db.get(Department, department_id)
    if not department or department.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Department not found")
    await db.delete(department)
    await db.commit()