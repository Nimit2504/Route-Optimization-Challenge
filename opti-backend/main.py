from fastapi import FastAPI, File,Body, UploadFile, Response, HTTPException,status
from solver import solve_from_dfs
from pydantic import BaseModel
from typing import Union, Optional, List
from dynamic import run_simulation_from_dfs
from metrics import evaluate_schedule_metrics
import math
import io
import httpx
import pandas as pd 
import numpy as np


class FileUrlRequest(BaseModel):
    file_url: str

class DynamicRequest(BaseModel):
    static_file_url: str
    dynamic_file_url: str

def to_python(obj):
    if isinstance(obj, dict):
        return {k: to_python(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [to_python(v) for v in obj]

    if isinstance(obj, np.integer):
        return int(obj)

    if isinstance(obj, np.floating):
        return float(obj)

    if isinstance(obj, np.bool_):
        return bool(obj)

    return obj
app = FastAPI()


@app.post("/api/optimizer")
async def optimize(req: FileUrlRequest):
    file_url = req.file_url
    if not file_url.endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Given file is not an excel sheet"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(file_url)

        response.raise_for_status()
        buffer = io.BytesIO(response.content)

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to download file from URL"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to download file from URL"
        )

    try:
        sheets = pd.read_excel(buffer, sheet_name=None)
        df_emp = sheets["employees"]
        df_veh = sheets["vehicles"]
        df_meta = sheets["metadata"]
        df_base = sheets["baseline"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Excel format"
        )

    emp_lookup = {
        row["employee_id"]: {
            "lat": row["pickup_lat"],
            "lng": row["pickup_lng"]
        }
        for _, row in df_emp.iterrows()
    }

    veh_lookup = {
        row["vehicle_id"]: {
            "lat": row["current_lat"],
            "lng": row["current_lng"],
            "category": row["category"]
        }
        for _, row in df_veh.iterrows()
    }

    office_loc = (
        df_emp.iloc[0]["drop_lng"],
        df_emp.iloc[0]["drop_lat"]
    )

    result = solve_from_dfs(
        df_emp=df_emp,
        df_veh=df_veh,
        df_meta=df_meta,
        x_runs=10,
        y_iters=200
    )

    schedule_df = result["schedule"]

    vehicle_geojson = generate_vehicle_routes_geojson(
        schedule=schedule_df.to_dict(orient="records"),
        emp_lookup=emp_lookup,
        veh_lookup=veh_lookup,
        office_loc=office_loc,
        company_name="Acme Corp"
    )

    print("SCHEDULE COLUMNS:", schedule_df.columns.tolist())

    metrics = evaluate_schedule_metrics(
        employees_df=df_emp,
        vehicles_df=df_veh,
        baseline_df=df_base,
        schedule_df=schedule_df,
        metadata_df=df_meta
    )

    response = {
        "objective": result["objective"],
        "unassigned": result["unassigned"],
        "vehicles": result["schedule"].to_dict(orient="records"),
        "mapbox_geojson": flatten_vehicle_geojson(vehicle_geojson),
        "metrics": metrics
    }

    return to_python(response)


def sanitize_for_json(obj):
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.floating, np.integer)):
        val = obj.item()
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val
    else:
        return obj


@app.post("/api/optimizerhaversine")
async def optimize_haversine(req: FileUrlRequest):
    file_url = req.file_url
    if not file_url.endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Given file is not an excel sheet"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(file_url)

        response.raise_for_status()
        buffer = io.BytesIO(response.content)

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to download file from URL"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to download file from URL"
        )

    try:
        sheets = pd.read_excel(buffer, sheet_name=None)
        df_emp = sheets["employees"]
        df_veh = sheets["vehicles"]
        df_meta = sheets["metadata"]
        df_base = sheets["baseline"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Excel format"
        )

    emp_lookup = {
        row["employee_id"]: {
            "lat": row["pickup_lat"],
            "lng": row["pickup_lng"]
        }
        for _, row in df_emp.iterrows()
    }

    veh_lookup = {
        row["vehicle_id"]: {
            "lat": row["current_lat"],
            "lng": row["current_lng"],
            "category": row["category"]
        }
        for _, row in df_veh.iterrows()
    }

    office_loc = (
        df_emp.iloc[0]["drop_lng"],
        df_emp.iloc[0]["drop_lat"]
    )

    result = solve_from_dfs(
        df_emp=df_emp,
        df_veh=df_veh,
        df_meta=df_meta,
        hav=True,
        x_runs=10,
        y_iters=200
    )

    schedule_df = result["schedule"]

    vehicle_geojson = generate_vehicle_routes_geojson(
        schedule=schedule_df.to_dict(orient="records"),
        emp_lookup=emp_lookup,
        veh_lookup=veh_lookup,
        office_loc=office_loc,
        company_name="Acme Corp"
    )

    print("SCHEDULE COLUMNS:", schedule_df.columns.tolist())

    metrics = evaluate_schedule_metrics(
        employees_df=df_emp,
        vehicles_df=df_veh,
        baseline_df=df_base,
        schedule_df=schedule_df,
        metadata_df=df_meta,
        hav = True
    )

    response = {
        "objective": result["objective"],
        "unassigned": result["unassigned"],
        "vehicles": result["schedule"].to_dict(orient="records"),
        "mapbox_geojson": flatten_vehicle_geojson(vehicle_geojson),
        "metrics": metrics
    }

    return to_python(response)


