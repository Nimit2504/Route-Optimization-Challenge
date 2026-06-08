import pandas as pd
import math
import datetime
import random
import copy
from itertools import permutations
from functools import lru_cache
import time
import map1
random.seed(time.time())
showoutput = True

# ===================== 1. Data Structures & Config =====================

class Config:
    def __init__(self, meta_df=None):
        self.params = {}
        if meta_df is not None:
            for _, row in meta_df.iterrows():
                self.params[str(row['key'])] = row['value']

        self.w_cost = float(self.params.get("objective_cost_weight", 0.7))
        self.w_time = float(self.params.get("objective_time_weight", 0.3))
        self.gamma = 15.0
        
        # 1 Million Penalty ensures we never prefer dropping a passenger
        self.unassigned_penalty = 1000000000

SHARE_LIMIT = {"single": 1, "double": 2, "triple": 3}

class Employee:
    def __init__(self, row, config):
        self.id = row['employee_id']
        self.pickup = (row['pickup_lat'], row['pickup_lng'])
        self.earliest = self._parse_time(row['earliest_pickup'])
        self.Earliest = row['earliest_pickup']
        self.latest = self._parse_time(row['latest_drop'])
        self.Latest = row['latest_drop']
        self.priority = int(row.get('priority', 3))
        self.max_delay_min = config.params.get(f"priority_{self.priority}_max_delay_min",float('inf'))
        pref = str(row.get('sharing_preference', 'any')).lower().strip()
        self.share_pref = pref if pref in SHARE_LIMIT else 'any'
        self.share_limit = SHARE_LIMIT.get(self.share_pref, 100)

        v_pref = str(row.get('vehicle_preference', 'any')).lower().strip()
        self.veh_pref = v_pref if v_pref in ['premium', 'normal'] else 'any'
        self.orginal_veh_pref = self.veh_pref
        self.original_share_pref = self.share_pref
        self.original_share_limit = self.share_limit

    def _parse_time(self, t):
        if pd.isna(t): return 0
        if isinstance(t, datetime.time): return t.hour * 60 + t.minute
        if isinstance(t, str):
            parts = list(map(int, t.split(':')))
            if len(parts) >= 2: return parts[0] * 60 + parts[1]
        return int(t)

class Vehicle:
    def __init__(self, row):
        self.id = row['vehicle_id']
        self.start_loc = (row['current_lat'], row['current_lng'])
        self.capacity = int(row['capacity'])
        self.speed = float(row['avg_speed_kmph'])
        self.cost_per_km = float(row['cost_per_km'])
        self.avail_from = self._parse_time(row['available_from'])

        cat = str(row.get('category', 'normal')).lower().strip()
        self.category = cat if cat in ['premium', 'normal'] else 'normal'

    def _parse_time(self, t):
        if pd.isna(t): return 0
        if isinstance(t, datetime.time): return t.hour * 60 + t.minute
        if isinstance(t, str):
            parts = list(map(int, t.split(':')))
            if len(parts) >= 2: return parts[0] * 60 + parts[1]
        return int(t)

# ===================== 2. Common Logic =====================

@lru_cache(maxsize=20000)
def haversine(loc1, loc2,hav):
    if not hav:
        return map1.get_distance_km(loc1, loc2)
    R = 6371
    lat1, lon1 = math.radians(loc1[0]), math.radians(loc1[1])
    lat2, lon2 = math.radians(loc2[0]), math.radians(loc2[1])
    a = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return R*2*math.asin(math.sqrt(a))

def calc_time(dist, speed):
    return (dist / speed) * 60 if speed > 0 else float('inf')

def check_compatibility(employee, vehicle):
    if employee.veh_pref != "any" and employee.veh_pref != vehicle.category:
        return False
    return True

# ===================== 3. Robust Scheduler Engine =====================

