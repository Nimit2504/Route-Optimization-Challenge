import numpy as np
import googlemaps
import time
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_API_KEY = os.getenv('GOOGLE_MAPS_KEY')
gmaps = googlemaps.Client(key=GOOGLE_API_KEY)

DIST = None
LOC_TO_IDX = None

MAX_ORIGINS = 10
MAX_DESTS = 10

def init_distance_matrix(employees, vehicles=None, office_loc=None):
    """
    Precomputes road distance matrix in KM using BULK Google API calls.
    
    Includes:
    - all employee pickup locations
    - all vehicle start locations (optional)
    - office location (optional)

    DIST[i][j] => KM
    """

    global DIST, LOC_TO_IDX

    coords = [e.pickup for e in employees]

    if vehicles:
        coords.extend([v.start_loc for v in vehicles])

    if office_loc:
        coords.append(office_loc)

    # remove duplicates but preserve order
    coords = list(dict.fromkeys(coords))

    n = len(coords)
    DIST = np.zeros((n, n), dtype=float)
    LOC_TO_IDX = {coords[i]: i for i in range(n)}

    print(f"\n Bulk Distance Precompute Started")
    print(f"Total unique locations = {n}")
    print(f"Blocks = {(n + 24)//25} x {(n + 24)//25}\n")

    for i0 in range(0, n, MAX_ORIGINS):
        origins = coords[i0:i0 + MAX_ORIGINS]

        for j0 in range(0, n, MAX_DESTS):
            destinations = coords[j0:j0 + MAX_DESTS]

            print(f"API Call: origins[{i0}:{i0+len(origins)}] -> dests[{j0}:{j0+len(destinations)}]")

            while True:
                result = gmaps.distance_matrix(
                    origins=origins,
                    destinations=destinations,
                    mode="driving",
                    units="metric"
                )

                if result.get("status") == "OVER_QUERY_LIMIT":
                    print("OVER_QUERY_LIMIT... sleeping 1s and retrying")
                    time.sleep(1)
                    continue
                break

            rows = result["rows"]

            for oi in range(len(origins)):
                elements = rows[oi]["elements"]
                for dj in range(len(destinations)):
                    element = elements[dj]

                    if element["status"] != "OK":
                        DIST[i0 + oi][j0 + dj] = float("inf")
                    else:
                        DIST[i0 + oi][j0 + dj] = element["distance"]["value"] / 1000.0

    print("\n Distance matrix ready:", DIST.shape)


def get_distance_km(loc1, loc2):
    """
    O(1) distance lookup in KM.
    """

    if loc1 == loc2:
        return 0.0

    i = LOC_TO_IDX.get(loc1, None)
    j = LOC_TO_IDX.get(loc2, None)

    if i is None or j is None:
        return float("inf")

    return float(DIST[i][j])
