"""
scripts/generate_station_report.py — the final deliverable: runs the full
pipeline for one station and produces ONE consolidated report combining:
  - anomaly detection
  - gap filling
  - forecasting (with accuracy metrics)
  - recharge calculation
  - GEC classification

This is what "detect_anomalies() / fill_missing_values() / forecast_station() /
calculate_recharge() / classify_station() all working together" looks like in
practice — the shape backend will eventually call, once their REST layer is ready.

Run from ml-service/ root:
  python -m scripts.generate_station_report --station <id> --extraction 500000
"""
import argparse
import json

from cleaning.anomaly_detection import detect_anomalies
from cleaning.gap_filling import fill_missing_values
from forecasting.forecasting import forecast_station
from recharge.recharge_calculation import calculate_recharge
from classification.classification import classify_station


def generate_report(station_id: str, annual_extraction_m3: float,
                     freq: str = "6h", horizon_days: int = 56) -> dict:
    report = {"station_id": station_id, "freq": freq}

    # --- Anomaly detection ---
    anomalies_df = detect_anomalies(station_id, freq=freq)
    report["anomaly_detection"] = {
        "n_points": len(anomalies_df),
        "pct_flagged_anomaly": round(100 * anomalies_df["is_anomaly"].mean(), 2),
    }

    # --- Gap filling ---
    filled_df = fill_missing_values(station_id, freq=freq)
    report["gap_filling"] = {
        "pct_points_filled": round(100 * filled_df["was_filled"].mean(), 2),
    }

    # --- Forecasting ---
    try:
        fc = forecast_station(station_id, horizon_days=horizon_days, freq=freq)
        report["forecasting"] = {
            "mae": round(fc["mae"], 4),
            "rmse": round(fc["rmse"], 4),
            "horizon_days_equivalent_periods": horizon_days,
            "next_period_forecast": fc["forecast"].head(1).to_dict(orient="records")[0],
        }
    except ValueError as e:
        report["forecasting"] = {"status": "skipped", "reason": str(e)}

    # --- Recharge (rule-based; uses placeholder Sy/area until Station metadata is available) ---
    recharge = calculate_recharge(station_id)
    report["recharge"] = recharge["yearly"]
    report["recharge_NOTE"] = (
        "Uses DEFAULT_SPECIFIC_YIELD and DEFAULT_AREA_SQM placeholders — "
        "replace with real per-station values once backend exposes them."
    )

    # --- Classification (rule-based; extraction volume is a placeholder input) ---
    classification = classify_station(station_id, annual_extraction_m3)
    report["classification"] = classification
    report["classification_NOTE"] = (
        f"annual_extraction_m3={annual_extraction_m3} is a placeholder — "
        "replace with a real extraction estimate."
    )

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--station", required=True)
    parser.add_argument("--extraction", type=float, default=500_000)
    parser.add_argument("--freq", default="6h")
    parser.add_argument("--horizon", type=int, default=56)
    args = parser.parse_args()

    report = generate_report(args.station, args.extraction, freq=args.freq, horizon_days=args.horizon)

    out_path = f"models/{args.station}_full_report.json"
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print(json.dumps(report, indent=2, default=str))
    print(f"\nWrote {out_path}")