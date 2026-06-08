// src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

// ── Auth interceptors ────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Session expired. Logging out.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Helper: normalise array responses ───────────────────────────────────────
function extractArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.trips))     return data.trips;
  if (data && Array.isArray(data.employees)) return data.employees;
  if (data && Array.isArray(data.data))      return data.data;
  return [];
}

// ── fetchTrips ───────────────────────────────────────────────────────────────
// Fetches all trips for a fleet, then fetches the fleet's employee list and
// cross-references it against each stop so employee names are always resolved
// — even when the trip controller doesn't fully populate stops.employee.
export const fetchTrips = async (fleetId) => {
  try {
    // 1. Fetch trips and fleet employees in parallel
    const [tripsRes, employeesRes] = await Promise.all([
      api.get(`/trip?fleet=${fleetId}`),
      api.get(`/fleet/${fleetId}/employees`).catch(() => ({ data: [] })), // soft-fail
    ]);

    const trips     = extractArray(tripsRes.data);
    const employees = extractArray(employeesRes.data);

    // 2. Build a lookup map  employeeId (string) → employee object
    const empMap = {};
    employees.forEach((emp) => {
      if (emp._id) empMap[String(emp._id)] = emp;
    });

    // 3. Enrich every stop's employee field with the full object
    const enriched = trips.map((trip) => ({
      ...trip,
      stops: (trip.stops || []).map((stop) => {
        // stop.employee may be:
        //   a) already a populated object  { _id, name, employeeId, … }
        //   b) a plain ObjectId string     "698cd3af…"
        //   c) an object with only _id     { _id: "698cd3af…" }

        const rawEmp = stop.employee;
        if (!rawEmp) return stop;

        // If it already has a name we trust it
        if (rawEmp.name || rawEmp.employeeId) {
          // Still try to fill in any missing fields from our empMap
          const id = String(rawEmp._id || rawEmp);
          const full = empMap[id];
          return full
            ? { ...stop, employee: { ...full, ...rawEmp } }
            : stop;
        }

        // It's just an id reference — look up the full record
        const id   = String(rawEmp._id || rawEmp);
        const full = empMap[id];
        if (full) return { ...stop, employee: full };

        // Last resort: keep as-is
        return stop;
      }),
    }));

    return enriched;
  } catch (err) {
    console.error("Error fetching trips:", err);
    return [];
  }
};

export const fetchTripsByCompany = async (fleetId) => {
  try {
    // 1. Fetch trips and fleet employees in parallel
    const [tripsRes, employeesRes] = await Promise.all([
      api.get(`/trip?company=${fleetId}`),
      api.get(`/fleet/${fleetId}/employees`).catch(() => ({ data: [] })), // soft-fail
    ]);

    const trips     = extractArray(tripsRes.data);
    const employees = extractArray(employeesRes.data);

    // 2. Build a lookup map  employeeId (string) → employee object
    const empMap = {};
    employees.forEach((emp) => {
      if (emp._id) empMap[String(emp._id)] = emp;
    });

    // 3. Enrich every stop's employee field with the full object
    const enriched = trips.map((trip) => ({
      ...trip,
      stops: (trip.stops || []).map((stop) => {
        // stop.employee may be:
        //   a) already a populated object  { _id, name, employeeId, … }
        //   b) a plain ObjectId string     "698cd3af…"
        //   c) an object with only _id     { _id: "698cd3af…" }

        const rawEmp = stop.employee;
        if (!rawEmp) return stop;

        // If it already has a name we trust it
        if (rawEmp.name || rawEmp.employeeId) {
          // Still try to fill in any missing fields from our empMap
          const id = String(rawEmp._id || rawEmp);
          const full = empMap[id];
          return full
            ? { ...stop, employee: { ...full, ...rawEmp } }
            : stop;
        }

        // It's just an id reference — look up the full record
        const id   = String(rawEmp._id || rawEmp);
        const full = empMap[id];
        if (full) return { ...stop, employee: full };

        // Last resort: keep as-is
        return stop;
      }),
    }));

    return enriched;
  } catch (err) {
    console.error("Error fetching trips:", err);
    return [];
  }
};

export const fetchFleetEmployees = async (fleetId) => {
  try {
    const res = await api.get(`/fleet/${fleetId}/employees`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.employees)) return data.employees;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (err) {
    console.warn("Error fetching fleet employees, falling back to individual fetches if needed:", err);
    return [];
  }
};

export const fetchEmployee = async (employeeId) => {
  try {
    // Attempt to fetch profile. Note: backend might restrict this to own profile or company admin
    const res = await api.get(`/employee/profile/${employeeId}`); 
    return res.data;
  } catch (err) {
    // If specific profile endpoint fails, try a generic user endpoint if it exists, or just return null
    // Assuming /user/:id or similar might exist, but sticking to known routes
    console.error(`Error fetching employee ${employeeId}:`, err);
    return null;
  }
};

export default api;