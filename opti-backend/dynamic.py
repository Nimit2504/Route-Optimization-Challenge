import pandas as pd
import math
import datetime
import random
import copy
import time
import os
from itertools import permutations
from functools import lru_cache
# import map1

# ===================== 1. Config & Data Structures =====================

class Config:
    def __init__(self, meta_df=None):
        self.params = {}
        if meta_df is not None:
            for _, row in meta_df.iterrows():
                self.params[str(row['key'])] = row['value']

        self.w_cost = float(self.params.get("objective_cost_weight", 0.7))
        self.w_time = float(self.params.get("objective_time_weight", 0.3))
        self.gamma = 15.0
        self.unassigned_penalty = 1000000000  # 1 Billion

SHARE_LIMIT = {"single": 1, "double": 2, "triple": 3}

@lru_cache(maxsize=20000)
def haversine(loc1, loc2):
    R = 6371
    lat1, lon1 = math.radians(loc1[0]), math.radians(loc1[1])
    lat2, lon2 = math.radians(loc2[0]), math.radians(loc2[1])
    a = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return R * 2 * math.asin(math.sqrt(a))
    # return map1.get_distance_km(loc1, loc2)

def calc_time(dist, speed):
    return (dist / speed) * 60 if speed > 0 else float('inf')

def parse_time_str(t):
    if pd.isna(t): return 0
    if isinstance(t, (int, float)): return int(t)
    if isinstance(t, datetime.time): return t.hour * 60 + t.minute
    if isinstance(t, str):
        t = t.strip()
        if ':' in t:
            parts = list(map(int, t.split(':')))
            return parts[0] * 60 + parts[1]
        try: return int(t)
        except: return 0
    return 0

class Employee:
    def __init__(self, row_dict, config, office_loc):
        self.id = str(row_dict.get('employee_id'))
        self.pickup = (float(row_dict.get('pickup_lat')), float(row_dict.get('pickup_lng')))
        self.earliest = parse_time_str(row_dict.get('earliest_pickup'))
        self.latest = parse_time_str(row_dict.get('latest_drop'))
        self.EarliestStr = str(row_dict.get('earliest_pickup'))
        self.LatestStr = str(row_dict.get('latest_drop'))
        self.priority = int(row_dict.get('priority', 3))
        
        # New Field for Dynamic Logic
        self.request_type = str(row_dict.get('request_type', 'add')).lower().strip()

        if config:
            self.max_delay_min = float(config.params.get(f"priority_{self.priority}_max_delay_min", 30))
        else:
            self.max_delay_min = 30

        pref = str(row_dict.get('sharing_preference', 'any')).lower().strip()
        self.share_pref = pref if pref in SHARE_LIMIT else 'any'
        self.share_limit = SHARE_LIMIT.get(self.share_pref, 100)

        v_pref = str(row_dict.get('vehicle_preference', 'any')).lower().strip()
        self.veh_pref = v_pref if v_pref in ['premium', 'normal'] else 'any'
        self.dist_to_office = 0.0

class Vehicle:
    def __init__(self, row):
        self.id = row['vehicle_id']
        self.start_loc = (row['current_lat'], row['current_lng'])
        self.capacity = int(row['capacity'])
        self.speed = float(row['avg_speed_kmph'])
        self.cost_per_km = float(row['cost_per_km'])
        self.base_avail = parse_time_str(row['available_from'])
        self.current_time = self.base_avail
        self.current_loc = self.start_loc
        self.category = str(row.get('category', 'normal')).lower().strip()

def check_compatibility(employee, vehicle):
    if employee.veh_pref != "any" and employee.veh_pref != vehicle.category:
        return False
    return True

# ===================== 2. Scheduler & Optimizer =====================

