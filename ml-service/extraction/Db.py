"""
extraction/db.py — read-only PostgreSQL connection.
Never call .to_sql()/.execute(INSERT/UPDATE) through this engine.
"""
import pandas as pd
from sqlalchemy import create_engine
from utils.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


def get_engine():
    url = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    return create_engine(url)


def fetch_table(table_name: str) -> pd.DataFrame:
    engine = get_engine()
    return pd.read_sql_table(table_name, engine)