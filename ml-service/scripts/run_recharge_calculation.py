"""
Run from ml-service/ root:
  python -m scripts.run_recharge_classification --station ST001 --extraction 500000
"""
import argparse
from recharge.recharge_calculation import calculate_recharge
from classification.classification import classify_station

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--station", required=True)
    parser.add_argument("--extraction", type=float, default=500_000,
                         help="Annual extraction in m3 (placeholder until real data available)")
    args = parser.parse_args()

    recharge = calculate_recharge(args.station)
    print("Recharge by year:")
    for row in recharge["yearly"]:
        print(" ", row)

    classification = classify_station(args.station, args.extraction)
    print("\nClassification:")
    print(" ", classification)