def build_vehicle_schedule(vehicle, candidates, office_loc, config):
    candidates_sorted = sorted(candidates, key=lambda x: (x.earliest, x.id))
    state = {
        "time": vehicle.current_time,
        "loc": vehicle.current_loc,
        "speed": vehicle.speed,
        "cap": vehicle.capacity,
        "cost": vehicle.cost_per_km
    }
    ALPHA, BETA, GAMMA = config.w_cost, config.w_time, config.gamma

    assigned_in_this_run = []
    trips = []
    total_cost = 0
    total_delay = 0
    remaining = candidates_sorted[:]

    while True:
        feasible_pool = []
        for e in remaining:
            dist_to_pick = haversine(state["loc"], e.pickup)
            tty = calc_time(dist_to_pick, state["speed"])
            t_to_off = calc_time(e.dist_to_office, state["speed"])
            if state["time"] + tty + t_to_off <= e.latest + e.max_delay_min:
                feasible_pool.append(e)

        if not feasible_pool: break

        best = None
        best_score = float('inf')
        pool_subset = feasible_pool[:8]
        max_k = min(state["cap"], len(pool_subset))

        for k in range(1, max_k + 1):
            for subset in permutations(pool_subset, k):
                if any(k > s.share_limit for s in subset): continue

                t = state["time"]
                loc = state["loc"]
                dist = 0
                timeline = []
                ok = True

                for e in subset:
                    d = haversine(loc, e.pickup)
                    t += calc_time(d, state["speed"])
                    t = max(t, e.earliest)
                    if t > e.latest + e.max_delay_min: ok = False; break
                    delay = t - e.earliest
                    timeline.append((e, t, delay))
                    dist += d
                    loc = e.pickup

                if not ok: continue

                d_off = haversine(loc, office_loc)
                t_end = t + calc_time(d_off, state["speed"])
                group_deadline = min(e.latest + e.max_delay_min for e, _, _ in timeline)
                if t_end > group_deadline: continue

                dist += d_off
                trip_cost = dist * state["cost"]
                score = ALPHA * trip_cost + BETA * (t_end - state["time"]) - GAMMA * k

                if score < best_score:
                    best_score = score
                    best = (timeline, t_end, trip_cost)

        if best is None: break

        timeline, t_end, trip_cost = best
        trip_passengers = [x[0] for x in timeline]
        timings = {x[0].id: (x[1], x[2]) for x in timeline}
        delay_sum = sum(x[2] for x in timeline)

        trips.append({
            'passengers': trip_passengers,
            'pickup_times': timings,
            'drop_time': t_end,
            'cost': trip_cost,
            'delay': delay_sum
        })
        total_cost += trip_cost
        total_delay += delay_sum
        state["time"] = t_end
        state["loc"] = office_loc

        for p in trip_passengers:
            remaining.remove(p)
            assigned_in_this_run.append(p)

    return True, total_cost, total_delay, trips, len(assigned_in_this_run)

def construct_solution(employees, vehicles, office_loc, config, randomize=False):
    emp_list = sorted(employees, key=lambda x: (x.earliest, x.id))
    if randomize: random.shuffle(emp_list)
    assigned_ids = set()
    sol_map = {v.id: [] for v in vehicles}
    veh_list = sorted(vehicles, key=lambda v: v.capacity, reverse=True)
    if randomize: random.shuffle(veh_list)

    for v in veh_list:
        candidates = [e for e in emp_list if e.id not in assigned_ids and check_compatibility(e, v)]
        _, _, _, trips, count = build_vehicle_schedule(v, candidates, office_loc, config)
        if count > 0:
            for t in trips:
                sol_map[v.id].extend(t['passengers'])
                for p in t['passengers']: assigned_ids.add(p.id)

    unassigned = [e for e in employees if e.id not in assigned_ids]
    return sol_map, unassigned

def calculate_global_obj(solution, unassigned_count, config):
    obj = 0
    for v_id, meta in solution.items():
        obj += config.w_cost * meta['cost'] + config.w_time * meta['delay']
    obj += unassigned_count * config.unassigned_penalty
    return obj

