"""
extract_gsda_pages.py — pulls out just the pages we need (Annexures B, C, D)
from the huge GSDA report PDF, as plain text, so we can inspect the real
table structure before writing a proper parser.

The page numbers printed in the PDF's table of contents (176, 191, 207) are
relative to the report's own numbering, which usually starts AFTER the cover/
preface pages -- so the real PDF page index is often offset by 5-15 pages.
This script prints a wide window around each guess so you can find the exact
real page.

Run:
  python extract_gsda_pages.py "D:\\ProjectFinal year\\JalDrishti\\data\\gsda\\GWRE-2023.pdf"
"""
import sys
import pdfplumber

TARGETS = {
    "Annexure-B (Recharge)": 176,
    "Annexure-C (Extraction)": 191,
    "Annexure-D (Taluka categorization)": 207,
}

WINDOW = 15  # pages before/after the guess to scan, since numbering usually shifts

def main(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print(f"Total pages in PDF: {total}\n")

        for label, guess in TARGETS.items():
            print("=" * 70)
            print(f"Looking for: {label} (report says page {guess})")
            print("=" * 70)
            start = max(0, guess - WINDOW)
            end = min(total, guess + WINDOW)
            for i in range(start, end):
                text = pdf.pages[i].extract_text() or ""
                first_line = text.strip().split("\n")[0] if text.strip() else "(blank)"
                # Look for the annexure title or "Taluka" keyword to help you spot the real page
                marker = ""
                if "ANNEXURE" in text.upper() or "TALUKA" in text.upper():
                    marker = "  <-- possible match"
                print(f"  PDF page {i+1}: {first_line[:80]}{marker}")
            print()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_gsda_pages.py <path_to_pdf>")
        sys.exit(1)
    main(sys.argv[1])