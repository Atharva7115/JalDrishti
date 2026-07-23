"""
recharge/recharge_calculation.py — CGWB Water Table Fluctuation method.
Rule-based, not ML — must stay auditable per the report.
"""
from extraction.loader import load_station
from cleaning.preprocessing import clean_data, sort_by_time

# TODO: replace with real per-station values from Station metadata once available
DEFAULT_SPECIFIC_YIELD = 0.02
DEFAULT_AREA_SQM = 1_000_000


def calculate_recharge(station_id: str, sy: float = DEFAULT_SPECIFIC_YIELD,
                        area_sqm: float = DEFAULT_AREA_SQM) -> dict:
    df = load_station(station_id)
    df = clean_data(df)
    df = sort_by_time(df)
    df["year"] = df["timestamp"].dt.year

    yearly = []
    for year, g in df.groupby("year"):
        h_rise = g["water_level"].max() - g["water_level"].min()
        recharge = sy * h_rise * area_sqm
        yearly.append({"year": year, "water_table_rise_m": h_rise, "recharge_m3": recharge})

    return {"station_id": station_id, "yearly": yearly}