def read_dynamic_file(upload: UploadFile) -> pd.DataFrame:
    name = upload.filename.lower()
    content = io.BytesIO(upload.file.read())

    if name.endswith(".csv"):
        return pd.read_csv(content)
    elif name.endswith(".xlsx") or name.endswith(".xls"):
        return pd.read_excel(content)
    else:
        raise HTTPException(
            status_code=415,
            detail="Dynamic requests file must be CSV or Excel"
        )



def sanitize_for_json(obj):
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.floating, np.integer)):
        val = obj.item()
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val
    else:
        return obj



@app.post("/api/dynamic")
async def optimize_dynamic_file(req: DynamicRequest 
):
    # ------------------------
    # Download static Excel
    # ------------------------
    static_file_url = req.static_file_url
    dynamic_file_url = req.dynamic_file_url
    if not static_file_url.endswith(".xlsx"):
        raise HTTPException(415, "Static file must be .xlsx")

    try:
        async with httpx.AsyncClient() as client:
            static_response = await client.get(static_file_url)

        static_response.raise_for_status()
        buffer = io.BytesIO(static_response.content)

        sheets = pd.read_excel(buffer, sheet_name=None)

        df_emp = sheets["employees"]
        df_veh = sheets["vehicles"]
        df_meta = sheets["metadata"]
        df_base = sheets["baseline"]

    except Exception:
        raise HTTPException(400, "Invalid static Excel format")

    # ------------------------
    # Download dynamic CSV
    # ------------------------
    try:
        async with httpx.AsyncClient() as client:
            dyn_response = await client.get(dynamic_file_url)

        dyn_response.raise_for_status()
        df_dyn = pd.read_csv(io.BytesIO(dyn_response.content))

    except Exception:
        raise HTTPException(400, "Invalid dynamic CSV")

    # ------------------------
    # Apply dynamic mutations
    # ------------------------
    try:
        df_emp = apply_dynamic_employee_requests(df_emp, df_dyn)
    except Exception as e:
        raise HTTPException(400, str(e))

    # ------------------------
    # Lookups (same as optimizer)
    # ------------------------
    emp_lookup = {
        row["employee_id"]: {
            "lat": row["pickup_lat"],
            "lng": row["pickup_lng"]
        }
        for _, row in df_emp.iterrows()
    }

    veh_lookup = {
        row["vehicle_id"]: {
            "lat": row["current_lat"],
            "lng": row["current_lng"],
            "category": row["category"]
        }
        for _, row in df_veh.iterrows()
    }

    office_loc = (
        df_emp.iloc[0]["drop_lng"],
        df_emp.iloc[0]["drop_lat"]
    )

    # ------------------------
    # Solve
    # ------------------------
    result = solve_from_dfs(
        df_emp=df_emp,
        df_veh=df_veh,
        df_meta=df_meta,
        hav=False,
        x_runs=10,
        y_iters=200
    )

    schedule_df = result["schedule"]

    # ------------------------
    # GeoJSON
    # ------------------------
    vehicle_geojson = generate_vehicle_routes_geojson(
        schedule=schedule_df.to_dict(orient="records"),
        emp_lookup=emp_lookup,
        veh_lookup=veh_lookup,
        office_loc=office_loc,
        company_name="Acme Corp"
    )

    # ------------------------
    # Metrics
    # ------------------------
    metrics = evaluate_schedule_metrics(
        employees_df=df_emp,
        vehicles_df=df_veh,
        baseline_df=df_base,
        schedule_df=schedule_df,
        metadata_df=df_meta
    )

    # ------------------------
    # Final homogeneous response
    # ------------------------
    response = {
        "objective": result["objective"],
        "unassigned": result["unassigned"],
        "vehicles": schedule_df.to_dict(orient="records"),
        "mapbox_geojson": flatten_vehicle_geojson(vehicle_geojson),
        "metrics": metrics
    }

    response = sanitize_for_json(response)
    return response

