"""
extract_annexure_c.py — pulls the Annexure C table (per-taluka recharge,
extraction, stage %, and category) out of the GSDA PDF into a clean CSV.

This is a text-based parser (not pdfplumber table detection) because the
report's tables don't have visible ruling lines consistently, and district
names wrap onto a second line when long (e.g. "AHMEDNAGA" + "R"), which
breaks naive column-based table detection. Instead we parse the text
line-by-line using the fact that every real data row starts with a serial
number, and merge wrapped continuation lines back together.

Run:
  python extract_annexure_c.py "<pdf_path>" --start 200 --end 215
"""
import argparse
import csv
import re
import pdfplumber

# The 34 real districts assessed in GWRE-2023 (from Annexure D) -- used to
# validate reconstructed district names, since long names wrap across the
# line immediately BEFORE and the line immediately AFTER each data row
# (e.g. "AHMEDNAGA" before the row, "R" after it -> "AHMEDNAGAR").
DISTRICTS = {
    "AHMEDNAGAR", "AKOLA", "AMRAVATI", "AURANGABAD", "BEED", "BHANDARA",
    "BULDHANA", "CHANDRAPUR", "DHULE", "GADCHIROLI", "GONDIA", "HINGOLI",
    "JALGAON", "JALNA", "KOLHAPUR", "LATUR", "NAGPUR", "NANDED", "NANDURBAR",
    "NASHIK", "OSMANABAD", "PALGHAR", "PARBHANI", "PUNE", "RAIGAD",
    "RATNAGIRI", "SANGLI", "SATARA", "SINDHUDURG", "SOLAPUR", "THANE",
    "WARDHA", "WASHIM", "YAWATMAL",
}

# A real data row starts with an integer serial number.
ROW_START_RE = re.compile(r"^\s*(\d+)\s+(.*)$")

# Category words seen in the report
CATEGORY_RE = re.compile(
    r"\b(safe|semi_critical|critical|over_exploited|salinity)\b", re.IGNORECASE
)

NUMBER_RE = re.compile(r"-?\d[\d,]*\.\d+|-?\d+")


def is_fragment_line(line: str) -> bool:
    """A wrapped-district fragment: letters/spaces only, no digits, short."""
    s = line.strip()
    if not s or any(ch.isdigit() for ch in s):
        return False
    if not re.match(r"^[A-Za-z ]+$", s):
        return False
    return len(s) <= 20


def find_inline_district(text: str):
    """If the row's own text starts with a full district name (short names
    that don't wrap, e.g. 'AKOLA AKOT ...'), return (district, remainder)."""
    for d in DISTRICTS:
        if text.upper().startswith(d):
            remainder = text[len(d):].strip()
            return d, remainder
    return None, text


def parse_row(row_text: str, prefix_line: str, suffix_line: str):
    """row_text is the row line with the leading serial number stripped."""
    district = None

    # Try wrapped-district reconstruction: prefix (before row) + suffix
    # (after row) concatenated, OR prefix alone if it's already a complete
    # district name (e.g. "AMRAVATI" on its own line, no wrap needed).
    if is_fragment_line(prefix_line):
        prefix_clean = prefix_line.strip().upper()
        if prefix_clean in DISTRICTS:
            district = prefix_clean
        elif is_fragment_line(suffix_line):
            combined = (prefix_line.strip() + suffix_line.strip()).upper().replace(" ", "")
            if combined in DISTRICTS:
                district = combined

    remainder = row_text
    if district is None:
        # Try inline district (short names that fit on the row's own line)
        district, remainder = find_inline_district(row_text)

    if district is None:
        return None  # couldn't resolve district -- skip rather than guess

    cat_match = CATEGORY_RE.search(remainder)
    if not cat_match:
        return None

    category = cat_match.group(1).lower()
    before_category = remainder[: cat_match.start()]

    numbers = NUMBER_RE.findall(before_category)
    numbers = [n.replace(",", "") for n in numbers]
    if len(numbers) < 6:
        return None

    first_num_match = re.search(NUMBER_RE, before_category)
    taluka = before_category[: first_num_match.start()].strip() if first_num_match else ""

    try:
        area_ha = float(numbers[0])
        annual_extractable_resource = float(numbers[1])
        total_extraction = float(numbers[5])
        stage_pct = float(numbers[-1])
    except (IndexError, ValueError):
        return None

    return {
        "district": district,
        "taluka": taluka,
        "area_ha": area_ha,
        "annual_recharge_ham": annual_extractable_resource,
        "annual_extraction_ham": total_extraction,
        "stage_of_extraction_pct": stage_pct,
        "category_raw": category,
    }


def parse_page(text: str):
    lines = text.split("\n")
    results = []
    for i, line in enumerate(lines):
        m = ROW_START_RE.match(line)
        if not m:
            continue
        row_text = m.group(2)
        prefix_line = lines[i - 1] if i - 1 >= 0 else ""
        suffix_line = lines[i + 1] if i + 1 < len(lines) else ""
        parsed = parse_row(row_text, prefix_line, suffix_line)
        if parsed:
            results.append(parsed)
    return results


def main(pdf_path: str, start_page: int, end_page: int, out_csv: str):
    rows = []

    with pdfplumber.open(pdf_path) as pdf:
        for pagenum in range(start_page, end_page + 1):
            text = pdf.pages[pagenum - 1].extract_text() or ""
            for parsed in parse_page(text):
                parsed["source_page"] = pagenum
                rows.append(parsed)

    print(f"Parsed {len(rows)} rows from pages {start_page}-{end_page}")

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "district", "taluka", "area_ha", "annual_recharge_ham",
            "annual_extraction_ham", "stage_of_extraction_pct", "category_raw",
            "source_page",
        ])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {out_csv}")

    from collections import Counter
    cat_counts = Counter(r["category_raw"] for r in rows)
    print("\n--- Category counts (compare to Annexure D totals: safe=277, semi_critical=57, critical=9, over_exploited=9, salinity=1) ---")
    for cat, count in sorted(cat_counts.items()):
        print(f"  {cat}: {count}")

    district_counts = Counter(r["district"] for r in rows)
    print(f"\n--- {len(district_counts)} distinct districts found (expect 34) ---")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    parser.add_argument("--start", type=int, default=200)
    parser.add_argument("--end", type=int, default=215)
    parser.add_argument("--out", default="gsda_annexure_c.csv")
    args = parser.parse_args()
    main(args.pdf_path, args.start, args.end, args.out)