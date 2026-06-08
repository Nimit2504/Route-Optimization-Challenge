# Velora Fleet Management System | Documentation

Velora is a sophisticated fleet management and route optimization platform developed for modern corporate environments. The system facilitates seamless logistics coordination between enterprise administrators and employees by integrating real-time tracking, automated dispatching, and advanced data analytics.

---

## Key Functional Modules

### Corporate Administration

* **Performance Analytics**: Administrators can monitor critical KPIs, including aggregate cost savings, time efficiency, and fleet utilization via interactive data visualizations.
* **Fleet Operations**: The platform supports bulk data integration for fleet creation and provides automated alerts for unassigned personnel based on defined logistical constraints.
* **Asset Monitoring**: Tracks vehicle inventory, fuel distribution, and seating capacity to optimize resource allocation.
* **Executive Reporting**: Facilitates the generation of audit-ready PDF and CSV reports encompassing financial impacts and comprehensive trip logs.

### Employee Interface

* **Logistics Dashboard**: Provides users with essential transit data, including assigned vehicle identification and dynamic arrival estimations.
* **Integrated Mapping**: Utilizes the Google Maps API to display optimized routes, including all designated waypoints and the final corporate destination.
* **Dynamic Adjustments**: Allows employees to request modifications to pickup times or locations, which triggers an automated recalculation of the fleet's route.
* **Account Security**: Secure management of user profiles, corporate affiliations, and authentication credentials.

---

## Technical Architecture

The frontend is engineered for high performance and scalability using a modern JavaScript stack:

* **Core Framework**: React 18 powered by Vite for optimized build cycles.
* **State & Logic**: Leverages advanced React hooks (`useCallback`, `useMemo`) for efficient rendering and state persistence.
* **Visualizations**: Recharts integration for complex data modeling.
* **Geospatial Services**: `@react-google-maps/api` for directions, polyline rendering, and location autocomplete.
* **Data Export**: `jsPDF` and `jspdf-autotable` for client-side document generation.
* **Communication**: Axios-based API client featuring JWT-based authorization interceptors.

---

## Directory Structure

The `src` directory is organized into modular functional units:

* **`components/common/`**: Universal UI elements such as StatCards and Modal frameworks.
* **`components/Company/`**: Administrative modules for Analytics and Reporting.
* **`components/Employee/`**: User-facing interfaces including Dashboards and Profiles.
* **`components/icons/`**: Centralized repository for custom SVG iconography.
* **`hooks/`**: Custom logic providers, such as `useReportData`.
* **`utils/`**: Core utilities for API configuration, map styling, and data formatting.

---

## Optimization Logic

Velora employs a proprietary **Dynamic Optimization Protocol**. Upon a user-initiated change to transit parameters, the system executes a recalculation to minimize the objective functions of distance ($D$) and cost ($C$) while adhering to strict arrival windows:

$$C = \sum_{i=1}^{n} (d_i \times r_v)$$

*Note: di represents segment distance and rv represents the vehicle-specific cost rate.*

---

## Configuration

To deploy the environment, ensure the following keys are present in the `.env` configuration:

```env
VITE_BACKEND_URL=your_backend_api_url
VITE_GOOGLE_API_KEY=your_google_maps_key

```

© 2026 VELORA. All rights reserved.