def evaluate_full_solution(sol_map, vehicles, office_loc, config):
    full_sol = {}
    for v in vehicles:
        _, c, d, trips, _ = build_vehicle_schedule(v, sol_map[v.id], office_loc, config)
        full_sol[v.id] = {'vehicle': v, 'passengers': sol_map[v.id], 'cost': c, 'delay': d, 'trips': trips}
    return full_sol

def desperate_insertion(solution, unassigned_list, office_loc, config):
    if not unassigned_list: return solution, []
    remaining_unassigned = unassigned_list[:]
    vehicles_keys = list(solution.keys())

    for u in unassigned_list:
        inserted = False
        for v_id in vehicles_keys:
            vehicle_obj = solution[v_id]['vehicle']
            if not check_compatibility(u, vehicle_obj): continue
            
            current_pax = solution[v_id]['passengers']
            candidate_pax = current_pax + [u]
            _, c, d, trips, cnt = build_vehicle_schedule(vehicle_obj, candidate_pax, office_loc, config)

            if cnt == len(candidate_pax):
                solution[v_id]['passengers'] = candidate_pax
                solution[v_id]['cost'] = c
                solution[v_id]['delay'] = d
                solution[v_id]['trips'] = trips
                remaining_unassigned.remove(u)
                inserted = True
                break
        if not inserted:
            pass

    return solution, remaining_unassigned

def vns_optimizer(employees, vehicles, office_loc, config, iterations, initial_sol, initial_unassigned):
    current_sol = evaluate_full_solution(initial_sol, vehicles, office_loc, config)
    scheduled_ids = set()
    for v_id, meta in current_sol.items():
        for t in meta['trips']:
            for p in t['passengers']: scheduled_ids.add(p.id)
    current_unassigned = {e for e in employees if e.id not in scheduled_ids}

    best_sol = copy.deepcopy(current_sol)
    best_unassigned = list(current_unassigned)
    best_obj = calculate_global_obj(current_sol, len(best_unassigned), config)

    W_COST, W_TIME, PENALTY = config.w_cost, config.w_time, config.unassigned_penalty

    for _ in range(iterations):
        cand_sol = copy.deepcopy(best_sol)
        cand_unassigned = copy.deepcopy(best_unassigned)
        changed = False
        delta_obj = 0

        if len(cand_sol) >= 2:
            v1_id, v2_id = random.sample(list(cand_sol.keys()), 2)
            if cand_sol[v1_id]['passengers']:
                p = random.choice(cand_sol[v1_id]['passengers'])
                if check_compatibility(p, cand_sol[v2_id]['vehicle']):
                    new_p1 = [x for x in cand_sol[v1_id]['passengers'] if x.id != p.id]
                    new_p2 = cand_sol[v2_id]['passengers'] + [p]
                    _, c1, d1, t1, cnt1 = build_vehicle_schedule(cand_sol[v1_id]['vehicle'], new_p1, office_loc, config)
                    _, c2, d2, t2, cnt2 = build_vehicle_schedule(cand_sol[v2_id]['vehicle'], new_p2, office_loc, config)
                    if (cnt1 == len(new_p1)) and (cnt2 == len(new_p2)):
                        old_v1, old_v2 = cand_sol[v1_id], cand_sol[v2_id]
                        move_val = (W_COST * ((c1+c2)-(old_v1['cost']+old_v2['cost']))) + (W_TIME * ((d1+d2)-(old_v1['delay']+old_v2['delay'])))
                        if move_val < 0:
                            cand_sol[v1_id].update({'passengers': new_p1, 'cost': c1, 'delay': d1, 'trips': t1})
                            cand_sol[v2_id].update({'passengers': new_p2, 'cost': c2, 'delay': d2, 'trips': t2})
                            changed = True
                            delta_obj = move_val

        if cand_unassigned and not changed:
            u = random.choice(list(cand_unassigned))
            v_keys = list(cand_sol.keys())
            random.shuffle(v_keys)
            for v_id in v_keys:
                if check_compatibility(u, cand_sol[v_id]['vehicle']):
                    new_p = cand_sol[v_id]['passengers'] + [u]
                    _, c, d, t, cnt = build_vehicle_schedule(cand_sol[v_id]['vehicle'], new_p, office_loc, config)
                    if cnt == len(new_p):
                        old_v = cand_sol[v_id]
                        move_val = (W_COST * (c-old_v['cost'])) + (W_TIME * (d-old_v['delay'])) - PENALTY
                        if move_val < 0:
                            cand_sol[v_id].update({'passengers': new_p, 'cost': c, 'delay': d, 'trips': t})
                            cand_unassigned.remove(u)
                            changed = True
                            delta_obj = move_val
                            break

        if changed:
            best_sol = cand_sol
            best_unassigned = cand_unassigned
            best_obj += delta_obj

    return best_sol, list(best_unassigned), best_obj

