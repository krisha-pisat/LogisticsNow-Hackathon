"""
processors.py — Core data processing engine for the CIOA backend.

Handles: data ingestion/cleaning, emission factor lookup, CO₂ calculation,
validation & imputation, lane ID generation, inefficiency detection,
and rule-based optimization suggestions.
"""

import json
import math
from typing import Any

import pandas as pd
import numpy as np

# ──────────────────────────────────────────────────────────────
# 1. EMISSION FACTOR LOOKUP TABLE
#    Key: (vehicle_type, fuel_type) → emission_factor (kg CO₂ per ton-km)
# ──────────────────────────────────────────────────────────────

EMISSION_FACTOR_LOOKUP: dict[tuple[str, str], float] = {
    # Electric vehicles
    ("Electric", "Electric"):    0.05,
    ("Electric", "Petrol"):      0.10,
    ("Electric", "Diesel"):      0.10,
    # Diesel vehicles
    ("Diesel", "Diesel"):        0.45,
    ("Diesel", "Electric"):      0.35,
    ("Diesel", "Petrol"):        0.42,
    # Hybrid vehicles
    ("Hybrid", "Petrol"):        0.25,
    ("Hybrid", "Diesel"):        0.28,
    ("Hybrid", "Electric"):      0.12,
}

FALLBACK_EMISSION_FACTOR = 0.30

# Default fill values for missing data
DEFAULT_EMISSION_FACTOR = 0.30
DEFAULT_LOAD_FACTOR = 0.50
DEFAULT_CAPACITY_KG = 8000.0


# ──────────────────────────────────────────────────────────────
# 2. DATA INGESTION & CLEANING
# ──────────────────────────────────────────────────────────────

def ingest_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and normalize a raw dataframe from CSV/Excel upload.
    - Fill NaNs in emission_factor, load_factor, capacity_kg with defaults.
    - Enforce numeric types for distance, weight, speed, etc.
    - Strip whitespace from string columns.
    """
    df = df.copy()

    # ── Strip whitespace from string columns ──
    str_cols = df.select_dtypes(include=["object"]).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()

    # ── Enforce numeric columns ──
    numeric_cols = [
        "Weight_kg", "Distance_km", "capacity_kg",
        "load_factor", "emission_factor", "co2_emission_kg",
        "traffic_intensity", "avg_speed_kmph",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # ── Fill NaN defaults ──
    if "emission_factor" in df.columns:
        df["emission_factor"] = df["emission_factor"].fillna(DEFAULT_EMISSION_FACTOR)
    else:
        df["emission_factor"] = DEFAULT_EMISSION_FACTOR

    if "load_factor" in df.columns:
        df["load_factor"] = df["load_factor"].fillna(DEFAULT_LOAD_FACTOR)
    else:
        df["load_factor"] = DEFAULT_LOAD_FACTOR

    if "capacity_kg" in df.columns:
        df["capacity_kg"] = df["capacity_kg"].fillna(DEFAULT_CAPACITY_KG)
    else:
        df["capacity_kg"] = DEFAULT_CAPACITY_KG

    # Ensure critical columns exist with fallbacks
    if "Weight_kg" not in df.columns:
        df["Weight_kg"] = 500.0
    if "Distance_km" not in df.columns:
        df["Distance_km"] = 100.0

    df["Weight_kg"] = df["Weight_kg"].fillna(500.0)
    df["Distance_km"] = df["Distance_km"].fillna(100.0)

    if "On_Time" in df.columns:
        df["On_Time"] = pd.to_numeric(df["On_Time"], errors="coerce").fillna(1).astype(int)

    return df


# ──────────────────────────────────────────────────────────────
# 3. EMISSION FACTOR IMPUTATION
# ──────────────────────────────────────────────────────────────

def impute_emission_factors(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each row, look up the emission factor from the (vehicle_type, fuel_type)
    lookup table and write it into `looked_up_emission_factor`.
    If the row's existing emission_factor is NaN/default, replace with looked-up value.
    """
    df = df.copy()

    def _lookup(row: pd.Series) -> float:
        vt = str(row.get("vehicle_type", "")).strip()
        ft = str(row.get("fuel_type", "")).strip()
        return EMISSION_FACTOR_LOOKUP.get((vt, ft), FALLBACK_EMISSION_FACTOR)

    df["looked_up_emission_factor"] = df.apply(_lookup, axis=1)

    # Overwrite emission_factor where it was previously NaN/default
    mask = (
        df["emission_factor"].isna()
        | (df["emission_factor"] == DEFAULT_EMISSION_FACTOR)
    )
    df.loc[mask, "emission_factor"] = df.loc[mask, "looked_up_emission_factor"]

    return df


