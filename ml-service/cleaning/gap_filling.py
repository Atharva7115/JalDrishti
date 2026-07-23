"""
cleaning/gap_filling.py — Phase D: reconstruct missing/anomalous readings with Prophet.
"""
import pandas as pd
from prophet import Prophet

from cleaning.anomaly_detection import detect_anomalies


def fill_missing_values(station_id: str, freq: str = "D") -> pd.DataFrame:
    df = detect_anomalies(station_id, freq=freq)

    clean = df.copy()
    clean.loc[clean["is_anomaly"], "water_level"] = None

    prophet_df = clean.rename(columns={"timestamp": "ds", "water_level": "y"})[["ds", "y"]]

    model = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)
    model.fit(prophet_df.dropna())

    forecast = model.predict(prophet_df[["ds"]])

    result = clean.copy()
    result["was_filled"] = result["water_level"].isna()
    result["water_level"] = result["water_level"].fillna(
        pd.Series(forecast["yhat"].values, index=result.index)
    )
    return result[["timestamp", "water_level", "was_filled"]]