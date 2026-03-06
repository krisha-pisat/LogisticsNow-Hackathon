"""Quick test for the /process-upload endpoint."""
import requests
import os
import json

BASE_URL = "http://localhost:8000"
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "carbon_intelligence_dataset.csv")

def test_health():
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    print("[PASS] /health")

def test_process_default():
    r = requests.post(f"{BASE_URL}/process-default")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["record_count"] == 1000
    print(f"[PASS] /process-default -> {data['record_count']} records")
    print(f"       Summary: {json.dumps(data['summary'], indent=2)}")

    # Validate record structure
    rec = data["data"][0]
    required_keys = [
        "calculated_co2_kg", "emission_per_ton_km", "validation_flag",
        "inefficiency_type", "optimization_suggestion", "looked_up_emission_factor",
        "lane_id",
    ]
    for key in required_keys:
        assert key in rec, f"Missing key: {key}"
    print(f"       All required columns present: {required_keys}")

def test_process_upload():
    with open(CSV_PATH, "rb") as f:
        r = requests.post(f"{BASE_URL}/process-upload", files={"file": ("test.csv", f, "text/csv")})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["record_count"] == 1000
    print(f"[PASS] /process-upload -> {data['record_count']} records")
    print(f"       Summary: {json.dumps(data['summary'], indent=2)}")

def test_upload_bad_file():
    r = requests.post(
        f"{BASE_URL}/process-upload",
        files={"file": ("test.txt", b"not a csv", "text/plain")},
    )
    assert r.status_code == 400
    print(f"[PASS] /process-upload rejects .txt -> {r.status_code}")

if __name__ == "__main__":
    test_health()
    test_process_default()
    test_process_upload()
    test_upload_bad_file()
    print("\n=== ALL TESTS PASSED ===")
