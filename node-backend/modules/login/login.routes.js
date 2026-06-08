// routes for handling authentication
import express from "express";
import passport from "passport";
import { loginEmployee, loginCompany, googleCallback, logout } from "../../controllers/auth.controller.js";

const router = express.Router();

/**
 * @route POST /auth/login/employee
 * @desc Signs in an Employee. Call this when a regular staff member wants to access their portal.
 * @body { email, password }
 */
router.post("/login/employee", loginEmployee);

/**
 * @route POST /auth/login/company
 * @desc Signs in a Company Admin. Call this for dashboard access for fleet managers.
 * @body { email, password }
 */
router.post("/login/company", loginCompany);

// Google OAuth Routes
/**
 * @route GET /auth/google
 * @desc Starts the "Sign in with Google" flow for Company accounts. Redirects to Google.
 */
router.get("/google", passport.authenticate("google-company", { scope: ["profile", "email"] }));

/**
 * @route GET /auth/google/callback
 * @desc Google redirects back here after success. We verify and return the auth token.
 */
router.get("/google/callback", 
  passport.authenticate("google-company", { session: false, failureRedirect: "/login/failed" }),
  googleCallback
);

/**
 * @route GET /auth/verify
 * @desc Checks if the user's current token is valid. Useful for "Remember Me" functionality.
 * @header Authorization: Bearer <token>
 */
router.get("/verify", passport.authenticate("jwt", { session: false }), (req, res) => {
    res.json({ user: req.user, role: req.user.role });
});

/**
 * @route POST /auth/logout
 * @desc Logout user (Client-side token removal instruction)
 */
router.post("/logout", logout);

export default router;