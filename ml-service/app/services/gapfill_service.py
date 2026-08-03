import pandas as pd
from app.schemas.gapfill import GapFillRequest, GapFillResponse, GapFillRecord
from app.utilities.stateless_context import StatelessContext
from cleaning.gap_filling import fill_missing_values

def run_gap_filling(request: GapFillRequest) -> GapFillResponse:
    # Build DataFrame from request readings (keep null water levels)
    data = [
        {
            "station_id": "stateless_station",
            "timestamp": r.timestamp.replace(tzinfo=None),
            "water_level": r.water_level
        }
        for r in request.readings
    ]

    if not data:
        return GapFillResponse(readings=[])

    df = pd.DataFrame(data)
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        if df["timestamp"].dt.tz is not None:
            df["timestamp"] = df["timestamp"].dt.tz_localize(None)

    # Run gap filling within the stateless context to intercept DB loading
    with StatelessContext(df):
        result_df = fill_missing_values("stateless_station", freq=request.freq)

    # Map the resulting DataFrame back to the Pydantic schema
    records = []
    for _, row in result_df.iterrows():
        ts = row["timestamp"].to_pydatetime() if hasattr(row["timestamp"], "to_pydatetime") else pd.to_datetime(row["timestamp"]).to_pydatetime()
        
        records.append(
            GapFillRecord(
                timestamp=ts,
                water_level=float(row["water_level"]),
                was_filled=bool(row["was_filled"])
            )
        )

    return GapFillResponse(readings=records)
