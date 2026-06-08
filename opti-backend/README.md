# KritiOpti2026

KritiOpti2026 is a vehicle assignment and trip-scheduling optimizer. It reads employee and vehicle test cases from Excel files, builds feasible pickup trips, and runs a Variable Neighborhood Search (VNS) optimizer to minimize a weighted objective (cost + time) while honoring capacities, time windows, sharing preferences and vehicle-type preferences. A Tester harness compares optimized results against baseline metrics and reports cost/time savings.

---

## Table of contents
- Project status
- Features
- Repository layout
- Requirements
- Preparing test data (expected Excel sheets & columns)
- How to run
- Key algorithmic components
- Outputs
- Configuration & tuning
- Development / testing suggestions
- Contributing
- License

---

## Project status
- Core algorithms implemented and runnable:
  - Data models for Employee / Vehicle
  - Greedy/permutation-based scheduler (`build_vehicle_schedule`)
  - Construction heuristic to create an initial solution
  - VNS optimizer (relocate, swap, insert) with a repair pass
  - Tester harness that computes baseline vs optimized cost/time savings
- End-to-end flow: read Excel testcases → run optimization → write CSV assignments → compare vs baseline.

---

## Features
- Deterministic scheduling ordering (for reproducibility)
- LRU-cached haversine distance to reduce recomputation
- Configurable weights for cost/time and unassigned penalty via metadata
- Multiple runs + VNS iterations to explore solution space
- Post-run reporting of savings (cost & time) vs baseline

---

## Repository layout (relevant files)
- `main.py` — core models, scheduler, constructor and VNS optimizer; `solve()` orchestrator
- `Tester.py` — runner + verification harness, reads baseline and prints savings
- `TestCases/` — (not committed) Excel testcases expected by the code
- `Output/` — directory where optimizer writes CSV results

---

## Requirements
- Python 3.8+ (3.10 suggested)
- Packages:
  - pandas
  - (standard library modules used: math, datetime, random, copy, itertools, functools, time)

Install dependencies (example):
```
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate
pip install pandas
```

(You can create a `requirements.txt` with `pandas` if desired.)

---

## Preparing test data (Excel sheets and expected columns)

Each testcase is an Excel workbook. The code expects these sheets with the following columns (names referenced in code):

1. `employees` (columns used)
   - `employee_id` (unique identifier)
   - `pickup_lat`, `pickup_lng`
   - `earliest_pickup` (time-like: "HH:MM" or Excel time)
   - `latest_drop` (time-like)
   - `priority` (int; used to index `metadata` delays)
   - `sharing_preference` (single|double|triple|any)
   - `vehicle_preference` (premium|normal|any)
   - `drop_lat`, `drop_lng` (employee drop/office coords used by Tester)

2. `vehicles` (columns used)
   - `vehicle_id` (unique identifier)
   - `current_lat`, `current_lng`
   - `capacity` (integer)
   - `avg_speed_kmph` (float)
   - `cost_per_km` (float)
   - `available_from` (time-like)
   - `category` (premium|normal)

3. `metadata` (optional; key/value rows)
   - keys like `priority_1_max_delay_min`, `priority_2_max_delay_min`, ... with numeric `value`
   - other tunable parameters may be added later

4. `baseline` (for Tester)
   - contains `baseline_cost` and `baseline_time_min` columns used to compute savings (format: one or more rows that are summed)

Folder structure:
- Place Excel testcases inside `TestCases/` relative to repository root.
- `Output/` directory will be created/used for CSV outputs.

---

## How to run

Quick run (default harness):
- Run the tester which calls the optimizer and produces comparisons:
```
python Tester.py
```
`Tester.py` contains an `inputs` list (e.g. `['TestCase_TC01.xlsx', ...]`) and calls `main.solve()` for each file. Edit that list to control which testcases run.

Run a single solve from `main` (example, from a Python REPL or script):
```python
import main
main.solve('TestCase_TC01.xlsx', x_runs=5, y_iters=100)
```

Notes:
- `x_runs` = number of randomized starts (higher explores more).
- `y_iters` = number of VNS iterations per run (higher is more thorough but slower).
- `Tester.py` sets `x_runs=10` and `y_iters=10000` by default (this can be computationally heavy — reduce for quick tests).

---

## Key algorithmic components (brief)

- build_vehicle_schedule(vehicle, candidates, office_loc, config)
  - For a given vehicle and candidate employees, explores small permutations (limited subset) to build trips (sequence of pickups then to office) while checking time windows, delays, and share limits.
  - Uses a score combining trip cost, time and a reward for serving more passengers (ALPHA/BETA/GAMMA weights).

- construct_solution(employees, vehicles, office_loc, config, randomize=False)
  - Builds an initial feasible assignment by running the scheduler per vehicle and marking assigned employees.

- vns_optimizer(...)
  - Variable Neighborhood Search with three neighborhood moves:
    - Relocate: move a passenger from one vehicle to another if feasible
    - Swap: exchange passengers between vehicles
    - Insert unassigned: attempt to place unassigned passengers into vehicles
  - Uses `calculate_global_obj` which combines cost and delay penalties; unassigned passengers attract a large penalty.

- Tester.py
  - Validates the output CSV for capacity, preferences, computes actual travel distances/times and summarizes cost/time savings vs baseline.

---

## Outputs
- For each testcase (e.g. `TestCase_TC01.xlsx`), the solver writes `Output/TestCase_TC01.csv` with columns:
  - `Vehicle`, `Category`, `Trip`, `Employee`, `Earliest`, `Pickup`, `Latest`, `MDm`, `Drop`, `DDelay`, `PDelay`, `Share`, `VehPref`
- Tester reads that CSV and prints summary metrics:
  - Total Cost (optimized vs baseline)
  - Total Time (hrs)
  - Net Profit (cost savings) and time efficiency gain

---

## Configuration & tuning
- `metadata` sheet can be used to override tunable params (currently used for priority delay thresholds).
- In `main.py`:
  - `Config` holds `w_cost`, `w_time`, `gamma`, and `unassigned_penalty` — change these to tune objective tradeoffs
  - `SHARE_LIMIT` maps sharing strings -> numeric limits
  - `ALPHA`, `BETA`, `GAMMA` inside `build_vehicle_schedule` influence trip scoring
- To scale or find better solutions:
  - Increase `x_runs` for more randomized starts
  - Increase `y_iters` for longer local search

---
