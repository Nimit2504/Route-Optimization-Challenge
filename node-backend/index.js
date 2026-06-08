import dotenv from "dotenv";
import express from "express";
import passport from "passport";
import cors from "cors";
import connectDB from "./utils/DB.js";
import uploadRoutes from "./routes/upload.route.js";
import loginRoutes from "./modules/login/login.routes.js";
import "./modules/login/passport.config.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import companyRoutes from "./routes/company.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import fleetRoutes from "./routes/fleet.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import dynamicRoutes from "./routes/dynamic.route.js";

// Load env variables
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
  }),
);

app.use(express.json());

// Connect DB
connectDB();

// Passport
app.use(passport.initialize());

// Routes
app.use("/vehicle", vehicleRoutes);
app.use("/employee", employeeRoutes);
app.use("/company", companyRoutes);
app.use("/", uploadRoutes);
app.use("/auth", loginRoutes);
app.use("/fleet", fleetRoutes);
app.use("/trip", tripRoutes);
app.use("/dynamic", dynamicRoutes);

console.log(process.env.OPTI_URL, "found the opti url");

app.listen(process.env.PORT, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});
