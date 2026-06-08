import pandas as pd
import math
import map1

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))

def get_dist(p1, p2,hav):
    if hav:
        return haversine_km(p1[0], p1[1], p2[0], p2[1])
    return map1.get_distance_km(p1, p2)

def evaluate_schedule_metrics(
    employees_df: pd.DataFrame,
    vehicles_df: pd.DataFrame,
    baseline_df: pd.DataFrame,
    schedule_df: pd.DataFrame,
    metadata_df: pd.DataFrame,
    hav=False
):
    # ------------------------
    # Setup
    # ------------------------
    emp_idx = employees_df.set_index("employee_id")
    veh_idx = vehicles_df.set_index("vehicle_id")

    sharing_limit = {
        "single": 1,
        "double": 2,
        "triple": 3
    }

    metadata_df = metadata_df.set_index("key")
    max_delay = {
        i: metadata_df.loc[f"priority_{i}_max_delay_min"]["value"]
        for i in range(1, 6)
    }

    base_cost = baseline_df["baseline_cost"].sum()
    base_time = baseline_df["baseline_time_min"].sum()

    total_cost = 0
    total_time = 0
    total_drop_delay = 0
    violations = []

    # ------------------------
    # Normalize schedule
    # ------------------------
    schedule_df = schedule_df.copy()

    # Ensure correct index
    if not isinstance(schedule_df.index, pd.MultiIndex):
        schedule_df = schedule_df.set_index(["vehicle", "trip"])

    # ------------------------
    # Simulation 
    # ------------------------
    for veh_id, veh_group in schedule_df.groupby(level="vehicle"):
        if veh_id not in veh_idx.index:
            continue

        v = veh_idx.loc[veh_id]
        cur_lat, cur_lng = v["current_lat"], v["current_lng"]
        speed = v["avg_speed_kmph"]
        cost_km = v["cost_per_km"]
        capacity = v["capacity"]
        category = v["category"]

        start_time = v["available_from"]
        if isinstance(start_time, str):
            start_time = pd.to_datetime(start_time, format="%H:%M")
        cur_min = start_time.hour * 60 + start_time.minute

        veh_dist = 0

        for trip_id, trip in veh_group.groupby(level="trip"):
            rides = len(trip)
            if rides > capacity:
                violations.append(f"Capacity exceeded: {veh_id} trip {trip_id}")

            # --- Pickups ---
            for _, row in trip.iterrows():
                emp_id = str(row["employee_id"])
                if emp_id not in emp_idx.index:
                    continue

                emp = emp_idx.loc[emp_id]
                
                dist = get_dist((cur_lat, cur_lng),(emp["pickup_lat"], emp["pickup_lng"]),hav)
                travel = dist * 60 / speed
                cur_min += travel

                # Respect scheduled pickup time
                cur_min = max(cur_min, row["pickup_min"])

                veh_dist += dist
                cur_lat, cur_lng = emp["pickup_lat"], emp["pickup_lng"]

                # Vehicle preference
                if emp["vehicle_preference"] != "any" and emp["vehicle_preference"] != category:
                    violations.append(f"Vehicle pref violated: {emp_id}")

                # Sharing preference
                if rides > sharing_limit.get(emp["sharing_preference"], rides):
                    violations.append(f"Sharing pref violated: {emp_id}")

            # --- Drop ---
            last_emp = emp_idx.loc[str(trip["employee_id"].iloc[-1])]
            dist = get_dist(
                (cur_lat, cur_lng),
                (last_emp["drop_lat"], last_emp["drop_lng"]),
                hav
            )

            cur_min += dist * 60 / speed
            veh_dist += dist

            for _, row in trip.iterrows():
                emp = emp_idx.loc[str(row["employee_id"])]
                drop_min = row["drop_min"]

                delay = max(0, cur_min - drop_min)
                total_drop_delay += delay

                if cur_min > drop_min + max_delay[emp["priority"]]:
                    violations.append(f"Drop delay exceeded: {emp.name}")

            cur_lat, cur_lng = last_emp["drop_lat"], last_emp["drop_lng"]

        total_cost += veh_dist * cost_km
        total_time += (veh_dist * 60) / speed

    # ------------------------
    # Unassigned
    # ------------------------
    assigned = set(schedule_df["employee_id"].astype(str))
    all_emp = set(employees_df["employee_id"].astype(str))
    unassigned = list(all_emp - assigned)

    # ------------------------
    # Results
    # ------------------------
    return {
        "base_cost": round(base_cost, 2),
        "optimized_cost": round(total_cost, 2),
        "cost_savings_pct": round(((base_cost - total_cost) / base_cost) * 100, 2),
        "base_time_min": round(base_time, 2),
        "optimized_time_min": round(total_time, 2),
        "time_savings_pct": round(((base_time - total_time) / base_time) * 100, 2),
        "total_drop_delay": round(total_drop_delay, 2),
        "unassigned_count": len(unassigned),
        "unassigned_ids": unassigned,
        "violations": violations
    }

