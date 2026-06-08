# Kriti2026 Project


## Overview

Kriti2026 is a full-stack application designed for fleet management and optimization. It consists of three main components:

- **Node.js Backend**: Handles API endpoints, authentication, and database interactions.
- **Optimization Backend**: A Python-based service for solving optimization problems related to fleet and trip management.
- **Web Frontend**: A React-based user interface for interacting with the system.

### How It Works

1. **Upload Fleet Data**: Import vehicle information and employee locations via file upload.
2. **Optimize Routes**: AI algorithms group employees into optimal carpools and calculate efficient routes.
3. **Save & Commute**: Execute optimized routes to reduce costs and provide shorter, more enjoyable commutes.

### Admin/Company Features

The platform empowers companies with powerful management tools to optimize their fleet operations:

- **Live Map Tracking**: See every vehicle and its route in real-time. Know exactly where your employees are being picked up and where they will arrive at destination.
- **Per-Fleet Dashboards**: Each fleet operates independently with its own vehicles, destination, and roster. Ideal for companies running multiple office locations or shifts.
- **Add Employees**: Assign new employees to a fleet instantly. They appear on the next scheduled route without any manual reconfiguration.
- **Remove Employees**: Offboard an employee from a fleet in one action. Their stop is dropped from all future routes immediately.
- **Delete a Fleet**: Permanently decommission a fleet when a location closes or a contract ends. All associated routes, vehicles, and employee assignments are removed cleanly.
- **Traffic Awareness**: Live traffic overlay helps dispatchers anticipate delays and communicate proactively with employees before issues arise.
- **Vehicle-Level Filters**: Handle any single vehicle or trip on the map to investigate a route, verify stops, or respond to a complaint. All fleet data is fully isolated per fleet with changes taking effect immediately across the platform.

### Employee Portal Features

Employees get a dedicated dashboard that keeps them informed about their daily commute, reducing inbound queries to your operations team:

- **Pickup Countdown**: Employees see a live timer to their next scheduled pickup — eliminating "Where is my cab?" calls to your admin team.
- **Planned Route View**: Each employee can see the assigned trip route and stops for the day, giving them full clarity on their commute before it begins.
- **Dynamic Pickup Location**: Employees can update their pickup location and pickup time at any time. The system automatically recalculates and reassigns trip based on the new position — no admin intervention needed.
- **Day-by-Day Schedule**: Staff can check their assigned pickup time and route for any day of the week from a single screen.
- **Secure Role-Based Access**: Employees can only see their own data. No employee can view or interfere with another's route or schedule.

## Folder Structure

```
kriti2026/
├── node-backend/          # Node.js backend application
│   ├── controllers/       # API controllers for different modules
│   ├── middleware/        # Authentication and other middleware
│   ├── modules/           # Database schemas and models
│   ├── routes/            # API route definitions
│   ├── uploads/           # File upload directory
│   ├── utils/             # Utility functions (DB connection, multer)
│   ├── index.js           # Main server file
│   ├── package.json       # Node.js dependencies and scripts
│   └── README.md          # Backend-specific documentation
├── opti-backend/          # Python optimization backend
│   ├── dynamic.py         # Dynamic optimization logic
│   ├── main.py            # Main entry point
│   ├── map1.py            # Mapping utilities
│   ├── metrics.py         # Performance metrics
│   ├── models.py          # Data models
│   ├── solver.py          # Optimization solver
│   ├── requirements.txt   # Python dependencies
│   └── README.md          # Optimization backend documentation
└── web-frontend/          # React frontend application
    ├── public/            # Static assets
    ├── src/               # Source code
    │   ├── components/    # React components organized by feature
    │   ├── hooks/         # Custom React hooks
    │   └── utils/         # Frontend utilities
    ├── package.json       # Frontend dependencies and scripts
    ├── vite.config.js     # Vite configuration
    └── README.md          # Frontend documentation
```

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (version 16 or higher) - Download from [nodejs.org](https://nodejs.org/)
- **Python** (version 3.8 or higher) - Download from [python.org](https://www.python.org/)
- **npm** (comes with Node.js)
- **pip** (Python package installer)
- **Git** (for cloning repositories if needed)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd kriti2026
```

### 2. Node.js Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd node-backend
npm install
```

Configure your database connection in `utils/DB.js` and set up environment variables as needed.

### 3. Python Optimization Backend Setup

Navigate to the optimization backend directory and install dependencies:

```bash
cd ../opti-backend
pip install -r requirements.txt
```

### 4. Web Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../web-frontend
npm install
```

## Running the Project

### Start the Node.js Backend

```bash
cd node-backend
npm start
```

The backend server will typically run on `http://localhost:3000` (check `index.js` for the exact port).

### Start the Python Optimization Backend

```bash
cd opti-backend
python main.py
```

The optimization service will run on its configured port (check `main.py` for details).

### Start the Web Frontend

```bash
cd web-frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` (default Vite port).

### Running All Services

To run the entire application, you'll need to start all three components in separate terminals:

1. Terminal 1: Node.js backend
2. Terminal 2: Python optimization backend
3. Terminal 3: Web frontend

## Usage

- Access the web application through your browser at the frontend URL.
- The frontend communicates with the Node.js backend for data operations.
- Optimization tasks are handled by the Python backend.

## Development Guidelines

- Ensure all services are running before testing the full application.
- Check individual README files in each component folder for component-specific instructions.
- Use the provided test files (e.g., `test_endpoints.js`, `test-api-routes.js`) for API testing.
