from passlib.context import CryptContext


password_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False

    # すでにbcrypt化されている場合
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
        return password_context.verify(plain_password, hashed_password)

    # 移行中だけ、古い平文パスワードもログイン可能にする
    return plain_password == hashed_password


def is_password_hashed(password: str) -> bool:
    if not password:
        return False

    return password.startswith("$2b$") or password.startswith("$2a$")