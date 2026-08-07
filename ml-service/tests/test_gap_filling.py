from cleaning.gap_filling import fill_missing_values


def test_fill_missing_values_fills_gaps(patch_loader, synthetic_readings_with_gaps):
    patch_loader(synthetic_readings_with_gaps)
    result = fill_missing_values("TEST001", freq="D")
    assert result["was_filled"].sum() > 0
    # No NaNs should remain in the final water_level column
    assert result["water_level"].isna().sum() == 0


def test_fill_missing_values_preserves_existing_data(patch_loader, synthetic_readings):
    """On data with no gaps at all, very little should get marked as filled."""
    patch_loader(synthetic_readings)
    result = fill_missing_values("TEST001", freq="D")
    assert result["was_filled"].mean() < 0.1