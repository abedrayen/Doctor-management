"""
Convert official WHO LMS tables (from CRAN anthro / anthroplus, derived from WHO
Child Growth Standards 2006 and Growth Reference 2007) into local JSON datasets.

Provenance:
  - 0–5 y: R package `anthro` sysdata (WHO Child Growth Standards 2006 LMS)
  - 5–19 y: R package `anthroplus` sysdata (WHO Growth Reference 2007 LMS)
"""

from __future__ import annotations

import json
from pathlib import Path

import rdata

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "scripts" / "who-raw"
OUT = ROOT / "src-tauri" / "src" / "database" / "who"

SEX = {1: "M", 2: "F"}

INDICATORS_0_5 = {
    "weight_for_age": ("growthstandards_weianthro", "kg", "wfa"),
    "length_height_for_age": ("growthstandards_lenanthro", "cm", "lhfa"),
    "head_circumference_for_age": ("growthstandards_hcanthro", "cm", "hcfa"),
    "bmi_for_age": ("growthstandards_bmianthro", "kg/m2", "bfa"),
}

INDICATORS_5_19 = {
    "weight_for_age": ("wfa_growth_standards", "kg", "wfa", 61, 121),
    "length_height_for_age": ("hfa_growth_standards", "cm", "lhfa", 61, 229),
    "bmi_for_age": ("bfa_growth_standards", "kg/m2", "bfa", 61, 229),
}


def load_rda(path: Path) -> dict:
    return rdata.conversion.convert(rdata.parser.parse_file(path))


def write_dataset(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)} rows={len(payload['rows'])}")


def export_0_5(data: dict) -> list[dict]:
    manifest = []
    for indicator, (key, unit, code) in INDICATORS_0_5.items():
        df = data[key]
        for sex_code, sex in SEX.items():
            part = df[df["sex"] == sex_code].sort_values("age")
            rows = [[int(r.age), float(r.l), float(r.m), float(r.s)] for r in part.itertuples()]
            age_min = int(part["age"].min())
            age_max = int(part["age"].max())
            name = f"{code}_{'boys' if sex == 'M' else 'girls'}_0_5.json"
            payload = {
                "source": "WHO Child Growth Standards 2006 — LMS parameters (MGRS)",
                "version": "WHO-2006",
                "package_provenance": "CRAN anthro 1.0.1 sysdata (WHO Anthro LMS tables)",
                "indicator": indicator,
                "sex": sex,
                "unit": unit,
                "age_unit": "days",
                "age_min": age_min,
                "age_max": age_max,
                "reviewed": False,
                "rows": rows,
            }
            write_dataset(OUT / name, payload)
            manifest.append({"file": name, **{k: payload[k] for k in ("indicator", "sex", "version", "age_unit", "age_min", "age_max", "unit")}})
    return manifest


def export_5_19(data: dict) -> list[dict]:
    manifest = []
    for indicator, (key, unit, code, amin, amax) in INDICATORS_5_19.items():
        df = data[key]
        for sex_code, sex in SEX.items():
            part = df[df["sex"] == sex_code].sort_values("age")
            # Keep only official published range for this indicator
            part = part[(part["age"] >= amin) & (part["age"] <= amax)]
            rows = [[int(r.age), float(r.l), float(r.m), float(r.s)] for r in part.itertuples()]
            age_min = int(part["age"].min())
            age_max = int(part["age"].max())
            years = "5_10" if indicator == "weight_for_age" else "5_19"
            name = f"{code}_{'boys' if sex == 'M' else 'girls'}_{years}.json"
            payload = {
                "source": "WHO Growth Reference 2007 — LMS parameters (5–19 years)",
                "version": "WHO-2007",
                "package_provenance": "CRAN anthroplus 0.9.0 sysdata (WHO 2007 LMS tables)",
                "indicator": indicator,
                "sex": sex,
                "unit": unit,
                "age_unit": "months",
                "age_min": age_min,
                "age_max": age_max,
                "reviewed": False,
                "rows": rows,
            }
            write_dataset(OUT / name, payload)
            manifest.append({"file": name, **{k: payload[k] for k in ("indicator", "sex", "version", "age_unit", "age_min", "age_max", "unit")}})
    return manifest


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    anthro = load_rda(RAW / "anthro" / "R" / "sysdata.rda")
    anthroplus = load_rda(RAW / "anthroplus" / "R" / "sysdata.rda")
    items = export_0_5(anthro) + export_5_19(anthroplus)
    manifest = {
        "description": "Local WHO LMS reference datasets for Cabinet Pédiatrique DSP module",
        "reviewed": False,
        "note": "Datasets are transcribed from WHO-published LMS tables via CRAN anthro/anthroplus. Clinical review by the physician is required before production use. Do not invent or extrapolate beyond age_min/age_max.",
        "datasets": items,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"manifest datasets={len(items)}")


if __name__ == "__main__":
    main()
