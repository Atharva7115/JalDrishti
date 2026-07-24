"""
scripts/run_batch_eval.py — run the full pipeline across many stations at once
and produce one summary table, instead of testing station-by-station by hand.

Run from ml-service/ root:
  python -m scripts.run_batch_eval --limit 30 --freq 6h --horizon 56

What it does per station:
  1. Load + count raw readings
  2. Run anomaly detection -> % flagged as anomalies
  3. Run gap filling -> % of points that were filled
  4. Run forecasting -> MAE, RMSE (skipped if not enough history)
  5. Record pass/fail + error message if something breaks

Writes: models/batch_eval_summary.csv
Never touches the database except reading (same read-only connection as everything else).
"""
import argparse
import pandas as pd
import traceback

from extraction.loader import load_all
from cleaning.anomaly_detection import detect_anomalies
from cleaning.gap_filling import fill_missing_values
from forecasting.forecasting import forecast_station


def get_station_ids(limit: int = None, min_readings: int = 0, max_readings: int = None):
    """Pull a list of station IDs to test, optionally filtered by how much data they have."""
    _, readings = load_all()
    counts = readings.groupby("station_id").size()

    if min_readings:
        counts = counts[counts >= min_readings]
    if max_readings:
        counts = counts[counts <= max_readings]

    ids = counts.sort_values(ascending=False).index.tolist()
    if limit:
        ids = ids[:limit]
    return ids


def evaluate_station(station_id: str, freq: str, horizon: int) -> dict:
    row = {"station_id": station_id, "status": "ok", "error": ""}
    try:
        anomalies_df = detect_anomalies(station_id, freq=freq)
        row["n_points"] = len(anomalies_df)
        row["pct_anomaly"] = round(100 * anomalies_df["is_anomaly"].mean(), 2)

        filled_df = fill_missing_values(station_id, freq=freq)
        row["pct_filled"] = round(100 * filled_df["was_filled"].mean(), 2)

        result = forecast_station(station_id, horizon_days=horizon, freq=freq)
        row["mae"] = round(result["mae"], 4)
        row["rmse"] = round(result["rmse"], 4)

    except ValueError as e:
        # Expected failure case: not enough history for the requested horizon
        row["status"] = "skipped"
        row["error"] = str(e)
    except Exception as e:
        row["status"] = "failed"
        row["error"] = f"{type(e).__name__}: {e}"

    return row


def run_batch(limit: int, freq: str, horizon: int, min_readings: int, max_readings: int):
    station_ids = get_station_ids(limit=limit, min_readings=min_readings, max_readings=max_readings)
    print(f"Evaluating {len(station_ids)} stations (freq={freq}, horizon={horizon})...")

    results = []
    for i, sid in enumerate(station_ids, 1):
        print(f"[{i}/{len(station_ids)}] {sid} ...", end=" ")
        row = evaluate_station(sid, freq=freq, horizon=horizon)
        results.append(row)
        print(row["status"])

    df = pd.DataFrame(results)
    out_path = "models/batch_eval_summary.csv"
    df.to_csv(out_path, index=False)

    print("\n" + "=" * 60)
    print(f"Wrote {out_path}")
    print(f"ok: {(df['status'] == 'ok').sum()}  "
          f"skipped: {(df['status'] == 'skipped').sum()}  "
          f"failed: {(df['status'] == 'failed').sum()}")

    ok = df[df["status"] == "ok"]
    if len(ok):
        print("\n--- MAE across successful stations ---")
        print(ok["mae"].describe())
        print("\n--- RMSE across successful stations ---")
        print(ok["rmse"].describe())
        print("\n--- % filled across successful stations ---")
        print(ok["pct_filled"].describe())

    failed = df[df["status"] == "failed"]
    if len(failed):
        print(f"\n--- {len(failed)} station(s) failed — see error column in CSV ---")
        print(failed[["station_id", "error"]].to_string(index=False))

    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=30, help="Max number of stations to test")
    parser.add_argument("--freq", default="6h")
    parser.add_argument("--horizon", type=int, default=56)
    parser.add_argument("--min-readings", type=int, default=0,
                         help="Only include stations with at least this many raw readings")
    parser.add_argument("--max-readings", type=int, default=None,
                         help="Only include stations with at most this many raw readings (use to target sparse stations)")
    args = parser.parse_args()

    run_batch(
        limit=args.limit,
        freq=args.freq,
        horizon=args.horizon,
        min_readings=args.min_readings,
        max_readings=args.max_readings,
    )