# Factory Monitoring System (Simulated AI CCTV)
## Overview
This project simulates a smart factory monitoring platform where camera detections (normally produced by an AI vision model) are ingested into a backend, stored, processed into metrics, and visualized on a dashboard.

Since no real cameras or AI models are used, the backend contains a **synthetic event generator** that mimics real‑world detections such as worker activity, workstation occupancy, and product production.

---
## Edge → Backend → Dashboard Architecture
### Edge (Simulated Camera + AI Model)
Normally this layer would include:

* CCTV cameras
* Computer vision model
* Worker & object detection
* Activity classification

In this project:
The backend generates realistic time‑series events to simulate edge output.

Generated events include:

* working
* idle
* absent
* product_count

Each event contains:

* timestamp
* worker_id
* workstation_id
* event_type
* confidence score
* count

---

### Backend (Node.js + Express + MongoDB)

Responsibilities:

* Ingest events
* Deduplicate events
* Store time‑series data
* Compute metrics
* Generate synthetic data

Key APIs:

* /init → Generate 8 hours historical data
* /add-events → Extend timeline (e.g. +2 hours)
* /events → Fetch raw events
* /metrics/* → Worker, workstation, factory analytics

---

### Dashboard (Frontend)

Displays:

* Worker utilization
* Idle vs working time
* Production counts
* Throughput rate
* Factory level efficiency

---

## Database Schema

### Event Collection

Time‑series record representing a detection

Fields:

* timestamp (indexed)
* worker_id (indexed)
* workstation_id (indexed)
* event_type (enum)
* confidence (0‑1 probability)
* count (units produced)
* event_hash (deduplication)

Compound indexes:

* worker_id + timestamp
* workstation_id + timestamp
* event_type + timestamp

---

### Worker Collection

Stores worker metadata

* worker_id
* name

### Workstation Collection

Stores station metadata

* station_id
* name
* type

---

## Metric Definitions

### Worker Metrics

* Active Time: Time spent in working state
* Idle Time: Time spent idle
* Utilization % = Active / (Active + Idle)
* Units Produced: Sum(product_count)
* Units per Hour = Units / Active Time

### Workstation Metrics

* Occupancy Time: Station not absent
* Utilization % = Occupied / Total Time
* Throughput Rate = Units / Occupied Time

### Factory Metrics

* Total Productive Time
* Total Production Count
* Average Utilization
* Average Production Rate

---

## Handling Real‑World Problems

### 1. Intermittent Connectivity

Solution:

* Edge devices batch events
* Backend supports batch ingestion
* Timestamp based reconstruction

Even if data arrives late → metrics remain correct because processing is time‑based not arrival‑based.

---

### 2. Duplicate Events

Handled using deterministic hashing

Steps:

1. Generate event_hash from event fields
2. Check ±1 second window
3. Skip if already exists

Prevents double counting from retries or reconnects.

---

### 3. Out‑of‑Order Timestamps

Events are always sorted before metric calculation.

Metrics depend on timestamps not insertion order.

Therefore late arrival does not corrupt analytics.

---

## Model Lifecycle (If Real AI Was Used)

### Model Versioning

Add fields:

* model_version
* model_type

Allows comparison of different AI versions on same factory.

---

### Model Drift Detection

Track over time:

* Average confidence
* Detection frequency
* Production correlation

Drift indicators:

* Sudden drop in confidence
* Production mismatch vs manual logs

---

### Trigger Retraining

Automatically trigger when:

* Confidence < threshold for long duration
* Prediction distribution shifts
* Human audit disagreement rises

Retraining pipeline:

1. Collect labeled samples
2. Train new model
3. Deploy new version
4. Compare metrics A/B

---

## Scaling Strategy

### From 5 Cameras → 100+ Cameras

Changes needed:

* Batch ingestion
* Partitioned collections
* Message queue (Kafka/RabbitMQ)

---

## Initial Data Generation

When /init is called:

* Backend simulates last 8 hours
* Generates event every 5 minutes per worker
* Inserts instantly (not real time)

When /add-events is called:

* Continues timeline from last timestamp
* Extends history (e.g. +2 hours)

---

## Assumptions & Tradeoffs

Assumptions:

* Workers do one activity at a time
* Production only occurs while working
* Confidence approximates detection reliability

Tradeoffs:

* Synthetic data instead of real AI
* Simpler analytics vs complex ML
* No real video storage
