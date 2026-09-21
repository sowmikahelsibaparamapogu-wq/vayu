"""
CycloneGuard FastAPI Backend
Endpoints for Cyclone track forecasting, geospatial exposure analysis, and vulnerability scoring.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json
import os

app = FastAPI(
    title="CycloneGuard API",
    description="AI-based tropical cyclone impact zone forecasting and critical infrastructure vulnerability scoring system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data")
CYCLONES_FILE = os.path.join(DATA_DIR, "sample_cyclones.json")
INFRASTRUCTURE_FILE = os.path.join(DATA_DIR, "sample_infrastructure.geojson")

def load_json(filepath: str):
    if not os.path.exists(filepath):
        # Fallback to local path
        alt_path = os.path.join("data", os.path.basename(filepath))
        if os.path.exists(alt_path):
            filepath = alt_path
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "CycloneGuard FastAPI Service", "version": "1.0.0"}

@app.get("/api/cyclones")
def list_cyclones():
    return load_json(CYCLONES_FILE)

class StormParams(BaseModel):
    lat: float
    lon: float
    forwardSpeedKmh: float = 18.0
    headingDeg: float = 330.0
    centralPressureHpa: float = 950.0
    maxWindKmh: float = 180.0
    name: Optional[str] = "Simulated Cyclone"

@app.post("/api/cyclones/forecast")
def generate_forecast(params: StormParams):
    # Radius growth uncertainty model R(t) = R0 + 0.95 * t^1.15
    track_points = []
    import math
    current_lat = params.lat
    current_lon = params.lon
    current_wind = params.maxWindKmh
    current_pres = params.centralPressureHpa

    time_steps = [0, 12, 24, 36, 48, 72]
    for idx, t in enumerate(time_steps):
        if idx > 0:
            step_hours = t - time_steps[idx - 1]
            dist_km = params.forwardSpeedKmh * step_hours
            heading_rad = math.radians((params.headingDeg + idx * 1.8) % 360)
            d_lat = (dist_km * math.cos(heading_rad)) / 111.0
            d_lon = (dist_km * math.sin(heading_rad)) / (111.0 * math.cos(math.radians(current_lat)))
            current_lat += d_lat
            current_lon += d_lon
            if t >= 36:
                current_wind = max(50.0, current_wind * 0.88)
                current_pres = min(1005.0, current_pres + (1013 - current_pres) * 0.25)

        radius_km = round(35 + 0.95 * (t ** 1.18))
        track_points.append({
            "timeOffsetHours": t,
            "label": "T-0h (Current)" if t == 0 else f"+{t}h Forecast",
            "lat": round(current_lat, 3),
            "lon": round(current_lon, 3),
            "maxWindKmh": round(current_wind),
            "centralPressureHpa": round(current_pres),
            "category": "Severe Cyclonic Storm",
            "radiusKm": radius_km
        })

    return {
        "cycloneName": params.name,
        "trackPoints": track_points,
        "swatheRadiusKm": [p["radiusKm"] for p in track_points]
    }

@app.get("/api/infrastructure")
def get_infrastructure(type: Optional[str] = None, district: Optional[str] = None):
    data = load_json(INFRASTRUCTURE_FILE)
    features = data.get("features", [])
    if type and type != "all":
        features = [f for f in features if f["properties"].get("type") == type]
    if district and district != "All":
        features = [f for f in features if f["properties"].get("district", "").lower() == district.lower()]
    return {"type": "FeatureCollection", "count": len(features), "features": features}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
