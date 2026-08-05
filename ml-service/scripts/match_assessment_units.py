"""
match_assessment_units.py — matches rows from gsda_annexure_c.csv against
the real AssessmentUnit table (state/district/taluka combos already seeded
from actual Station data), using fuzzy matching since GSDA's PDF text
extraction produces artifacts (e.g. "RHATA" instead of "Rahata").

This does NOT write to the database. It only produces a review CSV:
  - matched: high-confidence exact or near-exact match found
  - review: a plausible but uncertain match found -- check by eye
  - unmatched: no reasonable match found at all

Run from ml-service/ root (needs the read-only DB connection already set up):
  python scripts/match_assessment_units.py --state Maharashtra
"""
import argparse
import csv
import difflib

from extraction.db import get_engine
import pandas as pd


def load_assessment_units(state: str) -> pd.DataFrame:
    engine = get_engine()
    query = f"""
        SELECT id, state, district, taluka
        FROM "AssessmentUnit"
        WHERE state ILIKE '{state}'
    """
    return pd.read_sql(query, engine)


def normalize(s: str) -> str:
    return s.strip().upper().replace(".", "").replace("-", " ")


# GSDA report spelling -> actual spelling used in the AssessmentUnit table
# (confirmed by comparing SELECT DISTINCT district FROM "AssessmentUnit"
# against the 34 GSDA district names -- these are the only 4 that differ).
DISTRICT_ALIASES = {
    "AHMEDNAGAR": "AHMADNAGAR",
    "BULDHANA": "BULDANA",
    "SINDHUDURG": "SINDUDURG",
    "YAWATMAL": "YAVATMAL",
}


def normalize_district(s: str) -> str:
    n = normalize(s)
    return DISTRICT_ALIASES.get(n, n)


# Manually reviewed GSDA-report-name -> real-DB-taluka-name pairs, confirmed
# to be the SAME place with different transliteration (not a different real
# taluka). Keyed by (normalized district, normalized GSDA taluka).
# Anything NOT in this list that scored below the auto-accept cutoff stays
# unmatched rather than being force-matched to a possibly-wrong place.
MANUAL_TALUKA_OVERRIDES = {
    ("AHMEDNAGAR", "NEWASA"): "NEVASA",
    ("AMRAVATI", "NANDGAON"): "NANDGAON KHANDESHWAR",
    ("AURANGABAD", "FULAMBRE"): "FULAMBARI",
    ("BEED", "GEVRAI"): "GEORAI",
    ("BEED", "MAJALGAON"): "MANJLEGAON",
    ("BEED", "SHIRUR KA"): "SHIRUR-KASAR",
    ("BEED", "WADVANI"): "WADWANI",
    ("CHANDRAPUR", "NAGBHIND"): "NAGBHIR",
    ("CHANDRAPUR", "POBHURNA"): "POMBURNA",
    ("CHANDRAPUR", "SAWALI"): "SAOLI",
    ("CHANDRAPUR", "SINDEWALI"): "SINDEWAHI",
    ("DHULE", "SINDKHEDA"): "SHINDKHEDE",
    ("GADCHIROLI", "SORONCHA"): "SIRONCHA",
    ("JALNA", "GHAT SAWANGI"): "GHANSAVANGI",
    ("JALNA", "JAFRABAD"): "JAFFERABAD",
    ("KOLHAPUR", "AJARA"): "AJRA",
    ("LATUR", "ANANTPAL SH"): "SHIRUR-ANANTPAL",
    ("LATUR", "DEVANI"): "DEONI",
    ("NAGPUR", "NAGPUR"): "NAGPUR (RURAL)",
    ("NANDED", "DEGLOOR"): "DEGLUR",
    ("NANDED", "UMARI"): "UMRI",
    ("NANDURBAR", "AKKALKUVA"): "AKKALKUWA",
    ("NANDURBAR", "SHAHADA"): "SHAHADE",
    ("NANDURBAR", "TALODA"): "TALODE",
    ("NASHIK", "BAGLAN SATANA"): "BAGLAN",
    ("NASHIK", "YEOLA"): "YEVLA",
    ("OSMANABAD", "BHOOM"): "BHUM",
    ("OSMANABAD", "OMERGA"): "UMARGA",
    ("PARBHANI", "SELU"): "SAILU",
    ("PUNE", "MAVAL"): "MAWAL",
    ("SOLAPUR", "MANGALWEDHA"): "MANGALVEDHE",
    ("SOLAPUR", "S.SOLAPUR"): "SOLAPUR SOUTH",
    ("SOLAPUR", "SANGOLA"): "SANGOLE",
    ("THANE", "BHIVANDI"): "BHIWANDI",
    ("YAWATMAL", "OMARKHED"): "UMARKHED",
}