def build_vehicle_schedule(vehicle, candidates, office_loc, config, hav=False):
    # Sort by (Time, ID) for 100% deterministic behavior
    sorted_candidates = sorted(candidates, key=lambda x: (x.earliest, x.id))

    state = {
        "time": vehicle.avail_from,
        "loc": vehicle.start_loc,
        "speed": vehicle.speed,
        "cap": vehicle.capacity,
        "cost": vehicle.cost_per_km
    }

    ALPHA, BETA, GAMMA = config.w_cost, config.w_time, config.gamma

    assigned_in_this_run = []
    trips = []
    total_cost = 0
    total_delay = 0

    remaining = sorted_candidates[:]

    while True:
        feasible_pool = []
        for e in remaining:
            travel = calc_time(haversine(state["loc"], e.pickup, hav), state["speed"])
            if state["time"] + travel <= e.latest + e.max_delay_min:
                feasible_pool.append(e)

        if not feasible_pool:
            break

        best = None
        best_score = float('inf')
        feasible_pool.sort(key=lambda e: (
            haversine(state["loc"], e.pickup, hav) + (haversine(e.pickup, office_loc, hav) * 0.5), 
            e.latest
        ))
        pool_subset = feasible_pool[:8]
        max_k = min(state["cap"], len(pool_subset))

        for k in range(1, max_k + 1):
            for subset in permutations(pool_subset, k):
                if any(k > s.share_limit for s in subset):
                    continue

                t = state["time"]
                loc = state["loc"]
                dist = 0
                timeline = []
                ok = True

                for e in subset:
                    d = haversine(loc, e.pickup, hav)
                    t += calc_time(d, state["speed"])
                    t = max(t, e.earliest)
                    if t > e.latest + e.max_delay_min:
                        ok = False; break

                    delay = t - e.earliest
                    timeline.append((e, t, delay))
                    dist += d
                    loc = e.pickup

                if not ok: continue

                d_off = haversine(loc, office_loc, hav)
                t_end = t + calc_time(d_off, state["speed"])

                if any(t_end > e.latest + e.max_delay_min for e, _, _ in timeline):
                    continue
                drop_delay_sum = 0
                for e,_,_ in timeline:
                    drop_delay_sum += max(0,t_end-e.latest)
                dist += d_off
                trip_cost = dist * state["cost"]

                score = ALPHA*trip_cost + BETA*(t_end-state["time"] + drop_delay_sum)-GAMMA*k
                if score < best_score:
                    best_score = score
                    best = (timeline, t_end, trip_cost,drop_delay_sum)
        if best is None:
            break

        timeline, t_end, trip_cost, drop_delay_sum = best

        trip_passengers = [x[0] for x in timeline]
        timings = {x[0].id: (x[1], x[2]) for x in timeline}
        delay_sum = sum(x[2] for x in timeline)

        trips.append({
            'passengers': trip_passengers,
            'pickup_times': timings,
            'drop_time': t_end
        })

        total_cost += trip_cost
        total_delay += delay_sum + drop_delay_sum
        state["time"] = t_end
        state["loc"] = office_loc

        assigned_in_this_run.extend(trip_passengers)
        for p in trip_passengers:
            remaining.remove(p)

    return True, total_cost, total_delay, trips, len(assigned_in_this_run)

# ===================== 4. Construction =====================

def construct_solution(employees, vehicles, office_loc, config, randomize=False, hav=False):
    emp_list = employees[:]
    if randomize:
        random.shuffle(emp_list)
    else:
        emp_list.sort(key=lambda x: (x.earliest, x.id))

    assigned_ids = set()
    sol_map = {v.id: [] for v in vehicles}

    veh_list = vehicles[:]
    if randomize:
        random.shuffle(veh_list)

    for v in veh_list:
        candidates = []
        for e in emp_list:
            if e.id in assigned_ids: continue
            if check_compatibility(e, v):
                candidates.append(e)

        _, _, _, trips, count = build_vehicle_schedule(v, candidates, office_loc, config, hav)

        if count > 0:
            for t in trips:
                sol_map[v.id].extend(t['passengers'])
                for p in t['passengers']:
                    assigned_ids.add(p.id)

    unassigned = [e for e in employees if e.id not in assigned_ids]
    return sol_map, unassigned

