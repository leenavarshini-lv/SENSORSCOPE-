"use strict";

const statusKeys = ["status", "state", "connection_status", "connection", "is_online", "is_connected"];
const onlineValues = new Set(["online", "active", "connected", "healthy", "up", "true", "1"]);
const offlineValues = new Set(["offline", "inactive", "disconnected", "unhealthy", "down", "false", "0"]);

const totalElement = document.querySelector("#total-devices");
const onlineElement = document.querySelector("#online-devices");
const offlineElement = document.querySelector("#offline-devices");
const countElement = document.querySelector("#device-count");
const messageElement = document.querySelector("#message");
const rowsElement = document.querySelector("#device-rows");
const emptyElement = document.querySelector("#empty-state");
const emptyDescriptionElement = document.querySelector("#empty-description");
const readingCountElement = document.querySelector("#reading-count");
const readingMessageElement = document.querySelector("#reading-message");
const readingRowsElement = document.querySelector("#reading-rows");
const readingEmptyElement = document.querySelector("#reading-empty-state");
const searchElement = document.querySelector("#device-search");
const refreshButton = document.querySelector("#refresh-button");
const systemStatusElement = document.querySelector("#system-status");
const systemStatusTextElement = document.querySelector("#system-status-text");

let devices = [];
let readings = [];

function getValue(device, keys) {
  const key = keys.find((candidate) => device[candidate] !== undefined && device[candidate] !== null && device[candidate] !== "");
  return key ? device[key] : "";
}

function formatLabel(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getStatus(device) {
  const value = getValue(device, statusKeys);
  const normalized = String(value).toLowerCase();
  if (onlineValues.has(normalized)) return { label: "Online", kind: "online" };
  if (offlineValues.has(normalized)) return { label: "Offline", kind: "offline" };
  if (value === "") return { label: "Unknown", kind: "" };
  return { label: formatLabel(value), kind: "" };
}

function renderDevices() {
  const query = searchElement.value.trim().toLowerCase();
  const filtered = devices.filter((device) => JSON.stringify(device).toLowerCase().includes(query));
  rowsElement.replaceChildren();

  for (const device of filtered) {
    const name = getValue(device, ["name", "device_name", "label", "title"]) || "Unnamed device";
    const identifier = getValue(device, ["id", "device_id", "uuid"]) || "—";
    const location = getValue(device, ["location", "site", "room", "area"]) || "—";
    const lastSeen = getValue(device, ["last_seen", "last_seen_at", "updated_at", "last_update", "created_at"]);
    const status = getStatus(device);
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const nameWrapper = document.createElement("div");
    nameWrapper.className = "device-name";
    const icon = document.createElement("span");
    icon.className = "device-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "⌁";
    const nameText = document.createElement("span");
    nameText.textContent = String(name);
    nameWrapper.append(icon, nameText);
    nameCell.append(nameWrapper);

    const identifierCell = document.createElement("td");
    identifierCell.textContent = String(identifier);
    const locationCell = document.createElement("td");
    locationCell.textContent = String(location);
    const statusCell = document.createElement("td");
    const statusPill = document.createElement("span");
    statusPill.className = `status-pill ${status.kind}`;
    statusPill.textContent = status.label;
    statusCell.append(statusPill);
    const lastSeenCell = document.createElement("td");
    lastSeenCell.textContent = formatDate(lastSeen);
    row.append(nameCell, identifierCell, locationCell, statusCell, lastSeenCell);
    rowsElement.append(row);
  }

  emptyElement.hidden = filtered.length > 0;
  emptyDescriptionElement.textContent = devices.length === 0
    ? "There are no devices registered yet."
    : "Try a different search to find a device.";
  countElement.textContent = query
    ? `${filtered.length} of ${devices.length} device${devices.length === 1 ? "" : "s"}`
    : `${devices.length} device${devices.length === 1 ? "" : "s"} registered`;
  renderReadings();
}

function renderReadings() {
  readingRowsElement.replaceChildren();
  const deviceNames = new Map(devices.map((device) => [
    String(getValue(device, ["id", "device_id", "uuid"])),
    getValue(device, ["name", "device_name", "label", "title"]),
  ]));

  for (const reading of readings) {
    const row = document.createElement("tr");
    const deviceCell = document.createElement("td");
    const deviceId = getValue(reading, ["device_id"]);
    deviceCell.textContent = deviceNames.get(String(deviceId)) || String(deviceId || "—");
    const temperatureCell = document.createElement("td");
    temperatureCell.textContent = String(reading.temperature ?? "—");
    const humidityCell = document.createElement("td");
    humidityCell.textContent = String(reading.humidity ?? "—");
    const recordedCell = document.createElement("td");
    recordedCell.textContent = formatDate(reading.recorded_at);
    row.append(deviceCell, temperatureCell, humidityCell, recordedCell);
    readingRowsElement.append(row);
  }

  readingEmptyElement.hidden = readings.length > 0;
  readingCountElement.textContent = `${readings.length} recent reading${readings.length === 1 ? "" : "s"}`;
}

async function loadDevices() {
  messageElement.classList.remove("error");
  messageElement.textContent = "Loading device data…";

  try {
    const response = await fetch("/api/devices", { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    if (!Array.isArray(payload.devices)) throw new Error("The device API returned an invalid response.");

    devices = payload.devices;
    totalElement.textContent = String(devices.length);
    onlineElement.textContent = String(devices.filter((device) => getStatus(device).kind === "online").length);
    offlineElement.textContent = String(devices.filter((device) => getStatus(device).kind === "offline").length);
    messageElement.textContent = "";
    renderDevices();
    return true;
  } catch (error) {
    devices = [];
    messageElement.classList.add("error");
    messageElement.textContent = error instanceof Error ? error.message : "Unable to load device data.";
    totalElement.textContent = "—";
    onlineElement.textContent = "—";
    offlineElement.textContent = "—";
    countElement.textContent = "Device list unavailable";
    rowsElement.replaceChildren();
    emptyElement.hidden = true;
    renderReadings();
    return false;
  }
}

async function loadReadings() {
  readingMessageElement.classList.remove("error");
  readingMessageElement.textContent = "Loading sensor data…";

  try {
    const response = await fetch("/api/readings", { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    if (!Array.isArray(payload.readings)) throw new Error("The readings API returned an invalid response.");

    readings = payload.readings;
    readingMessageElement.textContent = "";
    renderReadings();
    return true;
  } catch (error) {
    readings = [];
    readingMessageElement.classList.add("error");
    readingMessageElement.textContent = error instanceof Error ? error.message : "Unable to load sensor readings.";
    readingCountElement.textContent = "Sensor readings unavailable";
    readingRowsElement.replaceChildren();
    readingEmptyElement.hidden = true;
    return false;
  }
}

async function refreshDashboard() {
  if (refreshButton.disabled) return;
  refreshButton.disabled = true;
  refreshButton.setAttribute("aria-busy", "true");
  systemStatusTextElement.textContent = "Refreshing…";
  const [devicesLoaded, readingsLoaded] = await Promise.all([loadDevices(), loadReadings()]);
  const connected = devicesLoaded && readingsLoaded;
  systemStatusElement.classList.toggle("error", !connected);
  systemStatusTextElement.textContent = connected ? "System operational" : "Connection issue";
  refreshButton.disabled = false;
  refreshButton.removeAttribute("aria-busy");
}

searchElement.addEventListener("input", renderDevices);
refreshButton.addEventListener("click", refreshDashboard);
refreshDashboard();
window.setInterval(refreshDashboard, 30000);