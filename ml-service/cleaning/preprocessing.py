"""
cleaning/preprocessing.py — Phase B: reusable preprocessing utilities.
These stay stable even if the backend schema changes underneath them.
"""
import pandas as pd


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.drop_duplicates(subset=["station_id", "timestamp"])
    df = df.dropna(subset=["water_level"])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["water_level"] = df["water_level"].astype(float)
    return df


def sort_by_time(df: pd.DataFrame) -> pd.DataFrame:
    return df.sort_values("timestamp").reset_index(drop=True)


def resample(df: pd.DataFrame, freq: str = "D") -> pd.DataFrame:
    """freq: pandas offset alias ('D' daily, 'H' hourly) — pick based on EDA findings."""
    df = df.set_index("timestamp")
    df = df.resample(freq).mean(numeric_only=True)
    return df.reset_index()


def normalize(df: pd.DataFrame, column: str = "water_level") -> pd.DataFrame:
    df = df.copy()
    df[f"{column}_raw"] = df[column]
    mean, std = df[column].mean(), df[column].std()
    df[column] = 0.0 if (std == 0 or pd.isna(std)) else (df[column] - mean) / std
    return df