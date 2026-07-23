"""
utils/config.py — single source of truth for env vars and column-name mapping.
If the backend changes a column name or table name, this is the only file to edit.
"""
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "jaldrishti")
DB_USER = os.getenv("DB_USER", "readonly_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# Set to False to work from CSV exports in data/ instead of Postgres
USE_DB = True

# Backend column names -> internal names used across ml-service
COLUMN_MAP = {
    "stationId": "station_id",
    "timestamp": "timestamp",
    "rawWaterLevel": "water_level",
}