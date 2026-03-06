/**
 * api.ts — Client for the Python CIOA backend
 * 
 * Backend runs on http://localhost:8000
 * Endpoints:
 *   POST /process-upload   — upload CSV/Excel → processed JSON
 *   POST /process-default  — process bundled CSV → processed JSON
 *   GET  /health           — health check
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface BackendSummary {
    total_records: number;
    validation_flags: number;
    inefficient_shipments: number;
    optimization_candidates: number;
}

export interface BackendResponse {
    status: 'success' | 'error';
    record_count: number;
    summary: BackendSummary;
    data: Record<string, any>[];
}

/**
 * Call POST /process-default to load and process the bundled CSV
 * through the Python pipeline (cleaning → validation → CO₂ calc → inefficiencies → optimizations)
 */
export async function processDefaultDataset(): Promise<BackendResponse> {
    const res = await fetch(`${BACKEND_URL}/process-default`, { method: 'POST' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Backend error' }));
        throw new Error(err.detail || `Backend returned ${res.status}`);
    }
    return res.json();
}

/**
 * Call POST /process-upload to upload a user CSV/Excel file
 * through the Python pipeline
 */
export async function processUploadedFile(file: File): Promise<BackendResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BACKEND_URL}/process-upload`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || `Backend returned ${res.status}`);
    }
    return res.json();
}

/**
 * Health check
 */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${BACKEND_URL}/health`);
        return res.ok;
    } catch {
        return false;
    }
}
