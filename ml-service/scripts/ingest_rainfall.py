"""
scripts/ingest_rainfall.py — downloads official IMD gridded daily rainfall
data and extracts the nearest grid-cell value for every Station's lat/long,
writing into the new RainfallReading table.

Dataset: IMD (India Meteorological Department) gridded daily rainfall,
0.25 x 0.25 degree resolution, 1901-present. Fetched via the imdlib package
(pip install imdlib), which downloads directly from IMD's own servers --
no manual download needed.

IMPORTANT: this needs WRITE access, unlike the rest of ml-service which is
read-only by design. Uses its own connection with write credentials --
never reuses the readonly_user connection from extraction/db.py.

Run from ml-service/ root:
  python scripts/ingest_rainfall.py --start-year 2023 --end-year 2024
"""
import argparse
import os
import pandas as pd
import imdlib as imd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Separate, explicit write connection -- deliberately NOT extraction/db.py's
# read-only engine, so a bug here can never silently gain write access
# through the normal (read-only) ML data path.
WRITE_DB_USER = os.getenv("WRITE_DB_USER", "postgres")
WRITE_DB_PASSWORD = os.getenv("WRITE_DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "jaldrishti")


def get_write_engine():
    url = f"postgresql+psycopg2://{WRITE_DB_USER}:{WRITE_DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    return create_engine(url)


def fetch_stations(engine) -> pd.DataFrame:
    query = 'SELECT id, latitude, longitude FROM "Station" WHERE "isActive" = true'
    return pd.read_sql(query, engine)


def download_rainfall_grid(start_year: int, end_year: int, cache_dir: str = "data/imd_rain"):
    os.makedirs(cache_dir, exist_ok=True)
    print(f"Downloading IMD rainfall grid data for {start_year}-{end_year} "
          f"(cached in {cache_dir})...")
    data = imd.get_data("rain", start_year, end_year, fn_format="yearwise", file_dir=cache_dir)
    return data.get_xarray()


def extract_station_rainfall(rain_xr, stations: pd.DataFrame) -> pd.DataFrame:
    """For each station, pull the nearest grid cell's daily rainfall series."""
    records = []
    for _, row in stations.iterrows():
        try:
            point = rain_xr.sel(lat=row["latitude"], lon=row["longitude"], method="nearest")
        except Exception as e:
            print(f"  Skipping station {row['id']}: {e}")
            continue

        series = point.to_dataframe().reset_index()
        # imdlib's rainfall variable is typically named 'rain'
        value_col = "rain" if "rain" in series.columns else series.columns[-1]

        for _, r in series.iterrows():
            rainfall_mm = r[value_col]
            if pd.isna(rainfall_mm) or rainfall_mm < 0:
                continue  # IMD uses negative sentinel values for missing/ocean cells
            records.append({
                "station_id": row["id"],
                "date": r["time"] if "time" in series.columns else r.get("date"),
                "rainfall_mm": float(rainfall_mm),
            })

    return pd.DataFrame(records)


def write_rainfall(engine, df: pd.DataFrame, batch_size: int = 5000):
    if df.empty:
        print("No rainfall records to write.")
        return

    print(f"Writing {len(df)} rainfall records...")
    with engine.begin() as conn:
        for start in range(0, len(df), batch_size):
            batch = df.iloc[start:start + batch_size]
            for _, r in batch.iterrows():
                conn.execute(text("""
                    INSERT INTO "RainfallReading" (id, "stationId", date, "rainfallMm", source, "createdAt")
                    VALUES (gen_random_uuid(), :station_id, :date, :rainfall_mm, 'IMD', now())
                    ON CONFLICT ("stationId", date) DO UPDATE
                    SET "rainfallMm" = EXCLUDED."rainfallMm"
                """), {"station_id": r["station_id"], "date": r["date"], "rainfall_mm": r["rainfall_mm"]})
            print(f"  ... {min(start + batch_size, len(df))}/{len(df)}")

    print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-year", type=int, required=True)
    parser.add_argument("--end-year", type=int, required=True)
    args = parser.parse_args()

    engine = get_write_engine()
    stations = fetch_stations(engine)
    print(f"Found {len(stations)} active stations.")

    rain_xr = download_rainfall_grid(args.start_year, args.end_year)
    rainfall_df = extract_station_rainfall(rain_xr, stations)
    write_rainfall(engine, rainfall_df)