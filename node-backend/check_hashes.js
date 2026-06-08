import mongoose from "mongoose";
import "dotenv/config";
import Employee from "./modules/employee/employeeschema.js";
import Company from "./modules/company/companyschema.js";

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const employees = await Employee.find().limit(5);
        console.log("\n--- Checking Employees ---");
        employees.forEach(e => {
            console.log(`Email: ${e.email}`);
            console.log(`Password: ${e.password}`);
            console.log(`Is Hashed? ${e.password && e.password.startsWith('$2b$')}`);
        });

        const companies = await Company.find().limit(5);
        console.log("\n--- Checking Companies ---");
        companies.forEach(c => {
            console.log(`Name: ${c.name}`);
            console.log(`Password: ${c.password}`);
            console.log(`Is Hashed? ${c.password && c.password.startsWith('$2b$')}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
