import mongoose from "mongoose";
import "dotenv/config";
import Employee from "./modules/employee/employeeschema.js";
import Company from "./modules/company/companyschema.js"; 

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected for Seeding");
    } catch (err) {
        console.error("Database connection error:", err);
        process.exit(1);
    }
};

const generateRandomCoordinates = () => {
    // Random coordinates around Hyderabad approximate
    const lat = 17.3850 + (Math.random() - 0.5) * 0.1;
    const lng = 78.4867 + (Math.random() - 0.5) * 0.1;
    return [lng, lat];
};

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedData = async () => {
    await connectDB();

    try {
        console.log("Starting Seed Process...");

        // 1. Create a Company with Login Credentials
        const companyName = `TechCorp_${Math.floor(Math.random() * 1000)}`;
        const companyEmail = `admin@${companyName.toLowerCase()}.com`;
        
        const companyData = {
            name: companyName,
            email: companyEmail,
            // passwod: "password123", // Typo intention check? No, schema expects password
            password: "password123", // Plain text, Schema will hash it
            location: {
                type: "Point",
                coordinates: generateRandomCoordinates()
            },
            vehicles: [], 
            employees: []
        };

        const newCompany = await Company.create(companyData);
        console.log("Full Company Object:", newCompany);
        console.log(`\n✅ Company Created:`);
        console.log(`   Name: ${newCompany.name}`);
        console.log(`   ID:   ${newCompany._id}`);
        console.log(`   Email: ${newCompany.email}`);
        console.log(`   Pass:  password123`);

        // 2. Create Employees linked to this Company
        const employeesToCreate = [];
        const count = 3; 

        for (let i = 1; i <= count; i++) {
            const empName = `e_user_${Math.floor(Math.random()*1000)}`;
            
            // Time window: 8/9 AM to 9/10 AM
            const startTime = new Date();
            startTime.setHours(8 + Math.floor(Math.random() * 2), 0, 0, 0);
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 1);

            employeesToCreate.push({
                name: empName,
                email: `${empName}@${companyName.toLowerCase()}.com`,
                password: "password123", // Plain text, Schema will hash it
                level: Math.floor(Math.random() * 3) + 1,
                pickupLocation: {
                    type: "Point",
                    coordinates: generateRandomCoordinates()
                },
                timeWindow: {
                    startTime: startTime,
                    endTime: endTime
                },
                vehiclePreference: getRandomElement(["premium", "normal", "any"]),
                sharingPreference: getRandomElement(["single", "double", "triple"]),
                company: newCompany._id,
                rideStatus: "pending"
            });
        }

        // Employee.create(array) triggers save hooks for each document automatically
        const createdEmployees = await Employee.create(employeesToCreate);
        
        console.log(`\n✅ Created ${createdEmployees.length} Employees:`);
        createdEmployees.forEach(emp => {
            console.log(`   - ${emp.email} (Pass: password123)`);
        });

        // Update company employee list (Optional reference array)
        newCompany.employees = createdEmployees.map(e => e._id);
        await newCompany.save();
        console.log(`   Updated Company with Employee references.`);

        console.log("\nSeeding Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error Seeding Data:", error);
        process.exit(1);
    }
};

seedData();
