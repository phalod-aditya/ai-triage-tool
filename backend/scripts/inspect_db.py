import argparse
import json
import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).resolve().parents[1] / "triage.db"


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect the local triage database.")
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Maximum number of recent intakes to print (default: 20).",
    )
    args = parser.parse_args()

    if args.limit < 0:
        parser.error("--limit must be non-negative")
    if not DATABASE_PATH.exists():
        raise SystemExit(f"Database not found: {DATABASE_PATH}")

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        table = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'intakes'"
        ).fetchone()
        if table is None:
            raise SystemExit("The intakes table has not been initialized.")

        columns = connection.execute("PRAGMA table_info(intakes)").fetchall()
        count = connection.execute("SELECT COUNT(*) FROM intakes").fetchone()[0]
        rows = connection.execute(
            "SELECT * FROM intakes ORDER BY id DESC LIMIT ?",
            (args.limit,),
        ).fetchall()
    finally:
        connection.close()

    print(f"Database: {DATABASE_PATH}")
    print(f"Intake count: {count}")
    print("\nColumns:")
    for column in columns:
        required = "NOT NULL" if column["notnull"] else "NULL"
        primary_key = " PRIMARY KEY" if column["pk"] else ""
        print(f"- {column['name']}: {column['type']} {required}{primary_key}")

    print(f"\nMost recent intakes (limit {args.limit}):")
    if not rows:
        print("No intakes found.")
        return

    for row in rows:
        print(json.dumps(dict(row), indent=2, default=str))


if __name__ == "__main__":
    main()
