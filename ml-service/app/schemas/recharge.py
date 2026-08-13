import pandas as pd
from app.schemas.recharge import RechargeRequest, RechargeResponse, RechargeYearRecord
from app.utilities.stateless_context import StatelessContext
from recharge.recharge_calculation import calculate_recharge


def run_recharge_calculation(request: RechargeRequest) -> RechargeResponse:
    # Build DataFrame from request readings
    data = [
        {
            "station_id": "stateless_station",
            "timestamp": r.timestamp.replace(tzinfo=None),
            "water_level": r.water_level
        }
        for r in request.readings if r.water_level is not None
    ]
    if not data:
        return RechargeResponse(yearly=[])
    df = pd.DataFrame(data)
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        if df["timestamp"].dt.tz is not None:
            df["timestamp"] = df["timestamp"].dt.tz_localize(None)

    # Run recharge calculation within the stateless context to intercept DB loading.
    # official_annual_recharge_m3 (if the backend sent it, sourced from AssessmentData)
    # takes priority over the local WTF estimate inside calculate_recharge().
    with StatelessContext(df):
        result = calculate_recharge(
            "stateless_station",
            sy=request.specific_yield,
            area_sqm=request.area_sqm,
            official_annual_recharge_m3=request.official_annual_recharge_m3,
        )

    yearly_records = [
        RechargeYearRecord(
            year=int(item["year"]),
            water_table_rise_m=float(item["water_table_rise_m"]),
            recharge_m3=float(item["recharge_m3"]),
            estimated_recharge_m3=float(item["estimated_recharge_m3"]) if "estimated_recharge_m3" in item else None,
            source=item.get("source"),
        )
        for item in result["yearly"]
    ]
    return RechargeResponse(yearly=yearly_records)