# ===================== 5. VNS Optimizer =====================

def calculate_global_obj(solution, unassigned_count, config):
    obj = 0
    for v_id, meta in solution.items():
        obj += config.w_cost * meta['cost']
        obj += config.w_time * meta['delay']
    obj += unassigned_count * config.unassigned_penalty
    return obj

def repair_unassigned(best_sol, best_unassigned, office_loc, config, hav=False):
    """
    Final Desperate Insertion to fix any unassigned.
    """
    if not best_unassigned:
        return best_sol, best_unassigned

    remaining = sorted(list(best_unassigned), key=lambda x: x.priority)
    still_unassigned = []
    vehicle_keys = list(best_sol.keys())

    for u in remaining:
        inserted = False
        random.shuffle(vehicle_keys)
        for v_id in vehicle_keys:
            if check_compatibility(u, best_sol[v_id]['vehicle']):
                current_pax = best_sol[v_id]['passengers']
                new_p = current_pax + [u]
                _, c, d, t, cnt = build_vehicle_schedule(best_sol[v_id]['vehicle'], new_p, office_loc, config, hav)

                if cnt == len(new_p):
                    best_sol[v_id].update({'passengers': new_p, 'cost': c, 'delay': d, 'trips': t})
                    inserted = True
                    break
        if not inserted:
            still_unassigned.append(u)
    return best_sol, still_unassigned
                                                    
