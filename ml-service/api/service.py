"""
api/service.py — NOT wired up yet. This is the eventual integration point
where the backend will call your ML functions over HTTP. Leave this alone
until backend's REST APIs and schema are stable — see README_ML.md Step 6.

Sketch (uncomment and build once ready):

from fastapi import FastAPI
from cleaning.anomaly_detection import detect_anomalies
from cleaning.gap_filling import fill_missing_values
from forecasting.forecasting import forecast_station
from recharge.recharge_calculation import calculate_recharge
from classification.classification import classify_station

app = FastAPI()

@app.get("/anomalies/{station_id}")
def anomalies(station_id: str):
    return detect_anomalies(station_id).to_dict(orient="records")

@app.get("/forecast/{station_id}")
def forecast(station_id: str, horizon: int = 14):
    result = forecast_station(station_id, horizon_days=horizon)
    return {"mae": result["mae"], "rmse": result["rmse"],
            "forecast": result["forecast"].to_dict(orient="records")}
"""