import Trip from "../modules/trip/tripschema.js";
import Fleet from "../modules/fleet/fleetschema.js";
import Vehicle from "../modules/vehicle/vehicleschema.js";
import Employee from "../modules/employee/employeeschema.js";
import fs from "fs";

// Helper: Turns minutes (e.g., 540) into a readable time string (e.g., "09:00")
const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Helper: Calculates the distance (km) between two points using the Haversine formula
const calculateDistance = (coord1, coord2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // Earth radius in km

    const dLat = toRad(coord2[1] - coord1[1]);
    const dLon = toRad(coord2[0] - coord1[0]);
    const lat1 = toRad(coord1[1]);
    const lat2 = toRad(coord2[1]);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Logic: Core function that converts the Optimizer's raw data into Trip records in our DB
export const processCreateTrips = async (fleetId, date, optimizerResult) => {
    if (!fleetId || !optimizerResult || !optimizerResult.vehicles) {
        throw new Error("Fleet ID and Optimizer Result are required");
    }

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
        throw new Error("Fleet not found");
    }

    // 1. Fetch references: Get all vehicles and employees so we can link them by ID
    const vehicles = await Vehicle.find({ fleet: fleetId });
    // Map vehicle ID -> { _id, name, cost, avgSpeed, currentLocation }
    const vehicleMap = new Map(vehicles.map(v => [v.vehicleId, { 
        _id: v._id, 
        name: v.vehicleId,
        costPerKm: v.costPerKm || 15,
        // Default to 0.5 km/min (30km/h) if performance data is missing
        avgSpeedKmMin: (v.performance?.averageSpeed || 30) / 60,
        currentLocation: v.currentLocation?.coordinates
    }]));

    const employees = await Employee.find({ company: fleet.company });
    const employeeMap = new Map(employees.map(e => [e.employeeId, { _id: e._id, name: e.name }]));

    // 2. Parse GeoJSON: Extract coordinates for pickups, dropoffs, and vehicle starts from Mapbox data
    const pickupCoords = new Map();
    const dropCoords = new Map();
    const vehicleStartCoords = new Map(); 

    if (optimizerResult.mapbox_geojson && optimizerResult.mapbox_geojson.features) {
        optimizerResult.mapbox_geojson.features.forEach(feature => {
            const props = feature.properties;
            if (!props || !feature.geometry || !feature.geometry.coordinates) return;

            if (props.type === "pickup" && props.vehicle && props.employee) {
                pickupCoords.set(`${props.vehicle}_${props.employee}`, feature.geometry.coordinates);
            } else if (props.type === "office_drop" && props.vehicle) {
                dropCoords.set(`${props.vehicle}`, feature.geometry.coordinates);
            } else if (props.type === "vehicle_start" && props.vehicle) {
                vehicleStartCoords.set(props.vehicle, feature.geometry.coordinates);
            }
        });
    }

    // 3. Grouping: The optimizer sends a flat list of assignments. We group them by Vehicle + Trip Number.
    const tripAssignments = {};
    
    optimizerResult.vehicles.forEach(assign => {
        const key = `${assign.vehicle}_${assign.trip}`;
        if (!tripAssignments[key]) {
            tripAssignments[key] = {
                vehicleId: assign.vehicle,
                tripNum: assign.trip, 
                assignments: []
            };
        }
        tripAssignments[key].assignments.push(assign);
    });

    const tripsToCreate = [];
    const tripDate = date ? new Date(date) : new Date();

    // 4. Build Trips: Loop through each group and create a Trip document
    for (const group of Object.values(tripAssignments)) {
        const { vehicleId, assignments, tripNum } = group;
        const vehicleData = vehicleMap.get(vehicleId);
        
        if (!vehicleData) {
            console.warn(`Vehicle ${vehicleId} not found in DB. Skipping.`);
            continue;
        }

        // Create the sequence of stops
        let allStops = [];
        let maxDropMin = 0;
        let maxDropDelay = 0;
        let totalDelay = 0;

        assignments.forEach(assign => {
            const empData = employeeMap.get(assign.employee_id);
            if (!empData) {
                return;
            }
            const empObjectId = empData._id;

            const pCoords = pickupCoords.get(`${vehicleId}_${assign.employee_id}`) || [0, 0];
            
            // Timing Logic:
            // 'pickup_min' is the ACTUAL arrival time (with delay).
            // We deduce PLANNED time by subtracting the delay.
            const pDelay = assign.p_delay !== undefined ? assign.p_delay : (assign.pickup_delay || 0); 
            const dDelay = assign.d_delay !== undefined ? assign.d_delay : (assign.drop_delay || 0);
            const pActual = assign.pickup_min;
            const pPlanned = pActual - pDelay;

            totalDelay += pDelay; 

            allStops.push({
                stopType: "pickup",
                employee: empObjectId,
                location: { type: "Point", coordinates: pCoords },
                plannedTime: minutesToTime(pPlanned),
                actualTime: minutesToTime(pActual),
                rawTime: pActual,
                delay: pDelay
            });

            // Track when the latest drop-off happens to set the trip end time
            if (assign.drop_min > maxDropMin) {
                maxDropMin = assign.drop_min;
                maxDropDelay = dDelay; 
            }
        });

        // Always add the final stop: Office Drop-off
        const officeCoords = dropCoords.get(vehicleId) || fleet.destination.coordinates || [0, 0];
        
        if (allStops.length > 0) {
             const dActual = maxDropMin;
             const dPlanned = dActual - maxDropDelay;

             // Add final drop delay to total trip delay metrics
             totalDelay += maxDropDelay; 

             allStops.push({
                stopType: "dropoff",
                location: { type: "Point", coordinates: officeCoords },
                plannedTime: minutesToTime(dPlanned),
                actualTime: minutesToTime(dActual),
                rawTime: dActual,
                delay: maxDropDelay
            });
        }

        allStops.sort((a, b) => a.rawTime - b.rawTime);
        const finalStops = allStops.map(({ rawTime, ...stop }) => stop);

        if (finalStops.length > 0) {
            const startMin = allStops[0].rawTime;
            const endMin = allStops[allStops.length - 1].rawTime;
            
            // --- 5. Metrics Calculation ---
            
            // A: Initial Location
            // Trip 1 starts at Vehicle's Current Location (from DB) or Optimizer Start. Subsequent trips start at the Office.
            let initialLocCoords;
            
            if (tripNum === 1 || String(tripNum) === "1") {
                // Priority: 1. DB Current Location 2. Optimizer Start 3. Fleet Destination
                initialLocCoords = vehicleData.currentLocation || vehicleStartCoords.get(vehicleId) || fleet.destination.coordinates;
            } else {
                initialLocCoords = officeCoords;
            }
            
            // B: Total Distance (Sum of all legs)
            let tripDistance = 0;
            let currentCoords = initialLocCoords;
            
            // For logging: Detailed breakdown of optimized path
            let optimizedPathLog = `OPTIMIZED PATH BREAKDOWN:\n`;
            optimizedPathLog += `  Start: [${initialLocCoords[0]}, ${initialLocCoords[1]}]\n`;

            // Note: iterate finalStops to match the actual trip stops
            finalStops.forEach((stop, index) => {
                const stopCoords = stop.location.coordinates;
                const segmentDist = calculateDistance(currentCoords, stopCoords);
                tripDistance += segmentDist;
                
                optimizedPathLog += `  -> Stop ${index+1}: [${stopCoords[0]}, ${stopCoords[1]}] | Segment: ${segmentDist.toFixed(4)} km\n`;
                currentCoords = stopCoords;
            });
            optimizedPathLog += `  = TOTAL SUM: ${tripDistance.toFixed(4)} km\n`;

            // Calculate Total Duration based on Distance and Speed (more accurate than start-end time)
            // Includes the first deadhead leg which endMin - startMin misses
            const totalDuration = tripDistance / vehicleData.avgSpeedKmMin;

            // C: Old Distance Calculation
            let oldDistance = 0;

            // Scenario: Non-optimised = Individual round trips (Office -> Home -> Office) for each employee
            assignments.forEach(assign => {
                const empCoords = pickupCoords.get(`${vehicleId}_${assign.employee_id}`) || [0,0];
                
                // Calculate One Way Distance: Employee <-> Office
                const oneWayDist = calculateDistance(empCoords, officeCoords);
                
                // Non-Optimised Distance = Round Trip (2 * One Way)
                const indDistance = oneWayDist * 2;
                
                oldDistance += indDistance; 
            });

            // --- DEBUG LOGGING ---
            try {
                let logEntry = `\n[${new Date().toISOString()}] VEHICLE: ${vehicleData.name} | TRIP #${tripNum}\n`;
                logEntry += `OPTIMIZED -> Dist: ${tripDistance.toFixed(2)} km, Duration: ${totalDuration.toFixed(2)} min\n`;
                logEntry += optimizedPathLog; // Add the path breakdown here
                logEntry += `BASELINE DETAILS:\n`;
                
                assignments.forEach(assign => {
                    const empData = employeeMap.get(assign.employee_id);
                    const name = empData ? empData.name : assign.employee_id;
                    const empCoords = pickupCoords.get(`${vehicleId}_${assign.employee_id}`) || [0,0]; // Corrected key access
                    const oneWay = calculateDistance(empCoords, officeCoords); // Using officeCoords from context
                    logEntry += `  - User: ${name} | One-Way: ${oneWay.toFixed(2)} km | Round-Trip: ${(oneWay*2).toFixed(2)} km\n`;
                });
                
                logEntry += `BASELINE TOTALS -> Old Distance: ${oldDistance.toFixed(2)}\n`;
                logEntry += `--------------------------------------------------\n`;

                fs.appendFileSync('metrics_debug.log', logEntry);
            } catch (err) {
                console.error("Failed to write metrics log", err);
            }
            // --- END DEBUG LOGGING ---

            tripsToCreate.push({
                fleet: fleet._id,
                vehicle: vehicleData._id,
                days: fleet.weekdays,
                date: tripDate,
                status: "scheduled",
                initialLocation: {
                    type: "Point",
                    coordinates: initialLocCoords
                },
                stops: finalStops,
                startTime: finalStops[0].plannedTime,
                endTime: finalStops[finalStops.length - 1].plannedTime,
                totalDistance: parseFloat(tripDistance.toFixed(2)),
                totalDuration: totalDuration,
                oldDistance: parseFloat(oldDistance.toFixed(2))
            });
        }
    }

    const createdTrips = await Trip.insertMany(tripsToCreate);
    return createdTrips;
}

