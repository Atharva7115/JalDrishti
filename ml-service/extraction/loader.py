"""
extraction/loader.py — Phase A: pulling data out of Postgres (or CSV) into DataFrames.
No cleaning, no ML here — that belongs in cleaning/ and forecasting/.
"""
import pandas as pd
from utils.config import USE_DB, COLUMN_MAP
from extraction.db import fetch_table


def load_all(use_csv: bool = False):
    """Load full Station + GroundwaterReading tables."""
    if use_csv or not USE_DB:
        stations = pd.read_csv("data/station.csv")
        readings = pd.read_csv("data/groundwater_reading.csv")
    else:
        stations = fetch_table("Station")
        readings = fetch_table("GroundwaterReading")
    readings = readings.rename(columns=COLUMN_MAP)
    return stations, readings


def load_station(station_id: str, use_csv: bool = False) -> pd.DataFrame:
    """Load all readings for a single station."""
    _, readings = load_all(use_csv=use_csv)
    return readings[readings["station_id"] == station_id].copy()