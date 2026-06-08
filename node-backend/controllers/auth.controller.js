import jwt from "jsonwebtoken";
import passport from "passport";
import TokenBlacklist from "../modules/login/tokenBlacklistSchema.js";

const generateToken = (user, role) => {
    return jwt.sign(
        { id: user._id, role: role },
        process.env.JWT_SECRET,
        { expiresIn: "2d" }
    );
};

export const loginEmployee = (req, res, next) => {
    console.log("hello");
    passport.authenticate("employee-local", { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: info ? info.message : "Invalid Credentials" });
        }
        
        const token = generateToken(user, "employee");
        res.json({ 
            message: "Logged in successfully", 
            token, 
            user: user, 
            role: "employee",
            redirectUrl: `/dashboard/${user._id}`
        });
    })(req, res, next);
};

export const loginCompany = (req, res, next) => {
    passport.authenticate("company-local", { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: info ? info.message : "Invalid Credentials" });
        }

        const token = generateToken(user, "company");
        res.json({ 
            message: "Logged in successfully", 
            token, 
            user: user, 
            role: "company",
            redirectUrl: `/dashboard/${user._id}`
        });
    })(req, res, next);
};

export const googleCallback = (req, res) => {
    // Passport has already authenticated the user and put them in req.user
    const token = generateToken(req.user, "company");
    
    // Redirect back to the frontend with the token
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/success?token=${token}&role=company&id=${req.user._id}&setup=${req.user.setup}`,
    );
};

export const logout = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1]; // Bearer <token>
            if (token) {
                await TokenBlacklist.create({ token });
            }
        }
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        // Even if there's a duplicate error (token already blacklisted), we treat it as success
        res.status(200).json({ message: "Logged out successfully" }); 
    }
};


