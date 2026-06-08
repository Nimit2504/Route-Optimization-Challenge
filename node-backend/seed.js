import mongoose from "mongoose";
import "dotenv/config";
import Vehicle from "./modules/vehicle/vehicleschema.js";
import Company from "./modules/company/companyschema.js";

// Database Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected for Seeding");
    } catch (err) {
        console.error("Database connection error:", err);
        process.exit(1);
    }
};

// Data Generators
const fuelTypes = ["petrol", "diesel", "electric"];
const vehicleModes = ["2-wheeler", "4-wheeler", "van"];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateRandomCoordinates = () => {
    // Approximate lat/long for a city (e.g., somewhere in India)
    const lat = 17.3850 + (Math.random() - 0.5) * 0.1;
    const lng = 78.4867 + (Math.random() - 0.5) * 0.1;
    return [lng, lat]; // GeoJSON uses [longitude, latitude]
};

const generateVehicle = () => {
    const mode = getRandomElement(vehicleModes);
    let seatingCapacity;
    if (mode === "2-wheeler") seatingCapacity = 2;
    else if (mode === "4-wheeler") seatingCapacity = 4 + Math.floor(Math.random() * 2); // 4 or 5
    else seatingCapacity = 6 + Math.floor(Math.random() * 5); // 6 to 10

    return {
        vehicleId: `V-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        fuelType: getRandomElement(fuelTypes),
        vehicleMode: mode,
        seatingCapacity: seatingCapacity,
        costPerKm: 10 + Math.floor(Math.random() * 20),
        performance: {
            averageMileage: 10 + Math.floor(Math.random() * 30),
            averageSpeed: 30 + Math.floor(Math.random() * 40),
            vehicleAge: 1 + Math.floor(Math.random() * 10)
        },
        currentLocation: {
            type: "Point",
            coordinates: generateRandomCoordinates()
        },
        availableFrom: new Date()
        // Note: 'company' field removed from vehicle schema
    };
};

const seedData = async () => {
    await connectDB();

    try {
        console.log("Starting Seed Process...");

        // Create 3 different companies with vehicles
        const numberOfCompanies = 3;

        for (let i = 0; i < numberOfCompanies; i++) {
            // 1. Generate random vehicles (without company ref initially)
            const vehicleCount = 3 + Math.floor(Math.random() * 5); // 3 to 7 vehicles
            const vehiclesToCreate = [];
            
            for (let j = 0; j < vehicleCount; j++) {
                vehiclesToCreate.push(generateVehicle());
            }

            // Save Vehicles
            const createdVehicles = await Vehicle.insertMany(vehiclesToCreate);
            const vehicleIds = createdVehicles.map(v => v._id);
            
            console.log(`\n--- Company Generation ${i + 1} ---`);
            console.log(`Created ${createdVehicles.length} Vehicles`);

            // 2. Create Company linked to these vehicles
            const companyData = {
                name: `Test Multi Company ${Math.floor(Math.random() * 10000)}`,
                location: {
                    type: "Point",
                    coordinates: generateRandomCoordinates()
                },
                vehicles: vehicleIds, 
                employees: []
            };

            const newCompany = await Company.create(companyData);
            console.log(`Created Company: "${newCompany.name}" (ID: ${newCompany._id})`);
            console.log(`Linked ${newCompany.vehicles.length} vehicles to company.`);
        }

        console.log("\nSeeding Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Error Seeding Data:", error);
        process.exit(1);
    }
};

seedData();
