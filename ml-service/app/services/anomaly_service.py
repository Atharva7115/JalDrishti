import pandas as pd
from typing import List
from app.schemas.anomaly import AnomalyRequest, AnomalyResponse, AnomalyRecord
from app.utilities.stateless_context import StatelessContext
from cleaning.anomaly_detection import detect_anomalies

def run_anomaly_detection(request: AnomalyRequest) -> AnomalyResponse:
    # Build DataFrame from request readings
    data = [
        {
            "station_id": "stateless_station",
            "timestamp": r.timestamp.replace(tzinfo=None),
            "water_level": r.water_level
        }
        for r in request.readings if r.water_level is not None
    ]
    
    if not data:
        return AnomalyResponse(anomalies=[])

    df = pd.DataFrame(data)
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        if df["timestamp"].dt.tz is not None:
            df["timestamp"] = df["timestamp"].dt.tz_localize(None)

    # Run anomaly detection within the stateless context to intercept DB loading
    with StatelessContext(df):
        result_df = detect_anomalies("stateless_station", freq=request.freq)

    # Map the resulting DataFrame back to the Pydantic schema
    records = []
    for _, row in result_df.iterrows():
        # Ensure timestamp is converted to a python datetime object
        ts = row["timestamp"].to_pydatetime() if hasattr(row["timestamp"], "to_pydatetime") else pd.to_datetime(row["timestamp"]).to_pydatetime()
        
        records.append(
            AnomalyRecord(
                timestamp=ts,
                water_level=float(row["water_level"]),
                is_anomaly_iforest=bool(row["is_anomaly_iforest"]),
                is_anomaly_stl=bool(row["is_anomaly_stl"]),
                is_anomaly_zscore=bool(row["is_anomaly_zscore"]),
                is_anomaly=bool(row["is_anomaly"])
            )
        )

    return AnomalyResponse(anomalies=records)
