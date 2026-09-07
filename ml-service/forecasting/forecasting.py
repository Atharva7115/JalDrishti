"""
forecasting/forecasting.py — Phase E: per-station forecasting + evaluation.

Optionally uses rainfall as an exogenous regressor (Prophet's add_regressor)
to help explain water-level changes beyond seasonality alone. Since future
rainfall is unknown, forecast-horizon rainfall values are filled with the
climatological average for that day-of-year, computed from the station's
own rainfall history -- this is a standard, defensible technique, not a
guess, but it is an approximation and should be described as such, not as
"real" future rainfall.
"""
import numpy as np
import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error

from cleaning.gap_filling import fill_missing_values


def _prepare_rainfall_regressor(rainfall_df: pd.DataFrame, all_dates: pd.DatetimeIndex) -> pd.Series:
    """
    Build a rainfall series aligned to all_dates (both historical and future).
    Historical dates use real observed rainfall; any date with no real
    observation (including all future/forecast dates) is filled with the
    climatological mean rainfall for that day-of-year, from this station's
    own history.
    """
    rainfall_df = rainfall_df.copy()
    rainfall_df["timestamp"] = pd.to_datetime(rainfall_df["timestamp"])
    rainfall_df["day_of_year"] = rainfall_df["timestamp"].dt.dayofyear
    climatology = rainfall_df.groupby("day_of_year")["rainfall_mm"].mean()
    overall_mean = rainfall_df["rainfall_mm"].mean() if len(rainfall_df) else 0.0

    observed = rainfall_df.set_index("timestamp")["rainfall_mm"]

    result = []
    for d in all_dates:
        if d in observed.index:
            result.append(observed.loc[d])
        else:
            doy = d.dayofyear
            result.append(climatology.get(doy, overall_mean))
    return pd.Series(result, index=all_dates)


def forecast_station(station_id: str, horizon_days: int = 14, freq: str = "D",
                      rainfall_df: pd.DataFrame = None) -> dict:
    """
    rainfall_df: optional DataFrame with columns ["timestamp", "rainfall_mm"]
    for this station. When provided, rainfall is added as a Prophet
    regressor. When None, forecasting behaves exactly as before (water
    level only) -- fully backward compatible.
    """
    df = fill_missing_values(station_id, freq=freq)
    prophet_df = df.rename(columns={"timestamp": "ds", "water_level": "y"})[["ds", "y"]]

    use_rainfall = rainfall_df is not None and len(rainfall_df) > 0

    split_idx = len(prophet_df) - horizon_days
    if split_idx <= 0:
        raise ValueError("Not enough history for this horizon.")

    train, test = prophet_df.iloc[:split_idx], prophet_df.iloc[split_idx:]

    def build_model():
        return Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)

    eval_model = build_model()
    if use_rainfall:
        eval_model.add_regressor("rainfall_mm")
        rain_series = _prepare_rainfall_regressor(rainfall_df, pd.DatetimeIndex(train["ds"]))
        train = train.assign(rainfall_mm=rain_series.values)
    eval_model.fit(train)

    future_eval = eval_model.make_future_dataframe(periods=len(test), freq=freq)
    if use_rainfall:
        rain_series_eval = _prepare_rainfall_regressor(rainfall_df, pd.DatetimeIndex(future_eval["ds"]))
        future_eval = future_eval.assign(rainfall_mm=rain_series_eval.values)
    forecast_eval = eval_model.predict(future_eval)
    pred_test = forecast_eval.iloc[-len(test):]["yhat"].values
    true_test = test["y"].values

    mae = mean_absolute_error(true_test, pred_test)
    rmse = np.sqrt(mean_squared_error(true_test, pred_test))

    final_model = build_model()
    if use_rainfall:
        final_model.add_regressor("rainfall_mm")
        rain_series_full = _prepare_rainfall_regressor(rainfall_df, pd.DatetimeIndex(prophet_df["ds"]))
        prophet_df_fit = prophet_df.assign(rainfall_mm=rain_series_full.values)
    else:
        prophet_df_fit = prophet_df
    final_model.fit(prophet_df_fit)

    future = final_model.make_future_dataframe(periods=horizon_days, freq=freq)
    if use_rainfall:
        rain_series_future = _prepare_rainfall_regressor(rainfall_df, pd.DatetimeIndex(future["ds"]))
        future = future.assign(rainfall_mm=rain_series_future.values)
    forecast = final_model.predict(future)
    forward = forecast.iloc[-horizon_days:][["ds", "yhat", "yhat_lower", "yhat_upper"]]

    return {
        "mae": mae,
        "rmse": rmse,
        "forecast": forward,
        "used_rainfall_regressor": use_rainfall,
    }