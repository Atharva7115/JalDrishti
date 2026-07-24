"""
Run from ml-service/ root:  python -m scripts.run_gap_fill --station ST001
"""
import argparse
from cleaning.gap_filling import fill_missing_values

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--station", required=True)
    parser.add_argument("--freq", default="D")
    args = parser.parse_args()

    filled = fill_missing_values(args.station, freq=args.freq)
    out_path = f"models/{args.station}_filled.csv"
    filled.to_csv(out_path, index=False)
    print(f"Wrote {out_path}")
    print(f"{filled['was_filled'].sum()} of {len(filled)} points were filled")