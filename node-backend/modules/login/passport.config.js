import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20"; 
import employeeschema from "../employee/employeeschema.js";
import companyschema from "../company/companyschema.js";
import TokenBlacklist from "./tokenBlacklistSchema.js";

// PASSPORT STRATEGY
passport.use('employee-local', new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
        console.log(`[Employee Login Attempt] Email: ${email}`); 
        try {
            let fetchUser = await employeeschema.findOne({ email: email });
            
            if (!fetchUser) {
                console.log("[Employee Login] User not found");
                return done(null, false, { message: "Invalid Credentials" });
            }

            console.log(`[Employee Login] User found: ${fetchUser._id}`);
            
            // Use method from schema
            const isMatch = await fetchUser.comparePassword(password);
            
            if (!isMatch) {
                console.log("[Employee Login] Password mismatch");
                return done(null, false, { message: "Invalid Credentials" });
            }

            console.log("[Employee Login] Successful");
            const user = fetchUser.toObject();

            // Remove sensitive data
            delete user.password;
            user.role = "employee";

            return done(null, user);
        }
        catch (err) {
            return done(err);
        }

    }
));

passport.use('company-local', new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
        console.log(`[Company Login Attempt] Email: ${email}`);
        try {
            let fetchUser = await companyschema.findOne({ email: email });
            
            if (!fetchUser) {
                console.log("[Company Login] User not found");
                return done(null, false, { message: "Invalid Credentials" });
            }
            
            console.log(`[Company Login] User found: ${fetchUser._id}`);

            // Use method from schema
            const isMatch = await fetchUser.comparePassword(password);
            if (!isMatch) {
                console.log("[Company Login] Password mismatch");
                return done(null, false, { message: "Invalid Credentials" });
            }

            console.log("[Company Login] Successful");
            const user = fetchUser.toObject();

            // Remove sensitive data
            delete user.password;
            user.role = "company";

            return done(null, user);
        }
        catch (err) {
            return done(err);
        }

    }
));

// GOOGLE STRATEGY FOR COMPANY
passport.use('google-company', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_ID",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER_SECRET",
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        //Check if company exists by Google ID
        let company = await companyschema.findOne({ googleId: profile.id });

        if (company) {
             const user = company.toObject();
             user.role = "company";
             user.setup = false;
             return done(null, user);
        }
        
        // Check if company exists by Email (to link accounts)
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if(email) {
             company = await companyschema.findOne({ email });
             if(company) {
                 company.googleId = profile.id;
                 await company.save();
                 const user = company.toObject();
                 user.role = "company";
                 return done(null, user);
             }
        }

        // Create new Company if not found
        company = await companyschema.create({
            name: profile.displayName,
            email: email,
            googleId: profile.id,
            location: { type: 'Point', coordinates: [0, 0] },
        });
        
        const user = company.toObject();
        user.role = "company";
        user.setup = true;
        return done(null, user);

    } catch (err) {
        return done(err, null);
    }
  }
));

// JWT STRATEGY
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || "your-secret-key",
    passReqToCallback: true
};

passport.use('jwt', new JwtStrategy(jwtOptions, async (req, jwt_payload, done) => {
    try {
        // Check if token is blacklisted
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        if (token) {
            const isBlacklisted = await TokenBlacklist.exists({ token });
            if (isBlacklisted) {
                return done(null, false, { message: "Token is invalidated" });
            }
        }

        let user = null;
        let fetchUser = null;

        if (jwt_payload.role === 'employee') {
            fetchUser = await employeeschema.findById(jwt_payload.id);
        } else if (jwt_payload.role === 'company') {
            fetchUser = await companyschema.findById(jwt_payload.id);
        }

        if (fetchUser) {
            user = fetchUser.toObject();
            user.role = jwt_payload.role;
            delete user.password;
            return done(null, user);
        } else {
            return done(null, false);
        }
    } catch (err) {
        return done(err, false);
    }
}));
