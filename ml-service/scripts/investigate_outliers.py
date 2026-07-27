"""
scripts/investigate_outliers.py — pull out the worst-performing stations from
a batch_eval_summary.csv and show their raw data stats, so we understand
*why* they forecast badly instead of just knowing that they do.

Run from ml-service/ root:
  python -m scripts.investigate_outliers --top 5
"""
import argparse
import pandas as pd

from extraction.loader import load_station
from cleaning.preprocessing import clean_data, sort_by_time


def investigate(top_n: int = 5, summary_path: str = "models/batch_eval_summary.csv"):
    df = pd.read_csv(summary_path)
    ok = df[df["status"] == "ok"].copy()

    worst = ok.sort_values("mae", ascending=False).head(top_n)
    print(f"--- Top {top_n} highest-MAE stations ---")
    print(worst[["station_id", "n_points", "pct_anomaly", "pct_filled", "mae", "rmse"]].to_string(index=False))

    print("\n--- Raw data profile for each ---")
    for sid in worst["station_id"]:
        raw = load_station(sid)
        raw = clean_data(raw)
        raw = sort_by_time(raw)
        span_days = (raw["timestamp"].max() - raw["timestamp"].min()).days if len(raw) else 0
        print(f"\nStation {sid}:")
        print(f"  raw readings: {len(raw)}")
        print(f"  date range: {raw['timestamp'].min()} -> {raw['timestamp'].max()} ({span_days} days)")
        print(f"  water_level range: {raw['water_level'].min():.2f} to {raw['water_level'].max():.2f}")
        print(f"  water_level std dev: {raw['water_level'].std():.2f}")
        # A big std dev relative to a short/gappy history is a strong hint
        # that Prophet has too little signal to learn a stable trend.


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--top", type=int, default=5)
    parser.add_argument("--summary", default="models/batch_eval_summary.csv")
    args = parser.parse_args()
    investigate(top_n=args.top, summary_path=args.summary)