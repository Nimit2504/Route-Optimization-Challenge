import express from "express";
import { fetchAllVehicles, fetchVehicleById, createVehicle, updateVehicle } from "../controllers/vehicle.controller.js";

const router = express.Router();

/**
 * @route GET /vehicle
 * @desc Get a list of all vehicles available in the system.
 */
router.get("/", fetchAllVehicles);

/**
 * @route GET /vehicle/:id
 * @desc View details for a single vehicle (capacity, type, etc.).
 * @param {string} id - The Vehicle's unique ID
 */
router.get("/:id", fetchVehicleById);

/**
 * @route POST /vehicle/create
 * @desc Adds a new vehicle to the fleet.
 * @body { vehicleNo, type, capacity, companyId, ... }
 */
router.post("/create", createVehicle);

/**
 * @route PUT /vehicle/update/:id
 * @desc Edit details of an existing vehicle.
 * @param {string} id - The Vehicle's unique ID
 */
router.put("/update/:id", updateVehicle);

export default router;