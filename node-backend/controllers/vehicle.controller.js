import mongoose from "mongoose";
import Vehicle from "../modules/vehicle/vehicleschema.js";
import Fleet from "../modules/fleet/fleetschema.js";

const fetchAllVehicles = async (req, res) => {
    try {
        const { fleet_id, fleet, company, fuelType, vehicleMode, vehicleType, status } = req.query;

        const query = {};

        // Normalize fleet ID parameter
        const targetFleetId = fleet_id || fleet;
        if (targetFleetId) {
             if (!mongoose.Types.ObjectId.isValid(targetFleetId)) {
                return res.status(400).json({ message: "Invalid fleet ID format" });
            }
            query.fleet = targetFleetId;
        }

        if (company) query.company = company;
        if (fuelType) query.fuelType = fuelType;
        if (vehicleMode) query.vehicleMode = vehicleMode;
        if (vehicleType) query.vehicleType = vehicleType;
        if (status) query.availabilityStatus = status;

        const vehiclesRes = await Vehicle.find(query);
        
        if (vehiclesRes.length === 0) {
            return res.status(200).json({ metrics: null, vehicles: [] });
        }

        // Calculate Metrics

        // 1. Basic aggregates: counts and sums
        const totalVehicles = vehiclesRes.length;
        const totalSeatingCapacity = vehiclesRes.reduce((acc, vehicle) => acc + vehicle.seatingCapacity, 0);
        const totalCostPerKm = vehiclesRes.reduce((acc, vehicle) => acc + vehicle.costPerKm, 0);


        // 2. Breakdown by category (Fuel, Mode, Type)
        const fuelTypeDistribution = vehiclesRes.reduce((acc, vehicle) => {
            acc[vehicle.fuelType] = (acc[vehicle.fuelType] || 0) + 1;
            return acc;
        }, {});

        const vehicleModeDistribution = vehiclesRes.reduce((acc, vehicle) => {
            acc[vehicle.vehicleMode] = (acc[vehicle.vehicleMode] || 0) + 1;
            return acc;
        }, {});

        const vehicleTypeDistribution = vehiclesRes.reduce((acc, vehicle) => {
            acc[vehicle.vehicleType] = (acc[vehicle.vehicleType] || 0) + 1;
            return acc;
        }, {});

        // 3. Averages (Speed, Mileage, Age)
        const averageMileage = vehiclesRes.reduce((acc, vehicle) => acc + (vehicle.performance.averageMileage || 0), 0) / totalVehicles;

        const averageSpeed = vehiclesRes.reduce((acc, vehicle) => acc + (vehicle.performance.averageSpeed || 0), 0) / totalVehicles;

        const averageVehicleAge = vehiclesRes.reduce((acc, vehicle) => acc + (vehicle.performance.vehicleAge || 0), 0) / totalVehicles;


        // Final Logic: object construction
        const metrics = {
            totalVehicles,
            averageSeatingCapacity: totalSeatingCapacity / totalVehicles,
            averageCostPerKm: totalCostPerKm / totalVehicles,
            totalSeatingCapacity,
            fuelTypeDistribution,
            vehicleModeDistribution,
            averageMileage,
            averageSpeed,
            averageVehicleAge,
            vehicleTypeDistribution
        };

        res.json({ metrics, vehicles: vehiclesRes });
    } catch (error) {
        res.status(500).json({ message: "Error fetching vehicles", error });
    }
}

// Single vehicle lookup
const fetchVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: "Error fetching vehicle", error });
    }
}

// Bulk vehicle creation
const createVehicle = async (req, res) => {
    try {
        const vehicles = req.body;

        if (!Array.isArray(vehicles) || vehicles.length === 0) {
            return res.status(400).json({ success: false, message: "Input must be a non-empty array of vehicles." });
        }
        const fleetId = vehicles[0].fleet;

        if (!fleetId) {
             return res.status(400).json({ success: false, message: "Fleet ID is required in the payload." });
        }


        const fleet = await Fleet.findById(fleetId);
        if (!fleet) {
            return res.status(404).json({ success: false, message: "Fleet not found." });
        }

        const companyId = fleet.company;

        // Ensure every vehicle is linked to the company and fleet

        const vehiclesPayload = vehicles.map(v => ({
            ...v,
            company: companyId,
            fleet: fleetId
        }));

        // Save all vehicles at once
        const createdVehicles = await Vehicle.create(vehiclesPayload);

        res.status(201).json({
            success: true,
            count: createdVehicles.length,
            vehicles: createdVehicles
        });
  
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
}

const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const vehicle = await Vehicle.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        res.json({
            success: true,
            vehicle
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

export { fetchAllVehicles, fetchVehicleById, createVehicle, updateVehicle };