def best_match(target_district: str, target_taluka: str, units_df: pd.DataFrame):
    """Find the best-matching AssessmentUnit for a given (district, taluka)
    pair, restricted to the same district to avoid cross-district false
    matches on similarly-named talukas."""
    same_district = units_df[
        units_df["district"].apply(normalize) == normalize_district(target_district)
    ]
    if same_district.empty:
        return None, 0.0, "no district match"

    # Check manual overrides first (confirmed same-place spelling variants).
    # Keyed by the ORIGINAL GSDA report district spelling, not the DB alias.
    override_key = (normalize(target_district), normalize(target_taluka))
    if override_key in MANUAL_TALUKA_OVERRIDES:
        target_db_name = MANUAL_TALUKA_OVERRIDES[override_key]
        override_rows = same_district[same_district["taluka"].apply(normalize) == target_db_name]
        if not override_rows.empty:
            row = override_rows.iloc[0]
            return row["id"], 1.0, row["taluka"]

    candidates = same_district["taluka"].apply(normalize).tolist()
    target_norm = normalize(target_taluka)

    matches = difflib.get_close_matches(target_norm, candidates, n=1, cutoff=0.5)
    if not matches:
        return None, 0.0, "no taluka candidate above cutoff"

    best = matches[0]
    score = difflib.SequenceMatcher(None, target_norm, best).ratio()
    matched_row = same_district[same_district["taluka"].apply(normalize) == best].iloc[0]
    return matched_row["id"], score, matched_row["taluka"]


def main(csv_path: str, state: str, out_path: str):
    units_df = load_assessment_units(state)
    print(f"Loaded {len(units_df)} real AssessmentUnit records for state={state}")

    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            unit_id, score, matched_taluka = best_match(
                row["district"], row["taluka"], units_df
            )

            if unit_id is None:
                status = "unmatched"
            elif score >= 0.90:
                status = "matched"
            else:
                status = "review"

            rows.append({
                **row,
                "assessment_unit_id": unit_id or "",
                "matched_taluka_in_db": matched_taluka or "",
                "match_score": round(score, 3),
                "status": status,
            })

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = list(rows[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    from collections import Counter
    status_counts = Counter(r["status"] for r in rows)
    print(f"\nWrote {out_path}")
    print("--- Match status ---")
    for status, count in status_counts.items():
        print(f"  {status}: {count}")

    print("\n--- All 'review' rows (check these by eye) ---")
    for r in rows:
        if r["status"] == "review":
            print(f"  GSDA: {r['district']} / {r['taluka']}  ->  DB: {r['matched_taluka_in_db']}  (score={r['match_score']})")

    print("\n--- All 'unmatched' rows (no candidate found at all) ---")
    for r in rows:
        if r["status"] == "unmatched":
            print(f"  GSDA: {r['district']} / {r['taluka']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default="gsda_annexure_c.csv")
    parser.add_argument("--state", default="Maharashtra")
    parser.add_argument("--out", default="gsda_matched_review.csv")
    args = parser.parse_args()
    main(args.csv, args.state, args.out)