# ===================== 3. Data Loaders & Helpers =====================

def remove_from_solution(solution, unassigned_list, emp_id, office_loc, config):
    """
    Finds and removes an employee from the solution or unassigned list.
    If removed from a vehicle, re-calculates that vehicle's schedule.
    """
    # 1. Check Unassigned List
    for i, u in enumerate(unassigned_list):
        if u.id == emp_id:
            print(f"   [DELETE] Removed {emp_id} from unassigned list.")
            unassigned_list.pop(i)
            return solution, unassigned_list

    # 2. Check Assigned Vehicles
    for v_id, meta in solution.items():
        found = False
        new_passengers = []
        for p in meta['passengers']:
            if p.id == emp_id:
                found = True
            else:
                new_passengers.append(p)
        
        if found:
            print(f"   [DELETE] Removed {emp_id} from Vehicle {v_id}. Re-calculating route...")
            # Rebuild schedule for this vehicle
            _, c, d, trips, _ = build_vehicle_schedule(meta['vehicle'], new_passengers, office_loc, config)
            # Update solution
            solution[v_id]['passengers'] = new_passengers
            solution[v_id]['cost'] = c
            solution[v_id]['delay'] = d
            solution[v_id]['trips'] = trips
            return solution, unassigned_list

    print(f"   [DELETE] Warning: ID {emp_id} not found in system.")
    return solution, unassigned_list

def load_dynamic_requests(filename, config, office_loc):
    if not os.path.exists(filename):
        return []
    
    try:
        if os.stat(filename).st_size == 0:
            return []
            
        df_dyn = pd.read_csv(filename)
        if df_dyn.empty:
            return []
            
        df_dyn.columns = [c.strip() for c in df_dyn.columns]
        dynamic_batches = {}
        
        for _, row in df_dyn.iterrows():
            r_dict = row.to_dict()
            req_time_str = str(r_dict.get('request_time', '09:00')).strip()
            req_time = parse_time_str(req_time_str)
            
            # Create Employee Object (includes request_type parsing)
            emp = Employee(r_dict, config, office_loc)
            
            if req_time not in dynamic_batches: dynamic_batches[req_time] = []
            dynamic_batches[req_time].append(emp)
            
        return sorted(dynamic_batches.items(), key=lambda x: x[0])
    except Exception as e:
        print(f"Warning: Could not read dynamic requests: {e}")
        return []

# ===================== 4. Simulation Engine =====================

