from cleaning.anomaly_detection import detect_anomalies


def test_detect_anomalies_returns_expected_columns(patch_loader, synthetic_readings):
    patch_loader(synthetic_readings)
    result = detect_anomalies("TEST001", freq="D")
    for col in ["is_anomaly", "is_anomaly_iforest", "is_anomaly_stl", "is_anomaly_zscore"]:
        assert col in result.columns


def test_detect_anomalies_flags_injected_anomalies(patch_loader, synthetic_readings_with_anomalies):
    patch_loader(synthetic_readings_with_anomalies)
    result = detect_anomalies("TEST001", freq="D")
    # We deliberately injected large spikes -- at least some should be caught
    assert result["is_anomaly"].sum() > 0


def test_detect_anomalies_clean_data_has_few_anomalies(patch_loader, synthetic_readings):
    """A smooth synthetic series with no injected anomalies should not
    flag a large fraction of points as anomalous."""
    patch_loader(synthetic_readings)
    result = detect_anomalies("TEST001", freq="D")
    anomaly_rate = result["is_anomaly"].mean()
    assert anomaly_rate < 0.15  # generous upper bound, not zero, since IForest has some false-positive rate