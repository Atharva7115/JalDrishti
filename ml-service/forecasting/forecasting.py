"""
forecasting/forecasting.py — Phase E: per-station forecasting + evaluation.
"""
import numpy as np
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error

from cleaning.gap_filling import fill_missing_values


def forecast_station(station_id: str, horizon_days: int = 14, freq: str = "D") -> dict:
    df = fill_missing_values(station_id, freq=freq)
    prophet_df = df.rename(columns={"timestamp": "ds", "water_level": "y"})[["ds", "y"]]

    split_idx = len(prophet_df) - horizon_days
    if split_idx <= 0:
        raise ValueError("Not enough history for this horizon.")

    train, test = prophet_df.iloc[:split_idx], prophet_df.iloc[split_idx:]

    eval_model = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)
    eval_model.fit(train)
    future_eval = eval_model.make_future_dataframe(periods=len(test), freq=freq)
    forecast_eval = eval_model.predict(future_eval)
    pred_test = forecast_eval.iloc[-len(test):]["yhat"].values
    true_test = test["y"].values

    mae = mean_absolute_error(true_test, pred_test)
    rmse = np.sqrt(mean_squared_error(true_test, pred_test))

    final_model = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)
    final_model.fit(prophet_df)
    future = final_model.make_future_dataframe(periods=horizon_days, freq=freq)
    forecast = final_model.predict(future)
    forward = forecast.iloc[-horizon_days:][["ds", "yhat", "yhat_lower", "yhat_upper"]]

    return {"mae": mae, "rmse": rmse, "forecast": forward}