# ──────────────────────────────────────────────────────────────
# 4. CO₂ CALCULATION ENGINE
# ──────────────────────────────────────────────────────────────

def calculate_co2(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate CO₂ for every shipment:
      co2_kg = distance_km * emission_factor * (weight_kg / 1000) * load_factor_adjustment

    load_factor_adjustment = 1 / load_factor   if load_factor < 0.8
                             1.0               otherwise
    (penalizes low-utilization shipments)
    """
    df = df.copy()

    load = df["load_factor"].clip(lower=0.01)  # avoid division by zero
    lf_adjustment = np.where(load < 0.8, 1.0 / load, 1.0)

    df["calculated_co2_kg"] = (
        df["Distance_km"]
        * df["emission_factor"]
        * (df["Weight_kg"] / 1000.0)
        * lf_adjustment
    )

    # Round for readability
    df["calculated_co2_kg"] = df["calculated_co2_kg"].round(4)

    return df


# ──────────────────────────────────────────────────────────────
# 5. VALIDATION & DERIVED METRICS
# ──────────────────────────────────────────────────────────────

def validate_and_derive(df: pd.DataFrame) -> pd.DataFrame:
    """
    - Flag rows where |calculated - existing| > 10% as 'validation_flag'.
    - Add emission_per_ton_km = co2_kg / (weight_t * distance_km).
    """
    df = df.copy()

    # Validation flag: compare calculated vs CSV-provided co2
    if "co2_emission_kg" in df.columns:
        existing = pd.to_numeric(df["co2_emission_kg"], errors="coerce")
        calc = df["calculated_co2_kg"]

        # Pct difference (avoid div/0 when existing is 0 or NaN)
        pct_diff = ((calc - existing).abs() / existing.clip(lower=0.01)).fillna(0)
        df["validation_flag"] = np.where(
            existing.notna() & (pct_diff > 0.10), True, False
        )
    else:
        df["validation_flag"] = False

    # Emission intensity metric
    ton_km = (df["Weight_kg"] / 1000.0) * df["Distance_km"]
    df["emission_per_ton_km"] = (
        df["calculated_co2_kg"] / ton_km.clip(lower=0.001)
    ).round(6)

    return df


# ──────────────────────────────────────────────────────────────
# 6. LANE ID GENERATION
# ──────────────────────────────────────────────────────────────

def generate_lane_ids(df: pd.DataFrame) -> pd.DataFrame:
    """
    lane_id = "{Origin_City}_{Destination_City}"
    Overwrites any existing lane_id column to ensure consistency.
    """
    df = df.copy()
    origin = df.get("Origin_City", pd.Series(["Unknown"] * len(df))).astype(str).str.strip()
    dest = df.get("Destination_City", pd.Series(["Unknown"] * len(df))).astype(str).str.strip()
    df["lane_id"] = origin + "_" + dest
    return df


# ──────────────────────────────────────────────────────────────
# 7. RULE-BASED INEFFICIENCY DETECTION
# ──────────────────────────────────────────────────────────────

def detect_inefficiencies(df: pd.DataFrame) -> pd.DataFrame:
    """
    Flag shipments with:
      - load_factor < 0.5             → 'low_load'
      - distance < 500 AND weight > 1000  → 'heavy_short'
      - avg_speed_kmph < 30           → 'congestion'

    Adds 'inefficiency_type' column (list of string flags).
    """
    df = df.copy()

    flags: list[list[str]] = []
    for _, row in df.iterrows():
        row_flags: list[str] = []

        if row.get("load_factor", 1.0) < 0.5:
            row_flags.append("low_load")

        if row.get("Distance_km", 9999) < 500 and row.get("Weight_kg", 0) > 1000:
            row_flags.append("heavy_short")

        speed = row.get("avg_speed_kmph", 999)
        if pd.notna(speed) and speed < 30:
            row_flags.append("congestion")

        flags.append(row_flags)

    df["inefficiency_type"] = flags
    return df


# ──────────────────────────────────────────────────────────────
# 8. RULE-BASED OPTIMIZATION SUGGESTIONS
# ──────────────────────────────────────────────────────────────

def generate_optimizations(df: pd.DataFrame) -> pd.DataFrame:
    """
    Group by lane_id; if > 2 shipments on the same lane,
    flag 'consolidate_potential' with estimated savings = sum(co2_kg) * 0.30.

    Adds 'optimization_suggestion' column (JSON string per row).
    """
    df = df.copy()
    df["optimization_suggestion"] = "{}"  # default empty

    if "lane_id" not in df.columns:
        return df

    # Count shipments per lane
    lane_counts = df.groupby("lane_id")["calculated_co2_kg"].agg(["count", "sum"]).reset_index()
    lane_counts.columns = ["lane_id", "shipment_count", "total_co2"]

    # Lanes eligible for consolidation (more than 2 shipments)
    consolidation_lanes = lane_counts[lane_counts["shipment_count"] > 2].copy()
    consolidation_lanes["savings_kg"] = (consolidation_lanes["total_co2"] * 0.30).round(2)

    # Build a lookup: lane_id → suggestion JSON
    suggestions_map: dict[str, str] = {}
    for _, lane in consolidation_lanes.iterrows():
        suggestion = {
            "type": "consolidate",
            "lane_shipment_count": int(lane["shipment_count"]),
            "lane_total_co2_kg": round(float(lane["total_co2"]), 2),
            "savings_kg": round(float(lane["savings_kg"]), 2),
            "savings_pct": 30,
        }
        suggestions_map[lane["lane_id"]] = json.dumps(suggestion)

    # Apply to dataframe
    df["optimization_suggestion"] = df["lane_id"].map(suggestions_map).fillna("{}")

    return df


# ──────────────────────────────────────────────────────────────
# 9. FULL PROCESSING PIPELINE
# ──────────────────────────────────────────────────────────────

def process_upload(df: pd.DataFrame) -> list[dict[str, Any]]:
    """
    Run the complete processing pipeline on a raw dataframe:
      1. Ingest & clean
      2. Generate lane IDs
      3. Impute emission factors
      4. Calculate CO₂
      5. Validate & derive metrics
      6. Detect inefficiencies
      7. Generate optimization suggestions
      8. Convert to list of dicts (JSON-serializable)
    """
    df = ingest_dataframe(df)
    df = generate_lane_ids(df)
    df = impute_emission_factors(df)
    df = calculate_co2(df)
    df = validate_and_derive(df)
    df = detect_inefficiencies(df)
    df = generate_optimizations(df)

    # Convert NaN → None for JSON serialization
    df = df.where(pd.notna(df), None)

    # Replace numpy types with Python scalars
    records = df.to_dict("records")
    return _sanitize_records(records)


def _sanitize_records(records: list[dict]) -> list[dict]:
    """Ensure all values are JSON-serializable standard Python types."""
    clean = []
    for row in records:
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, (np.integer,)):
                clean_row[k] = int(v)
            elif isinstance(v, (np.floating,)):
                if math.isnan(v) or math.isinf(v):
                    clean_row[k] = None
                else:
                    clean_row[k] = float(v)
            elif isinstance(v, np.bool_):
                clean_row[k] = bool(v)
            elif isinstance(v, (list, dict)):
                clean_row[k] = v
            elif v is None or (isinstance(v, float) and math.isnan(v)):
                clean_row[k] = None
            else:
                clean_row[k] = v
        clean.append(clean_row)
    return clean
