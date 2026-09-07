"""
extraction/rainfall_loader.py — loads rainfall readings for a station.
Read-only, same pattern as extraction/loader.py.
"""
import pandas as pd
from extraction.db import fetch_table


def load_rainfall(station_id: str) -> pd.DataFrame:
    """Load all rainfall readings for one station."""
    rainfall = fetch_table("RainfallReading")
    rainfall = rainfall.rename(columns={
        "stationId": "station_id", "date": "timestamp", "rainfallMm": "rainfall_mm",
    })
    return rainfall[rainfall["station_id"] == station_id].copy()