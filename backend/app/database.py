from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DATABASE_PATH = Path(__file__).resolve().parents[1] / "triage.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)

    columns = {column["name"] for column in inspect(engine).get_columns("intakes")}
    statements = []
    if "budget_min" not in columns:
        statements.append("ALTER TABLE intakes ADD COLUMN budget_min INTEGER")
    if "budget_max" not in columns:
        statements.append("ALTER TABLE intakes ADD COLUMN budget_max INTEGER")
    if "timeline_min" not in columns:
        statements.append("ALTER TABLE intakes ADD COLUMN timeline_min INTEGER")
    if "timeline_max" not in columns:
        statements.append("ALTER TABLE intakes ADD COLUMN timeline_max INTEGER")
    if "timeline_unit" not in columns:
        statements.append("ALTER TABLE intakes ADD COLUMN timeline_unit VARCHAR(10)")

    if statements:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
