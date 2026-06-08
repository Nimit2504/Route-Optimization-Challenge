import express from "express";
import { createFleet, getFleets, getFleetVehicles, getFleetEmployees, getFleetById, deleteFleet } from "../controllers/fleet.controller.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// READ ROUTES
/**
 * @route GET /fleet/
 * @desc Browses all created fleets. Supports filtering by day, company, and pagination.
 * @query {string} days - Filter by days (e.g., "Mon,Tue")
 * @query {string} company - Filter by Company ID
 * @query {number} page - Which page number to load
 * @query {number} limit - How many items per page
 */
router.get("/", requireAuth, getFleets);

/**
 * @route GET /fleet/:id
 * @desc Get details of a single specific Fleet/Roster.
 * @param {string} id - The Fleet's unique ID
 */
router.get("/:id", requireAuth, getFleetById);

/**
 * @route GET /fleet/:id/vehicles
 * @desc Lists the vehicles assigned to this specific Fleet/Roster.
 * @param {string} id - The Fleet's unique ID
 * @query {number} page
 * @query {number} limit
 */
router.get("/:id/vehicles", requireAuth, getFleetVehicles);

/**
 * @route GET /fleet/:id/employees
 * @desc Lists which employees are scheduled for this specific Fleet/Roster.
 * @param {string} id - The Fleet's unique ID
 * @query {number} page
 * @query {number} limit
 */
router.get("/:id/employees", requireAuth, getFleetEmployees);

// CREATE FLEET ROUTE
/**
 * @route POST /fleet/create
 * @desc Manually creates a new Fleet entry. (Note: Usually done automatically via Excel upload).
 * @body { companyId, data, days }
 * @note Prefer using /upload endpoint for spreadsheet-based creation
 */
router.post("/create", requireAuth, createFleet);

// DELETE FLEET ROUTE
/**
 * @route DELETE /fleet/:id
 * @desc Deletes a Fleet/Roster by its ID. Also removes all associated EmployeeAttr records.
 * @param {string} id - The Fleet's unique ID
 * @note This is a destructive action and should be used with caution. Consider implementing a "soft delete" in the future.
 */
router.delete("/:id", deleteFleet);

export default router;