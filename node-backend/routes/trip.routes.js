import express from "express";
import { createTrips, getTrips, getTripById } from "../controllers/trip.controller.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE ROUTES
/**
 * @route POST /trip/create
 * @desc System Internal: Generates Trip records from the Optimizer's output. Usually called automatically after file upload.
 * @body { fleetId, date, optimizerResult }
 */
router.post("/create", requireAuth, createTrips);

// READ ROUTES
/**
 * @route GET /trip/
 * @desc Lists all Trips. Use query params to filter by Fleet, Vehicle, or Date.
 * @query {string} fleet - Filter by Fleet ID
 * @query {string} vehicle - Filter by Vehicle ID
 * @query {string} status - Filter by Status (completed, pending, etc.)
 * @query {string} employee - Find trips that include this Employee ID
 * @query {string} date - Filter by Date (YYYY-MM-DD)
 */
router.get("/", requireAuth, getTrips);

/**
 * @route GET /trip/:id
 * @desc Get full details of a specific Trip, including all its stops and timings.
 * @param {string} id - The Trip's unique ID
 */
router.get("/:id", requireAuth, getTripById);

export default router;