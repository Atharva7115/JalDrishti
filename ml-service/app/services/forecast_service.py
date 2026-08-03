import pandas as pd
from app.schemas.forecast import ForecastRequest, ForecastResponse, ForecastRecord
from app.utilities.stateless_context import StatelessContext
from forecasting.forecasting import forecast_station

def run_forecasting(request: ForecastRequest) -> ForecastResponse:
    # Build DataFrame from request readings (keep null water levels)
    data = [
        {
            "station_id": "stateless_station",
            "timestamp": r.timestamp.replace(tzinfo=None),
            "water_level": r.water_level
        }
        for r in request.readings
    ]

    if not data:
        raise ValueError("No historical readings provided for forecasting.")

    df = pd.DataFrame(data)
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        if df["timestamp"].dt.tz is not None:
            df["timestamp"] = df["timestamp"].dt.tz_localize(None)

    # Run forecasting within the stateless context to intercept DB loading
    with StatelessContext(df):
        result = forecast_station(
            "stateless_station",
            horizon_days=request.horizon_days,
            freq=request.freq
        )

    mae = float(result["mae"])
    rmse = float(result["rmse"])
    forward_df = result["forecast"]

    # Map the forecasting DataFrame back to the Pydantic schema
    records = []
    for _, row in forward_df.iterrows():
        ts = row["ds"].to_pydatetime() if hasattr(row["ds"], "to_pydatetime") else pd.to_datetime(row["ds"]).to_pydatetime()
        
        records.append(
            ForecastRecord(
                timestamp=ts,
                predicted_level=float(row["yhat"]),
                yhat_lower=float(row["yhat_lower"]),
                yhat_upper=float(row["yhat_upper"])
            )
        )

    return ForecastResponse(
        mae=mae,
        rmse=rmse,
        forecast=records
    )