def run_simulation(filename, x_runs=5, y_iters=50):
    
    # --- STEP 1: LOAD STATIC DATA ---
    if os.path.exists(f'TestCases/{filename}'): filepath = f'TestCases/{filename}'
    else: filepath = filename
        
    print(f"\n>>> SIMULATION START: {filename}")
    print(f"Runs: {x_runs} | VNS Iters: {y_iters}")
    
    xls = pd.ExcelFile(filepath)
    df_emp = pd.read_excel(xls, 'employees')
    df_veh = pd.read_excel(xls, 'vehicles')
    try: df_meta = pd.read_excel(xls, 'metadata')
    except: df_meta = None

    config = Config(df_meta)
    office_loc = (df_emp.iloc[0]['drop_lat'], df_emp.iloc[0]['drop_lng'])

    all_employees_map = {str(r['employee_id']): Employee(r.to_dict(), config, office_loc) for _, r in df_emp.iterrows()}
    original_employees = list(all_employees_map.values())
    original_vehicles = [Vehicle(r) for _, r in df_veh.iterrows()]

    print(f"Static Data: {len(original_employees)} employees, {len(original_vehicles)} vehicles.")

    
    dynamic_batches = []

    if dynamic_file:
        if os.path.exists(dynamic_file):
            dyn_path = dynamic_file
        elif os.path.exists(f"TestCases/{dynamic_file}"):
            dyn_path = f"TestCases/{dynamic_file}"
        else:
            print(f"Warning: Dynamic file '{dynamic_file}' not found. Skipping dynamics.")
            dyn_path = None

        if dyn_path:
            dynamic_batches = load_dynamic_requests(dyn_path, config, office_loc)

    print(f"Dynamic Data: Found {len(dynamic_batches)} interrupt events.")

    print(f"\n>>> PHASE 1: INITIAL STATIC OPTIMIZATION")
    best_sol = None
    best_obj = float('inf')
    best_una = []

    for i in range(x_runs):
        for v in original_vehicles:
            v.current_time = v.base_avail
            v.current_loc = v.start_loc
            
        sol_map, init_una = construct_solution(original_employees, original_vehicles, office_loc, config, randomize=(i>0))
        curr_sol, curr_una, curr_obj = vns_optimizer(
            original_employees, original_vehicles, office_loc, config,
            iterations=y_iters, initial_sol=sol_map, initial_unassigned=init_una
        )
        curr_sol, curr_una = desperate_insertion(curr_sol, curr_una, office_loc, config)
        curr_obj = calculate_global_obj(curr_sol, len(curr_una), config)

        if curr_obj < best_obj:
            best_obj = curr_obj
            best_sol = curr_sol
            best_una = curr_una

    print(f"Initial Static Cost: {best_obj:,.2f} | Unassigned: {len(best_una)}")

    # --- STEP 4: PROCESS DYNAMIC INTERRUPTS ---
    current_best_sol = best_sol
    current_best_una = best_una
    
    for interrupt_time, request_list in dynamic_batches:
        int_time_str = f"{int(interrupt_time)//60:02d}:{int(interrupt_time)%60:02d}"
        print(f"\n>>> INTERRUPT EVENT AT {int_time_str} | Total Events: {len(request_list)}")
        
        # Categorize Requests
        to_delete = []
        to_add = []
        
        for req in request_list:
            if req.request_type == 'delete':
                to_delete.append(req.id)
            elif req.request_type == 'modify':
                to_delete.append(req.id) # Remove old version
                to_add.append(req)       # Add new version
            else: # 'add'
                to_add.append(req)

        # 4a. Process Deletions First (to free up capacity)
        if to_delete:
            print(f"   Processing {len(to_delete)} deletions/modifications...")
            for del_id in to_delete:
                current_best_sol, current_best_una = remove_from_solution(
                    current_best_sol, current_best_una, del_id, office_loc, config
                )

        # 4b. Process Additions
        if to_add:
            print(f"   Processing {len(to_add)} additions/modifications...")
            
            # Register new employees in master map
            for e in to_add:
                all_employees_map[e.id] = e

            # Quick Insertion Attempt
            print("   Attempting Quick Insertion...")
            quick_sol = copy.deepcopy(current_best_sol)
            candidates = current_best_una + to_add
            quick_sol, quick_remaining = desperate_insertion(quick_sol, candidates, office_loc, config)
            
            if len(quick_remaining) == 0:
                print("   [SUCCESS] Quick Insertion handled all requests.")
                current_best_sol = quick_sol
                current_best_una = []
            else:
                print(f"   [PARTIAL/FAIL] {len(quick_remaining)} unassigned. Falling back to Re-optimization.")
                
                # Determine which trips are already "departed" relative to interrupt_time
                committed_trips_this_round = []
                # Pool includes unassigned + new additions
                pool_ids = set([u.id for u in current_best_una] + [e.id for e in to_add])
                
                vehicle_states = {}
                for v in original_vehicles:
                    vehicle_states[v.id] = {'time': v.base_avail, 'loc': v.start_loc}

                current_trips_flat = []
                for v_id, meta in current_best_sol.items():
                    for t in meta['trips']:
                        t['vehicle_id'] = v_id
                        current_trips_flat.append(t)
                
                for trip in current_trips_flat:
                    # Trip start is the first pickup
                    start_t = min(trip['pickup_times'].values(), key=lambda x: x[0])[0]
                    
                    if start_t < interrupt_time:
                        # Trip has started before interrupt -> Commited
                        committed_trips_this_round.append(trip)
                        v_id = trip['vehicle_id']
                        if trip['drop_time'] > vehicle_states[v_id]['time']:
                            vehicle_states[v_id]['time'] = trip['drop_time']
                            vehicle_states[v_id]['loc'] = office_loc
                    else:
                        # Trip hasn't started -> Break it up and put passengers back in pool
                        for p in trip['passengers']: pool_ids.add(p.id)

                pool_objects = [all_employees_map[eid] for eid in pool_ids if eid in all_employees_map]
                
                # Setup Dynamic Vehicles (Available from interrupt time or after committed trips)
                dynamic_vehicles = []
                for v in original_vehicles:
                    new_v = copy.deepcopy(v)
                    st = vehicle_states[v.id]
                    effective_start = max(st['time'], interrupt_time)
                    new_v.current_time = effective_start
                    new_v.current_loc = st['loc']
                    new_v.base_avail = effective_start
                    new_v.start_loc = st['loc']
                    dynamic_vehicles.append(new_v)
                
                if pool_objects:
                    best_dyn_obj = float('inf')
                    best_dyn_sol = None
                    best_dyn_una = []
                    
                    for r in range(x_runs):
                        sm, iu = construct_solution(pool_objects, dynamic_vehicles, office_loc, config, randomize=(r>0))
                        cs, cu, co = vns_optimizer(
                            pool_objects, dynamic_vehicles, office_loc, config, 
                            iterations=y_iters, initial_sol=sm, initial_unassigned=iu
                        )
                        cs, cu = desperate_insertion(cs, cu, office_loc, config)
                        co = calculate_global_obj(cs, len(cu), config)
                        
                        if co < best_dyn_obj:
                            best_dyn_obj = co
                            best_dyn_sol = cs
                            best_dyn_una = cu
                    
                    # Reconstruct Master Solution
                    new_master_sol = {}
                    for v in original_vehicles:
                        new_master_sol[v.id] = {'vehicle': v, 'passengers': [], 'trips': [], 'cost': 0, 'delay': 0}
                    
                    # Add Committed Trips
                    for t in committed_trips_this_round:
                        v_id = t['vehicle_id']
                        new_master_sol[v_id]['trips'].append(t)
                        new_master_sol[v_id]['passengers'].extend(t['passengers'])
                        new_master_sol[v_id]['cost'] += t['cost']
                        new_master_sol[v_id]['delay'] += t['delay']
                    
                    # Add New Dynamic Trips
                    for v_id, meta in best_dyn_sol.items():
                        for t in meta['trips']:
                            t['vehicle_id'] = v_id
                            new_master_sol[v_id]['trips'].append(t)
                            new_master_sol[v_id]['passengers'].extend(t['passengers'])
                            new_master_sol[v_id]['cost'] += meta['cost']
                            new_master_sol[v_id]['delay'] += meta['delay']

                    # Recalculate totals
                    for v_id, meta in new_master_sol.items():
                        c, d = 0, 0
                        for t in meta['trips']:
                            c += t['cost']
                            d += t['delay']
                        meta['cost'] = c
                        meta['delay'] = d
                    
                    current_best_sol = new_master_sol
                    current_best_una = best_dyn_una
                    print(f"   [RE-OPT DONE] Cost: {best_dyn_obj:,.2f} | Unassigned: {len(current_best_una)}")

    # --- STEP 5: OUTPUT GENERATION ---
    print("\n>>> FINAL OUTPUT GENERATION")
    
    # Helper to format HH:MM:00
    def fmt_full(mins):
        h = int(mins) // 60
        m = int(mins) % 60
        return f"{h:02d}:{m:02d}:00"

    # Helper to format HH:MM
    def fmt_short(mins):
        h = int(mins) // 60
        m = int(mins) % 60
        return f"{h:02d}:{m:02d}"

    final_trips = []
    total_final_cost = 0
    
    # Flatten structure for export
    for v_id, meta in current_best_sol.items():
        total_final_cost += meta['cost']
        # Sort trips for this vehicle by their first pickup time
        veh_trips = sorted(meta['trips'], key=lambda t: min(t['pickup_times'].values(), key=lambda x: x[0])[0])
        
        for idx, t in enumerate(veh_trips, 1):
            t['vehicle_id'] = v_id
            t['trip_num'] = idx
            # Backfill category if missing
            if 'category' not in t:
                for ov in original_vehicles:
                    if ov.id == v_id: t['category'] = ov.category; break
            final_trips.append(t)
            
    rows = []
    for trip in final_trips:
        d_time = trip['drop_time']
        
        # Sort passengers in a trip by pickup time
        trip_pax = sorted(trip['passengers'], key=lambda p: trip['pickup_times'][p.id][0])

        for p in trip_pax:
            p_time, p_delay = trip['pickup_times'][p.id]
            
            # Calculate PDelay: Actual Pickup - Earliest
            p_delay_calc = max(0, p_time - p.earliest)
            
            # Calculate DDelay: Actual Drop - Latest
            d_delay_calc = max(0, d_time - p.latest)

            rows.append({
                "Vehicle": trip['vehicle_id'],
                "Category": trip.get('category','normal'),
                "Trip": trip['trip_num'],
                "Employee": p.id,
                # Earliest formatted as HH:MM:00
                "Earliest": fmt_full(p.earliest),
                # Pickup formatted as HH:MM
                "Pickup": fmt_short(p_time),
                # Latest formatted as HH:MM:00
                "Latest": fmt_full(p.latest),
                "MDm": int(p.max_delay_min),
                # Drop formatted as HH:MM
                "Drop": fmt_short(d_time),
                "DDelay": int(d_delay_calc),
                "PDelay": int(p_delay_calc),
                "Share": p.share_pref,
                "VehPref": p.veh_pref
            })
            
    df_res = pd.DataFrame(rows)
    if not df_res.empty:
        # if showoutput: print(df_res.to_string(index=False))
        
        if not os.path.exists('Output'): os.makedirs('Output')
        outfilename = filename.split('.', 1)[0]
        if '\\' in outfilename: outfilename = outfilename.split('\\')[-1]
        if '/' in outfilename: outfilename = outfilename.split('/')[-1]
        df_res.to_csv(f'Output/{outfilename}.csv', index=False)
        print(f"\nSaved to Output/{outfilename}.csv")
        
    print(f"\nFINAL TOTAL COST: {total_final_cost:,.2f}")
    print(f"FINAL UNASSIGNED: {len(current_best_una)}")