def vns_optimizer(employees, vehicles, office_loc, config, iterations, initial_sol, initial_unassigned, hav=False):

    current_sol = {}
    current_unassigned_list = list(initial_unassigned)

    # 1. Evaluate & AUDIT Initial Solution
    for v in vehicles:
        _, c, d, trips, cnt = build_vehicle_schedule(v, initial_sol[v.id], office_loc, config, hav)

        # Check if anyone was dropped during re-evaluation
        if cnt < len(initial_sol[v.id]):
            # Find who was dropped
            scheduled_ids = set()
            for t in trips:
                for p in t['passengers']:
                    scheduled_ids.add(p.id)
            for p in initial_sol[v.id]:
                if p.id not in scheduled_ids:
                    current_unassigned_list.append(p)

        current_sol[v.id] = {
            'vehicle': v,
            'passengers': initial_sol[v.id], # Use original list, VNS will try to fix it or Penalty will show
            'cost': c,
            'delay': d,
            'trips': trips
        }

    best_sol = copy.deepcopy(current_sol)
    best_unassigned = set(current_unassigned_list)
    best_obj = calculate_global_obj(best_sol, len(best_unassigned), config)

    W_COST, W_TIME, PENALTY = config.w_cost, config.w_time, config.unassigned_penalty

    # 2. Optimization Loop
    for _ in range(iterations):
        move_applied = False

        # A. Relocate
        if len(best_sol) >= 2:
            v1_id, v2_id = random.sample(list(best_sol.keys()), 2)
            if best_sol[v1_id]['passengers']:
                p = random.choice(best_sol[v1_id]['passengers'])
                if check_compatibility(p, best_sol[v2_id]['vehicle']):
                    new_p1 = [x for x in best_sol[v1_id]['passengers'] if x.id != p.id]
                    new_p2 = best_sol[v2_id]['passengers'] + [p]

                    _, c1, d1, t1, cnt1 = build_vehicle_schedule(best_sol[v1_id]['vehicle'], new_p1, office_loc, config,hav)
                    _, c2, d2, t2, cnt2 = build_vehicle_schedule(best_sol[v2_id]['vehicle'], new_p2, office_loc, config,hav)

                    if (cnt2 == len(new_p2)) and (cnt1 == len(new_p1)):
                        old_v1 = best_sol[v1_id]
                        old_v2 = best_sol[v2_id]
                        delta = (W_COST*(c1+c2) + W_TIME*(d1+d2)) - (W_COST*(old_v1['cost']+old_v2['cost']) + W_TIME*(old_v1['delay']+old_v2['delay']))

                        if delta < 0:
                            best_sol[v1_id].update({'passengers': new_p1, 'cost': c1, 'delay': d1, 'trips': t1})
                            best_sol[v2_id].update({'passengers': new_p2, 'cost': c2, 'delay': d2, 'trips': t2})
                            best_obj += delta
                            move_applied = True

        # B. Swap
        if len(best_sol) >= 2 and not move_applied:
            v1_id, v2_id = random.sample(list(best_sol.keys()), 2)
            if best_sol[v1_id]['passengers'] and best_sol[v2_id]['passengers']:
                p1 = random.choice(best_sol[v1_id]['passengers'])
                p2 = random.choice(best_sol[v2_id]['passengers'])
                if check_compatibility(p1, best_sol[v2_id]['vehicle']) and check_compatibility(p2, best_sol[v1_id]['vehicle']):
                    new_p1 = [x for x in best_sol[v1_id]['passengers'] if x.id != p1.id] + [p2]
                    new_p2 = [x for x in best_sol[v2_id]['passengers'] if x.id != p2.id] + [p1]

                    _, c1, d1, t1, cnt1 = build_vehicle_schedule(best_sol[v1_id]['vehicle'], new_p1, office_loc, config,hav)
                    _, c2, d2, t2, cnt2 = build_vehicle_schedule(best_sol[v2_id]['vehicle'], new_p2, office_loc, config,hav)

                    if (cnt1 == len(new_p1)) and (cnt2 == len(new_p2)):
                        old_v1 = best_sol[v1_id]
                        old_v2 = best_sol[v2_id]
                        delta = (W_COST*(c1+c2) + W_TIME*(d1+d2)) - (W_COST*(old_v1['cost']+old_v2['cost']) + W_TIME*(old_v1['delay']+old_v2['delay']))
                        if delta < 0:
                            best_sol[v1_id].update({'passengers': new_p1, 'cost': c1, 'delay': d1, 'trips': t1})
                            best_sol[v2_id].update({'passengers': new_p2, 'cost': c2, 'delay': d2, 'trips': t2})
                            best_obj += delta
                            move_applied = True

        # C. Insert Unassigned
        if best_unassigned and not move_applied:
            u = random.choice(list(best_unassigned))
            v_keys = list(best_sol.keys())
            random.shuffle(v_keys)
            for v_id in v_keys:
                if check_compatibility(u, best_sol[v_id]['vehicle']):
                    new_p = best_sol[v_id]['passengers'] + [u]
                    _, c, d, t, cnt = build_vehicle_schedule(best_sol[v_id]['vehicle'], new_p, office_loc, config, hav)

                    if cnt == len(new_p):
                        old_v = best_sol[v_id]
                        increase = (W_COST*c + W_TIME*d) - (W_COST*old_v['cost'] + W_TIME*old_v['delay'])
                        if increase < PENALTY:
                            best_sol[v_id].update({'passengers': new_p, 'cost': c, 'delay': d, 'trips': t})
                            best_unassigned.remove(u)
                            best_obj = best_obj + increase - PENALTY
                            break

    # 3. Final Repair
    if best_unassigned:
        best_sol, u_list = repair_unassigned(best_sol, best_unassigned, office_loc, config, hav)
        best_obj = calculate_global_obj(best_sol, len(u_list), config)
        return best_sol, u_list, best_obj

    return best_sol, list(best_unassigned), best_obj

