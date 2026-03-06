"""
main.py — FastAPI application for the CIOA backend.

Provides a single /process-upload endpoint that accepts CSV or Excel files,
runs the full processing pipeline, and returns processed records as JSON.
"""

import io
import os
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .processors import process_upload

app = FastAPI(
    title="CIOA Processing Engine",
    description="Carbon Intelligence & Optimization Agent — Backend Data Processor",
    version="1.0.0",
)

# Allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_MB = 50


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "engine": "CIOA Processor v1.0"}


@app.post("/process-upload")
async def process_upload_endpoint(file: UploadFile = File(...)) -> JSONResponse:
    """
    Upload a CSV or Excel file.
    The file is parsed, cleaned, enriched, and returned as JSON records.

    Returns:
      200: { "status": "success", "record_count": N, "data": [...] }
      400: { "status": "error", "detail": "..." }
    """

    # ── 1. Validate file type ──
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Accepted: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # ── 2. Read file content ──
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # File size check
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed: {MAX_FILE_SIZE_MB} MB.",
        )

    # ── 3. Parse into DataFrame ──
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(content))
        elif ext in (".xlsx", ".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported format.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded file contains no data.")

    # ── 4. Run the processing pipeline ──
    try:
        records = process_upload(df)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Processing failed: {str(e)}",
        )

    # ── 5. Summary stats ──
    record_count = len(records)
    flagged = sum(1 for r in records if r.get("validation_flag"))
    inefficient = sum(1 for r in records if r.get("inefficiency_type") and len(r["inefficiency_type"]) > 0)
    optimizable = sum(1 for r in records if r.get("optimization_suggestion", "{}") != "{}")

    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "record_count": record_count,
            "summary": {
                "total_records": record_count,
                "validation_flags": flagged,
                "inefficient_shipments": inefficient,
                "optimization_candidates": optimizable,
            },
            "data": records,
        },
    )


@app.post("/process-default")
async def process_default_dataset() -> JSONResponse:
    """
    Process the bundled carbon_intelligence_dataset.csv without any upload.
    Useful for initial dashboard hydration.
    """
    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "carbon_intelligence_dataset.csv",
    )

    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Default dataset not found.")

    try:
        df = pd.read_csv(csv_path)
        records = process_upload(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    record_count = len(records)
    flagged = sum(1 for r in records if r.get("validation_flag"))
    inefficient = sum(1 for r in records if r.get("inefficiency_type") and len(r["inefficiency_type"]) > 0)
    optimizable = sum(1 for r in records if r.get("optimization_suggestion", "{}") != "{}")

    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "record_count": record_count,
            "summary": {
                "total_records": record_count,
                "validation_flags": flagged,
                "inefficient_shipments": inefficient,
                "optimization_candidates": optimizable,
            },
            "data": records,
        },
    )
