import passport from "passport";

// Validates JWT token and attaches user to request
export const requireAuth = passport.authenticate('jwt', { session: false });

// Ensures the logged-in user matches the requested resource ID
export const ensureSameUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: Please log in." });
    }

    if (req.user._id.toString() !== req.params.id) {
        return res.status(403).json({ message: "Forbidden: Access denied." });
    }

    next();
};
