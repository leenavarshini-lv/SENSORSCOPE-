# SensorScope

SensorScope is a lightweight Flask dashboard for monitoring IoT devices and viewing recent sensor readings stored in Supabase. The dashboard summarizes registered devices, shows their reported status, and displays the latest temperature and humidity readings with timestamps.

## Features

- Flask web dashboard with device and sensor-reading views.
- Device totals and online/offline summaries.
- Searchable device list.
- Latest 100 temperature and humidity readings.
- Dashboard refresh on demand and every 30 seconds.
- JSON API endpoints for device data, sensor readings, and database health.

## Requirements

- Python 3.10 or newer.
- A Supabase project with the tables described below.

## Run locally

1. Create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install dependencies:

   ```powershell
   python -m pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and set the URL and key for your Supabase project:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Start the application:

   ```powershell
   python app.py
   ```

5. Open <http://127.0.0.1:5000>.

Do not commit `.env` or put Supabase credentials in source code. Use a Supabase key with only the access required by your project's row-level security policies.

## Supabase data

The application expects these tables in the `public` schema:

- `devices`: a device table. The dashboard recognizes common columns such as `id`, `name`, `location`, `status`, and `last_seen`; it displays available values and uses fallbacks for missing optional fields.
- `sensor_readings`: columns `id`, `device_id`, `temperature`, `humidity`, and `recorded_at`. Readings are ordered newest first and limited to 100.

Sensor hardware or a separate ingestion service must write readings to Supabase; this Flask application reads and displays stored data but does not connect directly to sensors. Make sure Supabase row-level security allows the configured key to read the required records.

## API

- `GET /api/devices` - returns registered devices.
- `GET /api/readings` - returns the latest 100 sensor readings.
- `GET /api/health` - checks whether the `devices` table can be reached.

## Project layout

```text
app.py
templates/
  index.html
static/
  css/style.css
  js/dashboard.js/dashboard.js
requirements.txt
```
