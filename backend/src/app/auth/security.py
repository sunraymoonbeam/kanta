# app/core/security.py

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str | Any, expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    - subject: typically a user ID or username
    - expires_delta: optional custom expiry, defaults to ACCESS_TOKEN_EXPIRE_MINUTES
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode = {"exp": expire, "sub": str(subject)}
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return token


def decode_access_token(token: str) -> str:
    """
    Decode the JWT token, returning the 'sub' claim (subject).
    Throws HTTPException 401 if invalid or expired.
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM]
        )
        subject: str = payload.get("sub")
        if subject is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        return subject
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    Dependency to retrieve the current user (subject) from the JWT.
    Use this in your routers to protect endpoints:
        @router.get("/me")
        def me(user_id: str = Depends(get_current_user)):
            ...
    """
    return decode_access_token(token)
