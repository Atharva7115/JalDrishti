"""
Run from ml-service/ root:  python -m scripts.run_anomaly --station ST001
"""
import argparse
from cleaning.anomaly_detection import detect_anomalies

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--station", required=True)
    parser.add_argument("--freq", default="D")
    args = parser.parse_args()

    result = detect_anomalies(args.station, freq=args.freq)
    out_path = f"models/{args.station}_anomalies.csv"
    result.to_csv(out_path, index=False)
    print(f"Wrote {out_path}")
    print(result[["timestamp", "water_level", "is_anomaly"]].tail(10))