// Create trips based on optimizer output
const createTrips = async (req, res) => {
    try {
        const { fleetId, date, optimizerResult } = req.body;
        const createdTrips = await processCreateTrips(fleetId, date, optimizerResult);

        res.status(201).json({
            success: true,
            message: "Trips created successfully",
            count: createdTrips.length,
            trips: createdTrips
        });

    } catch (e) {
        console.error("Create Trips Error:", e);
        res.status(500).json({ success: false, message: e.message });
    }
};

// Get trips with flexible filtering
const getTrips = async (req, res) => {
    try {
        const { 
            fleet, 
            vehicle, 
            status,
            employee, 
            startTime,
            endTime,
            page = 1, 
            limit = 20 
        } = req.query;

        const query = {};

        // Apply filters if they exist
        if (fleet) query.fleet = fleet;
        if (vehicle) query.vehicle = vehicle;
        if (status) query.status = status;
        if (employee) query['stops.employee'] = employee;

        // Date range filter
        if (startTime || endTime) {
            query.startTime = {};
            if (startTime) query.startTime.$gte = new Date(startTime);
            if (endTime) query.startTime.$lte = new Date(endTime);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const trips = await Trip.find(query)
            .populate('vehicle')
            .populate('fleet', 'fleetId') 
            .sort({ date: -1, startTime: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Trip.countDocuments(query);

        res.json({
            success: true,
            count: trips.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            trips
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single trip details
const getTripById = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id)
            .populate('vehicle')
            .populate('fleet')
            .populate({
                path: 'stops.employee',
                select: 'name email phone' // Populate employee details in stops
            });

        if (!trip) {
            return res.status(404).json({ success: false, message: "Trip not found" });
        }

        res.json({ success: true, trip });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { createTrips, getTrips, getTripById };