def enforce_feasibility(employees, vehicles, office_loc, config, hav=False):
    """
    Attempts to find a feasible solution by progressively relaxing constraints.
    """

    best_sol = None
    best_unassigned = None
    best_unassigned_count = float('inf')
    best_employees = None 

    def update_best(sol, una, emps):
        nonlocal best_sol, best_unassigned, best_unassigned_count, best_employees
        if len(una) < best_unassigned_count:
            best_sol = copy.deepcopy(sol)
            best_unassigned = list(una)
            best_employees = copy.deepcopy(emps)
            best_unassigned_count = len(una)
        return len(una) == 0

    current_employees = copy.deepcopy(employees)
    current_vehicles = copy.deepcopy(vehicles)

    for e in current_employees:
        e.veh_pref = 'any'

    sol, una = construct_solution(
        current_employees,
        current_vehicles,
        office_loc,
        config,
        hav=hav
    )

    if update_best(sol, una, current_employees):
        return best_sol, best_unassigned, best_employees

    max_share_limit = 6 

    for target_share in range(2, max_share_limit + 1):

        changed_any = False

        for e in current_employees:
            if e.share_limit < target_share:
                e.share_limit = target_share
                changed_any = True

        if not changed_any:
            continue

        sol, una = construct_solution(
            current_employees,
            current_vehicles,
            office_loc,
            config,
            hav=hav
        )

        if update_best(sol, una, current_employees):
            return best_sol, best_unassigned, best_employees

    return best_sol, best_unassigned, best_employees


