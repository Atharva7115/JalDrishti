from recharge.recharge_calculation import calculate_recharge

THRESHOLDS = {
    "Safe": (0, 70),
    "Semi-Critical": (70, 90),
    "Critical": (90, 100),
    "Over-Exploited": (100, float("inf")),
}


def classify_stage(stage_pct: float) -> str:
    for label, (low, high) in THRESHOLDS.items():
        if low <= stage_pct < high:
            return label
    return "Unknown"


def classify_station(station_id: str, annual_extraction_m3: float,
                      official_annual_recharge_m3: float = None) -> dict:
    recharge = calculate_recharge(station_id, official_annual_recharge_m3=official_annual_recharge_m3)
    latest = recharge["yearly"][-1] if recharge["yearly"] else None
    if not latest or latest["recharge_m3"] == 0:
        return {"station_id": station_id, "classification": "Unknown", "reason": "insufficient recharge data"}

    stage_pct = (annual_extraction_m3 / latest["recharge_m3"]) * 100
    return {
        "station_id": station_id,
        "stage_of_extraction_pct": stage_pct,
        "classification": classify_stage(stage_pct),
        "recharge_m3": latest["recharge_m3"],
        "recharge_source": latest["source"],
        "year": latest["year"],
    }