"""
cleaning/anomaly_detection.py — Phase C: anomaly detection, three methods.
"""
import pandas as pd
from sklearn.ensemble import IsolationForest
from statsmodels.tsa.seasonal import STL

from extraction.loader import load_station
from cleaning.preprocessing import clean_data, sort_by_time, resample


def detect_isolation_forest(df: pd.DataFrame, contamination: float = 0.03) -> pd.Series:
    values = df[["water_level"]].fillna(df["water_level"].median())
    model = IsolationForest(contamination=contamination, random_state=42)
    return model.fit_predict(values) == -1


def detect_stl_residuals(df: pd.DataFrame, period: int = 7, z_thresh: float = 3.0) -> pd.Series:
    series = df["water_level"].interpolate().bfill().ffill()
    if len(series) < period * 2:
        return pd.Series([False] * len(df))
    resid = STL(series, period=period, robust=True).fit().resid
    z = (resid - resid.mean()) / resid.std()
    return (z.abs() > z_thresh).values


def detect_zscore(df: pd.DataFrame, z_thresh: float = 3.0) -> pd.Series:
    series = df["water_level"]
    z = (series - series.mean()) / series.std()
    return z.abs() > z_thresh


def detect_anomalies(station_id: str, freq: str = "D") -> pd.DataFrame:
    df = load_station(station_id)
    df = clean_data(df)
    df = sort_by_time(df)
    df = resample(df, freq=freq)

    df["is_anomaly_iforest"] = detect_isolation_forest(df)
    df["is_anomaly_stl"] = detect_stl_residuals(df)
    df["is_anomaly_zscore"] = detect_zscore(df)
    df["is_anomaly"] = (
        df[["is_anomaly_iforest", "is_anomaly_stl", "is_anomaly_zscore"]].sum(axis=1) >= 2
    )
    return df