def solve(filename,hav=False, x_runs = 10, y_iters = 200):
    xls = pd.ExcelFile(f'TestCases\{filename}')
    df_emp = pd.read_excel(xls, 'employees')
    df_veh = pd.read_excel(xls, 'vehicles')
    try: df_meta = pd.read_excel(xls, 'metadata')
    except: df_meta = None
    try: df_base = pd.read_excel(xls,'baseline')
    except: df_base = None
    config = Config(df_meta)
    office_loc = (df_emp.iloc[0]['drop_lat'], df_emp.iloc[0]['drop_lng'])
    employees = [Employee(r,config) for _, r in df_emp.iterrows()]
    vehicles = [Vehicle(r) for _, r in df_veh.iterrows()]
    map1.init_distance_matrix(employees, vehicles, office_loc)
    # if df_base is not None and 'baseline_cost' in df_base.columns:
    #     avg_baseline_cost = df_base['baseline_cost'].mean()
    #     #config.gamma = config.w_cost * avg_baseline_cost
    gamma_list = [5,10,15,35,45,75,85,100,125]    
    global_best_sol = None
    all_results = []
    for gamma in gamma_list:
        config.gamma = gamma
        global_best_sol = None
        global_best_unassigned = []
        # Track (Unassigned Count, Is_Relaxed (0 or 1), Objective)
        global_best_score = (float('inf'), float('inf'), float('inf'))
        global_bool = False
        cnt = 0
        for i in range(x_runs):
            is_relaxed = 0  # Track if this specific run relies on relaxed constraints
            sol_map, unassigned = construct_solution(
                employees, vehicles, office_loc, config, randomize=True
            )
            sol, final_una, obj = vns_optimizer(
                employees, vehicles, office_loc, config,
                y_iters, sol_map, unassigned
            )
            # --- Start of Enforce Feasibility Logic ---
            if len(final_una) > 0:

                # if showoutput:
                #     print(f"  > Run {i+1}: Found {len(final_una)} unassigned. Enforcing feasibility...")

                emp_fresh = copy.deepcopy(employees)
                veh_fresh = copy.deepcopy(vehicles)

                rel_sol, rel_una, rel_employees = enforce_feasibility(
                    emp_fresh, veh_fresh, office_loc, config, hav
                )

                if rel_sol:

                    rel_sol, rel_una, rel_obj = vns_optimizer(
                        rel_employees, veh_fresh, office_loc, config,
                        y_iters, rel_sol, rel_una
                    )

                    # Accept ONLY if unassigned strictly decreases
                    if len(rel_una) < len(final_una):
                        sol, final_una, obj = rel_sol, rel_una, rel_obj
                        is_relaxed = 1

                        # if showoutput:
                        #     print(f"  > Enforce successful. Unassigned reduced to {len(final_una)}.")
                    #else:
                        # if showoutput:
                        #     print("  > Relaxation did not reduce unassigned. Ignoring.")

            # --- End of Enforce Feasibility Logic ---

            # if showoutput:
            #     print(f"Run {i+1}: Obj {obj:.0f} | Unassigned {len(final_una)} | Relaxed: {bool(is_relaxed)}")

            if is_relaxed:
                cnt += 1

            # Create the current score tuple
            current_score = (len(final_una), is_relaxed, obj)

            # Python compares tuples element by element
            if current_score < global_best_score:
                global_best_score = current_score
                global_best_sol = sol
                global_best_unassigned = final_una

        # Store best result for this gamma
        all_results.append({
            "gamma": gamma,
            "solution": global_best_sol,
            "unassigned": global_best_unassigned,
            "relaxed": global_best_score[1],
            "objective": global_best_score[2]
        })
    # ================= FINAL SELECTION =================

   
    perfect_solutions = [
        r for r in all_results
        if len(r["unassigned"]) == 0 and r["relaxed"] == 0
    ]

    if perfect_solutions:
        best_final = min(perfect_solutions, key=lambda x: x["objective"])
    else:
       
        best_final = min(all_results, key=lambda x: x["objective"])

    global_best_sol = best_final["solution"]
    global_best_unassigned = best_final["unassigned"]

    if showoutput:
        print("\n================ FINAL BEST RESULT ================")
        print(f"Selected GAMMA: {best_final['gamma']}")
        print(f"Objective: {best_final['objective']:.2f}")
        print(f"Unassigned: {len(best_final['unassigned'])}")
        print(f"Relaxed Used: {bool(best_final['relaxed'])}")
        print("===================================================")
    if showoutput:
        print("="*50)
        # Extract the objective from the 3rd element of the tuple (index 2)
        print(f"BEST OBJECTIVE: {global_best_score[2]:.2f}") 
        print(f"Total Unassigned: {len(global_best_unassigned)}")
        print(f"Used Relaxed Constraints: {bool(global_best_score[1])}")
        if global_best_unassigned:
            print(f"IDs: {[u.id for u in global_best_unassigned]}")
        print("="*50)
        print("CNT: ",cnt)
    rows = []
    if global_best_sol:
        for v_id, meta in global_best_sol.items():
            for trip_idx, trip in enumerate(meta['trips'], 1):
                for p in trip['passengers']:
                    p_t, p_d = trip['pickup_times'][p.id]
                    d_t = trip['drop_time']
                    rows.append({
                        "Vehicle": v_id,
                        "Category": meta['vehicle'].category,
                        "Trip": trip_idx,
                        "Employee": p.id,
                        "Earliest": p.Earliest,
                        "Pickup": f"{int(p_t)//60:02d}:{int(p_t)%60:02d}",
                        "Latest": p.Latest,
                        "MDm": p.max_delay_min, #MaxDelaymin
                        "Drop": f"{int(trip['drop_time'])//60:02d}:{int(trip['drop_time'])%60:02d}",
                        "DDelay": int(max(0,d_t-p.latest)),
                        "PDelay": int(p_d),
                        "Share": p.share_pref,
                        "VehPref": p.veh_pref
                    })

    df_out = pd.DataFrame(rows)
    if not df_out.empty:
        sorted_df = df_out.sort_values(['Category', 'Vehicle', 'Trip', 'Pickup'])
        if showoutput:
            print(sorted_df.to_string(index=False))
        outfilename = filename.split('.', 1)[0]
        sorted_df.to_csv(f'Output/{outfilename}.csv', index=False)
        print(f"\nSaved schedule to Output/{outfilename}.csv")
    else:
        print("No valid schedule found.")


