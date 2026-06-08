import express from "express";
import { 
    createCompany, 
    updateCompany, 
    getCompanyDashboard, 
    getCompanyFleets,  
    getCompanyEmployees,
    getCompanyVehicles
} from "../controllers/company.controller.js";
import { requireAuth, ensureSameUser } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route POST /company/create
 * @desc Creates a new company account. Use this to onboard a new client organization.
 * @body { name, email, password, phone, address }
 */
router.post("/create", createCompany);

/**
 * @route PUT /company/update/:id
 * @desc Updates profile info for a company (like phone number or address).
 * @param {string} id - The Company's unique ID
 */
router.put("/update/:id", requireAuth, ensureSameUser, updateCompany);

// READ ROUTES
/**
 * @route GET /company/dashboard/:id
 * @desc Loads the main dashboard stats. Use this to show the total fleet count, active trips, and other high-level info.
 * @param {string} id - The Company's unique ID
 */
router.get("/dashboard/:id", requireAuth, ensureSameUser, getCompanyDashboard);

/**
 * @route GET /company/fleets/:id
 * @desc Fetches the entire history of fleet schedules (rosters) uploaded for this company.
 * @param {string} id - The Company's unique ID
 */
router.get("/fleets/:id", requireAuth, ensureSameUser, getCompanyFleets);

/**
 * @route GET /company/employees/:id
 * @desc Lists all employees (staff) registered under this company.
 * @param {string} id - The Company's unique ID
 */
router.get("/employees/:id", requireAuth, ensureSameUser, getCompanyEmployees);

/**
 * @route GET /company/vehicles/:id
 * @desc Lists all vehicles (cabs, buses, etc.) available for this company.
 * @param {string} id - The Company's unique ID
 */
router.get("/vehicles/:id", requireAuth, ensureSameUser, getCompanyVehicles);

export default router;