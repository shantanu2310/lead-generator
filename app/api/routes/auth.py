from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserUpdateRequest,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.dependencies import (
    bearer_scheme,
    get_current_admin,
    get_current_user,
    get_db,
)
from app.models.company import Company
from app.models.lead import Lead
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


async def _user_response(db: AsyncSession, user: User) -> UserResponse:
    company_name = None
    if user.company_id:
        company = await db.get(Company, user.company_id)
        company_name = company.name if company else None
    return UserResponse(
        id=user.id,
        company_id=user.company_id,
        company_name=company_name,
        email=user.email,
        name=user.name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=str(user.created_at),
    )


def _same_company(user: User, admin: User) -> bool:
    return user.company_id == admin.company_id


@router.post("/register", response_model=UserResponse)
async def register(
    body: RegisterRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    existing = await db.scalar(select(User).where(User.email == body.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    if body.company_name:
        company = Company(name=body.company_name.strip())
        db.add(company)
        await db.flush()

        user = User(
            company_id=company.id,
            email=body.email.lower(),
            name=body.name.strip(),
            password_hash=hash_password(body.password),
            is_active=True,
            is_admin=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return await _user_response(db, user)

    if credentials:
        inviter = await get_current_user(credentials, db)
        if not inviter.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        user = User(
            company_id=inviter.company_id,
            email=body.email.lower(),
            name=body.name.strip(),
            password_hash=hash_password(body.password),
            is_active=True,
            is_admin=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return await _user_response(db, user)

    raise HTTPException(status_code=400, detail="Company name is required for signup")


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is disabled. Contact an administrator.",
        )

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=await _user_response(db, user),
    )


@router.get("/me", response_model=UserResponse)
async def me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    return await _user_response(db, user)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> list[UserResponse]:
    users = (await db.execute(
        select(User).where(User.company_id == admin.company_id).order_by(User.created_at)
    )).scalars().all()
    return [await _user_response(db, u) for u in users]


@router.patch("/users/{user_id}/active", response_model=UserResponse)
async def set_user_active(
    user_id: str,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> UserResponse:
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    user = await db.get(User, user_id)
    if not user or not _same_company(user, admin):
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return await _user_response(db, user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    body: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> UserResponse:
    user = await db.get(User, user_id)
    if not user or not _same_company(user, admin):
        raise HTTPException(status_code=404, detail="User not found")

    if body.email is not None:
        new_email = body.email.lower()
        if new_email != user.email:
            existing = await db.scalar(select(User).where(User.email == new_email))
            if existing:
                raise HTTPException(status_code=409, detail="An account with this email already exists")
            user.email = new_email

    if body.name is not None:
        user.name = body.name.strip()

    if body.password is not None:
        user.password_hash = hash_password(body.password)

    if body.is_admin is not None:
        if user_id == admin.id and not body.is_admin:
            raise HTTPException(status_code=400, detail="You cannot remove your own admin role")
        user.is_admin = body.is_admin

    await db.commit()
    await db.refresh(user)
    return await _user_response(db, user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = await db.get(User, user_id)
    if not user or not _same_company(user, admin):
        raise HTTPException(status_code=404, detail="User not found")

    await db.execute(
        update(Lead).where(
            Lead.assigned_user_id == user_id,
            Lead.company_id == admin.company_id,
        ).values(assigned_user_id=None)
    )
    email = user.email
    await db.delete(user)
    await db.commit()
    return {"deleted": True, "email": email}
