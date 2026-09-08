"""
data/extract.py

Attempts to extract project-level tables from MoSPI's monthly Flash Report PDFs using pdfplumber.

NOTE: this script was NOT run to produce the shipped dataset in this build — this build environment
has no internet access, so per the brief we fell straight through to data/seed_data.py (Section 12 of
the build prompt). This file is included complete and ready to run the moment a team member has
internet access and wants to swap in real, live-extracted data. See README.md → "Which data path was
used".

Usage:
    python data/extract.py --pdf path/to/FlashReport_June_2025.pdf
    python data/extract.py --url https://ipm.mospi.gov.in/Content/PDF/FlashReport_June_2025.pdf
"""

import argparse
import io
import re
import sys

import pandas as pd

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import urllib.request
except ImportError:
    urllib = None

NUMERIC_ARTIFACT_RE = re.compile(r"^-?\d+(\.\d+)?[eE][+-]?\d+$")


def parse_cost_value(raw):
    """Parse cost strings like '1,023,676', '1.05157e+006', '  12345.6 ', '-' into a float or None."""
    if raw is None:
        return None
    s = str(raw).strip()
    if s in ("", "-", "--", "NA", "N/A", "nil", "Nil"):
        return None
    s = s.replace(",", "").replace("₹", "").strip()
    try:
        if NUMERIC_ARTIFACT_RE.match(s):
            return float(s)
        return float(s)
    except ValueError:
        return None


def fetch_pdf_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def find_section_header(page_text_lines, table_top_y, line_positions):
    """Best-effort: the sector/ministry header is the nearest text line above the table on the page."""
    candidates = [ln for ln, y in line_positions if y < table_top_y]
    return candidates[-1] if candidates else "Unknown Section"


def extract_tables_from_pdf(pdf_bytes_or_path):
    if pdfplumber is None:
        raise RuntimeError("pdfplumber is not installed. pip install pdfplumber")

    rows = []
    unparsed_costs = 0
    source = pdf_bytes_or_path if isinstance(pdf_bytes_or_path, str) else io.BytesIO(pdf_bytes_or_path)

    with pdfplumber.open(source) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            line_positions = []
            seen_tops = set()
            for w in words:
                top = round(w["top"], 0)
                if top not in seen_tops:
                    seen_tops.add(top)
            # crude line reconstruction for header lookup
            lines_by_top = {}
            for w in words:
                lines_by_top.setdefault(round(w["top"], 0), []).append(w["text"])
            line_positions = sorted(
                [(" ".join(v), k) for k, v in lines_by_top.items()],
                key=lambda t: t[1],
            )

            tables = page.find_tables()
            for table in tables:
                table_top = table.bbox[1]
                section_header = find_section_header(None, table_top, line_positions)
                data = table.extract()
                if not data or len(data) < 2:
                    continue

                header = [ (c or "").strip().lower() for c in data[0] ]

                def col_idx(*keywords):
                    for i, h in enumerate(header):
                        if any(k in h for k in keywords):
                            return i
                    return None

                idx_id = col_idx("project id", "sl no", "id")
                idx_name = col_idx("project name", "name of project", "name")
                idx_orig = col_idx("original cost", "orig. cost", "original")
                idx_rev = col_idx("revised cost", "latest cost", "revised")
                idx_exp = col_idx("expenditure")
                idx_prog = col_idx("physical progress", "progress")

                if idx_name is None:
                    continue  # not a project table

                pending_name = ""
                for r in data[1:]:
                    if r is None:
                        continue
                    name_cell = (r[idx_name] or "").strip() if idx_name < len(r) else ""

                    # a row with no cost values at all and only a name is a wrapped continuation
                    has_any_cost = any(
                        idx is not None and idx < len(r) and parse_cost_value(r[idx]) is not None
                        for idx in [idx_orig, idx_rev, idx_exp]
                    )
                    if name_cell and not has_any_cost:
                        pending_name = (pending_name + " " + name_cell).strip()
                        continue

                    full_name = (pending_name + " " + name_cell).strip() if pending_name else name_cell
                    pending_name = ""
                    if not full_name:
                        continue

                    orig = parse_cost_value(r[idx_orig]) if idx_orig is not None and idx_orig < len(r) else None
                    rev = parse_cost_value(r[idx_rev]) if idx_rev is not None and idx_rev < len(r) else None
                    exp = parse_cost_value(r[idx_exp]) if idx_exp is not None and idx_exp < len(r) else None
                    prog = parse_cost_value(r[idx_prog]) if idx_prog is not None and idx_prog < len(r) else None
                    pid = (r[idx_id] or "").strip() if idx_id is not None and idx_id < len(r) else ""

                    if orig is None and idx_orig is not None:
                        unparsed_costs += 1

                    rows.append({
                        "project_id": pid or f"gen-{len(rows)+1}",
                        "project_name": full_name,
                        "ministry_or_sector_section": section_header,
                        "original_cost_cr": orig,
                        "revised_cost_cr": rev,
                        "expenditure_cr": exp,
                        "physical_progress_pct": prog,
                    })

    return pd.DataFrame(rows), unparsed_costs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", help="Local path to a MoSPI Flash Report PDF")
    parser.add_argument("--url", help="URL of a MoSPI Flash Report PDF")
    parser.add_argument("--out", default="data/projects_raw.csv")
    args = parser.parse_args()

    if not args.pdf and not args.url:
        print("[extract] No --pdf or --url given. Trying known MoSPI URL patterns is left to the "
              "caller — see README.md. Falling back is handled by the caller, not this script.")
        sys.exit(1)

    try:
        if args.url:
            pdf_bytes = fetch_pdf_bytes(args.url)
            df, unparsed = extract_tables_from_pdf(pdf_bytes)
        else:
            df, unparsed = extract_tables_from_pdf(args.pdf)
    except Exception as e:
        print(f"[extract] FAILED: {e}")
        print("[extract] Live extraction did not succeed. Use data/seed_data.py instead.")
        sys.exit(2)

    if df.empty:
        print("[extract] Extracted 0 rows. Use data/seed_data.py instead.")
        sys.exit(3)

    df.to_csv(args.out, index=False)
    print(f"[extract] Extracted {len(df)} rows -> {args.out}")
    print(f"[extract] Rows with an unparseable cost value: {unparsed}")


if __name__ == "__main__":
    main()
