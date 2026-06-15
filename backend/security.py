import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext


SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    password = str(password or "")

    if len(password.encode("utf-8")) > 72:
        raise ValueError("パスワードは72バイト以内にしてください")

    return pwd_context.hash(password)


def is_password_hashed(password: str | None) -> bool:
    if not password:
        return False

    password = str(password)

    return (
        password.startswith("$2b$")
        or password.startswith("$2a$")
        or password.startswith("$2y$")
    )


def verify_password(plain_password: str, stored_password: str) -> bool:
    plain_password = str(plain_password or "")
    stored_password = str(stored_password or "")

    if not plain_password or not stored_password:
        return False

    try:
        # bcryptは72バイト超えで例外になるので、先にFalseで止める
        if len(plain_password.encode("utf-8")) > 72:
            return False

        if is_password_hashed(stored_password):
            return pwd_context.verify(plain_password, stored_password)

        # 旧データ対策：平文で保存されていたパスワードも一時的に認証する
        return plain_password == stored_password

    except Exception as error:
        print("パスワード検証エラー:", repr(error))
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as error:
        print("JWTデコード失敗:", repr(error))
        return None