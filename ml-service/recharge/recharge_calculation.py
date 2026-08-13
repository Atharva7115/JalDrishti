"""
recharge/recharge_calculation.py — CGWB Water Table Fluctuation method.
Rule-based, not ML — must stay auditable per the report.

IMPORTANT: this module has two distinct sources of truth:
  1. OFFICIAL data (preferred) -- the real GSDA/CGWB annual recharge figure,
     imported into AssessmentData (Phase 6). This is government-published
     data and should always win when available.
  2. ESTIMATED data (fallback only) -- a rough local approximation using one
     station's water-level fluctuation stretched across the whole taluka's
     area. This is a coarse approximation and should only be used when no
     official figure exists yet for that taluka/year.

Mixing these silently (e.g. always recomputing the estimate even when real
official data exists) produces numbers that look plausible in isolation but
are inconsistent with the authoritative source -- calculate_recharge() takes
an optional official_annual_recharge_m3 so callers (the FastAPI recharge
service) can pass the AssessmentData value through when they have it.
"""
from extraction.loader import load_station
from cleaning.preprocessing import clean_data, sort_by_time

# TODO: replace with real per-station values from Station metadata once available
DEFAULT_SPECIFIC_YIELD = 0.02
DEFAULT_AREA_SQM = 1_000_000


def calculate_recharge(station_id: str, sy: float = DEFAULT_SPECIFIC_YIELD,
                        area_sqm: float = DEFAULT_AREA_SQM,
                        official_annual_recharge_m3: float = None) -> dict:
    """
    If official_annual_recharge_m3 is provided (i.e. AssessmentData exists
    for this station's taluka), it is used directly and the local WTF
    estimate is included only as a cross-check ("estimated_recharge_m3"),
    not as the authoritative figure. If it's None, the local WTF estimate
    is the only number available and is clearly labeled as such.
    """
    df = load_station(station_id)
    df = clean_data(df)
    df = sort_by_time(df)
    df["year"] = df["timestamp"].dt.year

    yearly = []
    for year, g in df.groupby("year"):
        h_rise = g["water_level"].max() - g["water_level"].min()
        estimated_recharge = sy * h_rise * area_sqm

        row = {
            "year": year,
            "water_table_rise_m": h_rise,
            "estimated_recharge_m3": estimated_recharge,
            "source": "estimated",
        }

        if official_annual_recharge_m3 is not None:
            row["recharge_m3"] = official_annual_recharge_m3
            row["source"] = "official_gsda"
        else:
            row["recharge_m3"] = estimated_recharge

        yearly.append(row)

    return {"station_id": station_id, "yearly": yearly}