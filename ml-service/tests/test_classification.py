import pytest
from classification.classification import classify_stage, classify_station


@pytest.mark.parametrize("stage_pct,expected", [
    (0, "Safe"),
    (69.9, "Safe"),
    (70, "Semi-Critical"),
    (89.9, "Semi-Critical"),
    (90, "Critical"),
    (99.9, "Critical"),
    (100, "Over-Exploited"),
    (150, "Over-Exploited"),
])
def test_classify_stage_boundaries(stage_pct, expected):
    assert classify_stage(stage_pct) == expected


def test_classify_station_uses_official_recharge_when_available(patch_loader, synthetic_readings):
    patch_loader(synthetic_readings)
    official_recharge = 1_000_000.0
    extraction = 700_000.0  # 70% of recharge -> Semi-Critical boundary

    result = classify_station(
        "TEST001", annual_extraction_m3=extraction,
        official_annual_recharge_m3=official_recharge,
    )
    assert result["recharge_source"] == "official_gsda"
    assert abs(result["stage_of_extraction_pct"] - 70.0) < 0.01
    assert result["classification"] == "Semi-Critical"


def test_classify_station_falls_back_to_estimate_without_official_data(patch_loader, synthetic_readings):
    patch_loader(synthetic_readings)
    result = classify_station("TEST001", annual_extraction_m3=100.0)
    assert result["recharge_source"] == "estimated"