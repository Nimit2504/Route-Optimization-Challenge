import express from "express";
import { processDynamicUpdate } from "../controllers/dynamic.controller.js";

const router = express.Router();

// UPDATE ROUTES

/**
 * @route POST /dynamic/
 * @desc Apply dynamic changes to an existing fleet (e.g. employee schedule changes, new employees). 
 *       Processes changes via Python optimizer, updates fleet metrics, trips, and vehicle assignments.
 * @body {string} companyId - The ID of the company
 * @body {string} fleetId - The ID of the fleet to update
 * @body {Array|Object} changes - The dynamic changes to apply (JSON format)
 * @access Private
 */
router.post("/", processDynamicUpdate);


export default router;