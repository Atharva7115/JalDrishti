"""
Run from ml-service/ root:  python -m scripts.run_forecast --station ST001 --horizon 14
"""
import argparse
from forecasting.forecasting import forecast_station

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--station", required=True)
    parser.add_argument("--horizon", type=int, default=14)
    parser.add_argument("--freq", default="D")
    args = parser.parse_args()

    result = forecast_station(args.station, horizon_days=args.horizon, freq=args.freq)
    print(f"MAE:  {result['mae']:.4f}")
    print(f"RMSE: {result['rmse']:.4f}")

    out_path = f"models/{args.station}_forecast.csv"
    result["forecast"].to_csv(out_path, index=False)
    print(f"Wrote {out_path}")