import pandas as pd
import numpy as np
import pytest


def make_synthetic_readings(n_days=120, freq="D", station_id="TEST001",
                             base_level=10.0, trend=0.01, noise=0.3,
                             seed=42, with_anomalies=False, with_gaps=False):
    """Generate realistic-looking synthetic groundwater readings for testing,
    so tests never depend on a real database connection."""
    rng = np.random.default_rng(seed)
    timestamps = pd.date_range("2023-01-01", periods=n_days, freq=freq)
    seasonal = 1.5 * np.sin(np.linspace(0, 4 * np.pi, n_days))
    values = base_level + trend * np.arange(n_days) + seasonal + rng.normal(0, noise, n_days)

    if with_anomalies:
        anomaly_idx = rng.choice(n_days, size=max(1, n_days // 20), replace=False)
        values[anomaly_idx] += rng.choice([-8, 8], size=len(anomaly_idx))

    df = pd.DataFrame({
        "station_id": station_id,
        "timestamp": timestamps,
        "water_level": values,
    })

    if with_gaps:
        drop_idx = rng.choice(n_days, size=n_days // 10, replace=False)
        df = df.drop(index=drop_idx).reset_index(drop=True)

    return df


@pytest.fixture
def synthetic_readings():
    return make_synthetic_readings()


@pytest.fixture
def synthetic_readings_with_anomalies():
    return make_synthetic_readings(with_anomalies=True)


@pytest.fixture
def synthetic_readings_with_gaps():
    return make_synthetic_readings(with_gaps=True)


@pytest.fixture
def patch_loader(monkeypatch):
    """Monkeypatch load_station() everywhere it's imported, so tests run
    against synthetic data instead of a real database."""
    def _patch(df):
        import extraction.loader
        import cleaning.anomaly_detection
        import recharge.recharge_calculation

        def fake_load_station(station_id, use_csv=False):
            return df.copy()

        monkeypatch.setattr(extraction.loader, "load_station", fake_load_station)
        monkeypatch.setattr(cleaning.anomaly_detection, "load_station", fake_load_station)
        monkeypatch.setattr(recharge.recharge_calculation, "load_station", fake_load_station)

    return _patch