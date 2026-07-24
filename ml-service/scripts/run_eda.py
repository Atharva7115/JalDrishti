"""
Run from ml-service/ root:  python -m scripts.run_eda
"""
import argparse
import pandas as pd
from extraction.loader import load_all


def run_eda(use_csv=False):
    _, readings = load_all(use_csv=use_csv)
    readings["timestamp"] = pd.to_datetime(readings["timestamp"])

    print(f"Total readings: {len(readings)}")

    counts = readings.groupby("station_id").size().sort_values(ascending=False)
    print("\n--- Records per station ---")
    print(counts.describe())
    print(f"Stations with < 90 readings: {(counts < 90).sum()} / {len(counts)}")

    print("\n--- Missing values ---")
    print(readings.isna().sum())

    print("\n--- Duplicate (station_id, timestamp) pairs ---")
    print(readings.duplicated(subset=["station_id", "timestamp"]).sum())

    print("\n--- Median gap (hours) per station ---")
    def median_gap_hours(g):
        g = g.sort_values("timestamp")
        return g["timestamp"].diff().dt.total_seconds().median() / 3600
    print(readings.groupby("station_id").apply(median_gap_hours).describe())

    q1, q3 = readings["water_level"].quantile([0.25, 0.75])
    iqr = q3 - q1
    lo, hi = q1 - 3 * iqr, q3 + 3 * iqr
    print(f"\n--- Rough outliers outside [{lo:.2f}, {hi:.2f}] ---")
    print(((readings["water_level"] < lo) | (readings["water_level"] > hi)).sum())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", action="store_true")
    args = parser.parse_args()
    run_eda(use_csv=args.csv)