from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from pydantic import BaseModel, EmailStr
from api.services.auth import hash_password, verify_password, create_token
from api.services.database import get_session, User
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(body: RegisterRequest):
    session = get_session()
    existing = session.query(User).filter_by(email=body.email).first()
    if existing:
        session.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    session.add(user)
    session.commit()

    token = create_token(user.id)
    session.close()
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    session = get_session()
    user = session.query(User).filter_by(email=form.username).first()
    session.close()

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    return {"access_token": create_token(user.id), "token_type": "bearer"}