def run_simulation_from_dfs(
    df_emp,
    df_veh,
    df_meta=None,
    dynamic_df=None,
    x_runs=5,
    y_iters=50
):
    """
    API-safe dynamic simulation runner.
    No filesystem access.
    """

    config = Config(df_meta)
    office_loc = (df_emp.iloc[0]['drop_lat'], df_emp.iloc[0]['drop_lng'])

    all_employees_map = {
        str(r['employee_id']): Employee(r.to_dict(), config, office_loc)
        for _, r in df_emp.iterrows()
    }
    original_employees = list(all_employees_map.values())
    original_vehicles = [Vehicle(r) for _, r in df_veh.iterrows()]

    # ---- Dynamic Requests (from DataFrame) ----
    dynamic_batches = []
    if dynamic_df is not None and not dynamic_df.empty:
        dynamic_df.columns = [c.strip() for c in dynamic_df.columns]
        batches = {}
        for _, row in dynamic_df.iterrows():
            r = row.to_dict()
            t = parse_time_str(str(r.get('request_time', '09:00')))
            emp = Employee(r, config, office_loc)
            batches.setdefault(t, []).append(emp)
        dynamic_batches = sorted(batches.items(), key=lambda x: x[0])

    # ---- INITIAL STATIC OPT ----
    best_sol, best_una, best_obj = None, [], float('inf')

    for i in range(x_runs):
        for v in original_vehicles:
            v.current_time = v.base_avail
            v.current_loc = v.start_loc

        sm, iu = construct_solution(
            original_employees,
            original_vehicles,
            office_loc,
            config,
            randomize=(i > 0)
        )

        cs, cu, _ = vns_optimizer(
            original_employees,
            original_vehicles,
            office_loc,
            config,
            y_iters,
            sm,
            iu
        )
        cs, cu = desperate_insertion(cs, cu, office_loc, config)
        obj = calculate_global_obj(cs, len(cu), config)

        if obj < best_obj:
            best_sol, best_una, best_obj = cs, cu, obj

    # ---- PROCESS DYNAMICS (UNCHANGED LOGIC) ----
    current_best_sol = best_sol
    current_best_una = best_una

    for interrupt_time, request_list in dynamic_batches:
        to_delete, to_add = [], []
        for r in request_list:
            if r.request_type == 'delete':
                to_delete.append(r.id)
            elif r.request_type == 'modify':
                to_delete.append(r.id)
                to_add.append(r)
            else:
                to_add.append(r)

        for d in to_delete:
            current_best_sol, current_best_una = remove_from_solution(
                current_best_sol, current_best_una, d, office_loc, config
            )

        if to_add:
            for e in to_add:
                all_employees_map[e.id] = e

            quick_sol = copy.deepcopy(current_best_sol)
            candidates = current_best_una + to_add
            quick_sol, quick_una = desperate_insertion(
                quick_sol, candidates, office_loc, config
            )

            if not quick_una:
                current_best_sol = quick_sol
                current_best_una = []
            else:
                current_best_una = quick_una

    # ---- FORMAT OUTPUT ----
    rows = []
    total_cost = 0

    for v_id, meta in current_best_sol.items():
        total_cost += meta['cost']
        for t_idx, t in enumerate(meta['trips'], 1):
            for p in t['passengers']:
                p_t, p_d = t['pickup_times'][p.id]
                rows.append({
                    "vehicle": v_id,
                    "category": meta['vehicle'].category,
                    "trip": t_idx,
                    "employee_id": p.id,
                    "pickup_min": int(p_t),
                    "drop_min": int(t['drop_time']),
                    "p_delay": int(p_d),
                    "d_delay": int(max(0, t['drop_time'] - p.latest))
                })

    return {
        "objective": float(total_cost),
        "unassigned": [u.id for u in current_best_una],
        "schedule": pd.DataFrame(rows)
    }

inputs = ["TestCase_TC03.xlsx"]
showoutput = True

if __name__ == "__main__":
    for f in inputs:
        run_simulation(f)