def solve_from_dfs(
    df_emp,
    df_veh,
    df_meta=None,
    hav=False,
    x_runs=None,
    y_iters=None
):

    config = Config(df_meta)

    office_loc = (
        df_emp.iloc[0]["drop_lat"],
        df_emp.iloc[0]["drop_lng"]
    )
    emp_count = len(df_emp)
    
    if x_runs is None:
        x_runs = max(2, -2.52*(math.log(emp_count)) + 15.85)  # More runs for smaller datasets, fewer for larger
        x_runs = int(x_runs)  # Scale runs based on employee count
        
    if y_iters is None:
        y_iters = max(5, 2282.4*emp_count**(-1.04)-6.61)
        y_iters = int(y_iters)  # Scale iterations based on employee count
        
    employees = [Employee(r, config) for _, r in df_emp.iterrows()]
    vehicles = [Vehicle(r) for _, r in df_veh.iterrows()]

    if not hav:
        map1.init_distance_matrix(employees, vehicles, office_loc)

    gamma_list = [5,10,15,35,45,75,85,100,125]
    all_results = []

    for gamma in gamma_list:

        config.gamma = gamma

        global_best_sol = None
        global_best_unassigned = []
        global_best_score = (float("inf"), float("inf"), float("inf"))

        for _ in range(x_runs):

            is_relaxed = 0

            sol_map, unassigned = construct_solution(
                employees, vehicles, office_loc, config,
                randomize=True, hav=hav
            )

            sol, final_una, obj = vns_optimizer(
                employees, vehicles, office_loc, config,
                y_iters, sol_map, unassigned, hav
            )

            # --- Start of Enforce Feasibility Logic ---
            if len(final_una) > 0:

                emp_fresh = copy.deepcopy(employees)
                veh_fresh = copy.deepcopy(vehicles)

                rel_sol, rel_una, rel_employees = enforce_feasibility(
                    emp_fresh, veh_fresh, office_loc, config, hav
                )

                if rel_sol:

                    rel_sol, rel_una, rel_obj = vns_optimizer(
                        rel_employees, veh_fresh, office_loc, config,
                        y_iters, rel_sol, rel_una, hav
                    )

                    # Accept ONLY if unassigned strictly decreases
                    if len(rel_una) < len(final_una):
                        sol, final_una, obj = rel_sol, rel_una, rel_obj
                        is_relaxed = 1

            # --- End of Enforce Feasibility Logic ---

            score = (len(final_una), is_relaxed, obj)

            if score < global_best_score:
                global_best_score = score
                global_best_sol = sol
                global_best_unassigned = final_una

        all_results.append({
            "gamma": gamma,
            "solution": global_best_sol,
            "unassigned": global_best_unassigned,
            "relaxed": global_best_score[1],
            "objective": global_best_score[2]
        })

    perfect = [
        r for r in all_results
        if len(r["unassigned"]) == 0 and r["relaxed"] == 0
    ]

    if perfect:
        best = min(perfect, key=lambda x: x["objective"])
    else:
        best = min(all_results, key=lambda x: x["objective"])

    sol = best["solution"]
    unassigned = best["unassigned"]

    rows = []

    if sol:
        for v_id, meta in sol.items():
            for trip_idx, trip in enumerate(meta["trips"], 1):
                for p in trip["passengers"]:

                    p_t, p_d = trip["pickup_times"][p.id]
                    d_t = trip["drop_time"]

                    rows.append({
                        "vehicle": v_id,
                        "category": meta["vehicle"].category,
                        "trip": trip_idx,
                        "employee_id": p.id,
                        "pickup_min": int(p_t),
                        "drop_min": int(d_t),
                        "p_delay": int(p_d),
                        "d_delay": int(max(0, d_t - p.latest))
                    })

    df_schedule = pd.DataFrame(rows)

    if not df_schedule.empty:
        df_schedule = df_schedule.sort_values(
            ["category", "vehicle", "trip", "pickup_min"]
        )

    return {
        "objective": float(best["objective"]),
        "unassigned": [u.id for u in unassigned],
        "schedule": df_schedule
    }

inputs = ["TestCase_TC02.xlsx"]
showoutput = True

if __name__ == "__main__":
    for _ in inputs:
        solve(_)
