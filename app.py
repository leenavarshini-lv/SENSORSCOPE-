
import os

from flask import Flask, jsonify, render_template
from dotenv import load_dotenv
from supabase import create_client

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise RuntimeError("Check SUPABASE_URL and SUPABASE_KEY in .env")

supabase = create_client(url, key)


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/devices")
def devices():
    try:
        response = supabase.table("devices").select("*").execute()
        return jsonify({"devices": response.data or []})
    except Exception:
        app.logger.exception("Device list request failed")
        return jsonify({"error": "Unable to load devices from the database."}), 503


@app.get("/api/readings")
def readings():
    try:
        response = (
            supabase.table("sensor_readings")
            .select("id,device_id,temperature,humidity,recorded_at")
            .order("recorded_at", desc=True)
            .limit(100)
            .execute()
        )
        return jsonify({"readings": response.data or []})
    except Exception:
        app.logger.exception("Sensor readings request failed")
        return jsonify({"error": "Unable to load sensor readings from the database."}), 503


@app.get("/api/health")
def health():
    try:
        supabase.table("devices").select("id").limit(1).execute()

        return jsonify({
            "api": "online",
            "database": "connected"
        })

    except Exception:
        app.logger.exception("Database connection check failed")
        return jsonify({
            "api": "online",
            "database": "connection_failed"
        }), 503


if __name__ == "__main__":
    app.run(debug=True)
