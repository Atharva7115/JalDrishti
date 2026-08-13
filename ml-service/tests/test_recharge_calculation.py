from recharge.recharge_calculation import calculate_recharge


def test_recharge_uses_estimate_when_no_official_data(patch_loader, synthetic_readings):
    patch_loader(synthetic_readings)
    result = calculate_recharge("TEST001", sy=0.02, area_sqm=1_000_000)
    for row in result["yearly"]:
        assert row["source"] == "estimated"
        assert row["recharge_m3"] == row["estimated_recharge_m3"]


def test_recharge_prefers_official_data_when_provided(patch_loader, synthetic_readings):
    """This is the exact bug we found and fixed today: official GSDA data
    must win over the local WTF estimate, not get silently overwritten."""
    patch_loader(synthetic_readings)
    official_value = 79_368_000.0

    result = calculate_recharge(
        "TEST001", sy=0.02, area_sqm=1_000_000,
        official_annual_recharge_m3=official_value,
    )
    for row in result["yearly"]:
        assert row["source"] == "official_gsda"
        assert row["recharge_m3"] == official_value
        # the estimate must still be visible for cross-checking, not discarded
        assert "estimated_recharge_m3" in row
        assert row["estimated_recharge_m3"] != official_value


def test_recharge_estimate_scales_with_area(patch_loader, synthetic_readings):
    """Sanity check on the formula itself: doubling area should double the
    estimate (holding sy and water table rise constant)."""
    patch_loader(synthetic_readings)
    small_area = calculate_recharge("TEST001", sy=0.02, area_sqm=1_000_000)
    large_area = calculate_recharge("TEST001", sy=0.02, area_sqm=2_000_000)

    small_val = small_area["yearly"][0]["estimated_recharge_m3"]
    large_val = large_area["yearly"][0]["estimated_recharge_m3"]
    assert large_val == small_val * 2