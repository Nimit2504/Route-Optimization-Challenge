import express from "express";
import { 
    createEmployee, 
    updateEmployee, 
    createEmployeeAttributes,
    getEmployeeProfile,
    getEmployeeRideDetails,
    getEmployeeFleets,
    getEmployeeFleetsByDay
} from "../controllers/employee.controller.js";
import { requireAuth, ensureSameUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// WRITE ROUTES
/**
 * @route POST /employee/create
 * @desc Manually adds a new employee to the system. Usually handled via bulk upload, but this is for single additions.
 * @body { name, email, company, ... }
 */
router.post("/create", requireAuth, createEmployee);

/**
 * @route POST /employee/attributes
 * @desc Assigns specific needs to an employee for a roster (like pickup location or shift timing).
 * @body { employee, fleet, pickupLocation, timeWindow, ... }
 */
router.post("/attributes", requireAuth, createEmployeeAttributes);

/**
 * @route POST /employee/update/:id
 * @desc Updates an employee's contact details or preferences.
 * @param {string} id - The Employee's unique ID
 * @body { phone, address, ... }
 */
router.post("/update/:id", requireAuth, ensureSameUser, updateEmployee);

// READ ROUTES
/**
 * @route GET /employee/profile/:id
 * @desc Fetches the full profile info for a specific employee.
 * @param {string} id - The Employee's unique ID
 */
router.get("/profile/:id", requireAuth, ensureSameUser, getEmployeeProfile);

/**
 * @route GET /employee/ride/:id
 * @desc Shows the employee their upcoming or current trip details.
 * @param {string} id - The Employee's unique ID
 */
router.get("/ride/:id", requireAuth, ensureSameUser, getEmployeeRideDetails);

/**
 * @route GET /employee/fleets/:id
 * @desc Get fleets the employee is part of
 * @param {string} id - Employee ID
 */
router.get("/fleets/:id", requireAuth, ensureSameUser, getEmployeeFleets);

/**
 * @route GET /employee/fleets/:id/filter
 * @desc Get employee fleets filtered by day
 * @param {string} id - Employee ID
 * @query {string} day - Day of week (e.g., "Mon")
 */
router.get("/fleets/:id/filter", requireAuth, ensureSameUser, getEmployeeFleetsByDay);

export default router;