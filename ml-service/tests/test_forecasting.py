import pytest
from forecasting.forecasting import forecast_station


def test_forecast_station_returns_metrics_and_forecast(patch_loader, synthetic_readings):
    patch_loader(synthetic_readings)
    result = forecast_station("TEST001", horizon_days=14, freq="D")
    assert "mae" in result and "rmse" in result
    assert result["mae"] >= 0
    assert result["rmse"] >= 0
    assert len(result["forecast"]) == 14


def test_forecast_station_raises_on_insufficient_history(patch_loader):
    from tests.conftest import make_synthetic_readings
    short_df = make_synthetic_readings(n_days=5)
    patch_loader(short_df)
    with pytest.raises(ValueError):
        forecast_station("TEST001", horizon_days=14, freq="D")