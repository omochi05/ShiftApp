import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base

# backend/.env を確実に読む
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME")

if not DB_USER:
    raise ValueError("DB_USER が .env にありません")
if not DB_PASSWORD:
    raise ValueError("DB_PASSWORD が .env にありません")
if not DB_HOST:
    raise ValueError("DB_HOST が .env にありません")
if not DB_NAME:
    raise ValueError("DB_NAME が .env にありません")

print("DB_HOST =", DB_HOST)

url = URL.create(
    drivername="postgresql+psycopg2",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT),
    database=DB_NAME,
    query={"sslmode": "require"},
)

engine = create_engine(url)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()