def apply_dynamic_requests(
    employees_df: pd.DataFrame,
    dynamic_df: pd.DataFrame | None
) -> pd.DataFrame:
    if dynamic_df is None or dynamic_df.empty:
        return employees_df.copy()

    emp = employees_df.copy()
    emp["employee_id"] = emp["employee_id"].astype(str)

    dynamic_df = dynamic_df.copy()
    dynamic_df["employee_id"] = dynamic_df["employee_id"].astype(str)
    dynamic_df["request_type"] = dynamic_df["request_type"].str.lower().str.strip()

    ids_to_remove = set()
    rows_to_add = []

    for _, r in dynamic_df.iterrows():
        rtype = r["request_type"]
        eid = r["employee_id"]

        if rtype == "delete":
            ids_to_remove.add(eid)

        elif rtype == "modify":
            ids_to_remove.add(eid)
            rows_to_add.append(r)

        elif rtype == "add":
            rows_to_add.append(r)

    # Remove
    emp = emp[~emp["employee_id"].isin(ids_to_remove)]

    # Add / Modify
    if rows_to_add:
        add_df = pd.DataFrame(rows_to_add)

        # ensure full schema
        for col in emp.columns:
            if col not in add_df.columns:
                add_df[col] = None

        emp = pd.concat(
            [emp, add_df[emp.columns]],
            ignore_index=True
        )

    return emp



def apply_dynamic_employee_requests(
    df_emp: pd.DataFrame,
    df_dyn: pd.DataFrame
) -> pd.DataFrame:
    df_emp = df_emp.copy()

    for _, r in df_dyn.iterrows():
        emp_id = r["employee_id"]
        action = str(r["request_type"]).upper()

        if action == "ADD":
            df_emp = pd.concat([df_emp, pd.DataFrame([r])], ignore_index=True)

        elif action == "UPDATE":
            idx = df_emp.index[df_emp["employee_id"] == emp_id]
            if len(idx) == 0:
                raise ValueError(f"UPDATE for missing employee {emp_id}")

            for col in df_emp.columns:
                if col in r and pd.notna(r[col]):
                    df_emp.loc[idx, col] = r[col]

        elif action == "DELETE":
            df_emp = df_emp[df_emp["employee_id"] != emp_id]

        else:
            raise ValueError(f"Unknown request_type: {action}")

    return df_emp.reset_index(drop=True)



def build_emp_lookup(employees_df: pd.DataFrame) -> dict:
    return {
        str(r["employee_id"]): {
            "lat": r["pickup_lat"],
            "lng": r["pickup_lng"]
        }
        for _, r in employees_df.iterrows()
        if pd.notna(r["pickup_lat"]) and pd.notna(r["pickup_lng"])
    }

def generate_vehicle_routes_geojson(
    schedule,
    emp_lookup,
    veh_lookup,
    office_loc,
    company_name
):
    from collections import defaultdict

    vehicle_routes = defaultdict(list)

    # group & order stops
    grouped = defaultdict(list)
    for row in sorted(schedule, key=lambda x: (x["vehicle"], x["trip"])):
        grouped[row["vehicle"]].append(row)

    for vehicle_id, stops in grouped.items():
        route_features = []
        coords = []

        v = veh_lookup[vehicle_id]

        # --- vehicle start point ---
        start_coord = [v["lng"], v["lat"]]
        coords.append(start_coord)

        route_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": start_coord
            },
            "properties": {
                "type": "vehicle_start",
                "vehicle": vehicle_id,
                "company": company_name
            }
        })

        # --- pickups ---
        for s in stops:
            e = emp_lookup[s["employee_id"]]
            c = [e["lng"], e["lat"]]
            coords.append(c)

            route_features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": c
                },
                "properties": {
                    "type": "pickup",
                    "vehicle": vehicle_id,
                    "employee": s["employee_id"],
                    "trip": s["trip"],
                    "pickup_min": s["pickup_min"],
                    "company": company_name
                }
            })

        # --- office drop ---
        coords.append(list(office_loc))
        route_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": list(office_loc)
            },
            "properties": {
                "type": "office_drop",
                "vehicle": vehicle_id,
                "company": company_name
            }
        })

        # --- route line ---
        route_features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString", "coordinates": coords
            },
            "properties": {
                "type": "route",
                "vehicle": vehicle_id,
                "company": company_name,
                "category": v["category"]
            }
        })

        vehicle_routes[vehicle_id] = {
            "route": route_features
        }

    return vehicle_routes



def flatten_vehicle_geojson(vehicle_geojson):
    return {
        "type": "FeatureCollection",
        "features": [
            f
            for v in vehicle_geojson.values()
            for f in v["route"]
        ]
    }

