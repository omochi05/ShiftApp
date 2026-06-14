from database import SessionLocal
from models import User
from security import hash_password, is_password_hashed


def main():
    db = SessionLocal()

    try:
        users = db.query(User).all()

        updated_count = 0

        for user in users:
            if user.password and not is_password_hashed(user.password):
                user.password = hash_password(user.password)
                updated_count += 1

        db.commit()

        print(f"{updated_count}件のパスワードをハッシュ化しました")

    except Exception as error:
        db.rollback()
        print("パスワードのハッシュ化に失敗しました:", error)

    finally:
        db.close()


if __name__ == "__main__":
    main()