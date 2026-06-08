import Fleet from "../modules/fleet/fleetschema.js";
import Vehicle from "../modules/vehicle/vehicleschema.js";
import EmployeeAttr from "../modules/attributes/empattSchema.js";
import Company from "../modules/company/companyschema.js";
import { processCreateEmployees } from "./employee.controller.js";

// Main logic: Parse Excel data -> Create Fleet + Vehicles + Employees
// export const processFleetData = async (companyId, data, days, providedOptimizerResult = null, fileName = null) => {
//     if (!companyId) {
//         throw new Error("Company ID is required");
//     }

//     if (!data || !Array.isArray(data) || data.length < 2) {
//         throw new Error("Invalid data format. Expected array of spreadsheet data.");
//     }

//     let optimizerResult = providedOptimizerResult;

//     if (!optimizerResult) {
//         const dataPass = {
//             "employees" : data[0].map(emp => ({
//                 ...emp,
//                 pickup_lat: Number(emp.pickup_lat),
//                 pickup_lng: Number(emp.pickup_lng),
//                 drop_lat: Number(emp.drop_lat),
//                 drop_lng: Number(emp.drop_lng),
//                 earliest_pickup: emp.earliest_pickup, // keep as strings or convert if needed?
//                 latest_drop: emp.latest_drop,
//                 priority: Number(emp.priority)
//             })),
//             "vehicles" : data[1].map(veh => ({
//                 ...veh,
//                 current_lat: Number(veh.current_lat),
//                 current_lng: Number(veh.current_lng),
//                 capacity: Number(veh.capacity),
//                 cost_per_km: Number(veh.cost_per_km),
//                 avg_speed_kmph: Number(veh.avg_speed_kmph)
//             })),
//             "metadata" : data[3],
//         }

//         const optimizerRes = await fetch(`${OPTI_URL}/api/optimizer/json`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(dataPass),
//         });

//         if (!optimizerRes.ok) {
//           const text = await optimizerRes.text();
//           throw new Error(`Optimizer service failed: ${text}`);
//         }

//         optimizerResult = await optimizerRes.json();
//     }

//     const dropLat = data[0][0]?.drop_lat;
//     const dropLng = data[0][0]?.drop_lng;

//     if (!dropLat || !dropLng) {
//         throw new Error("Fleet destination (drop_lat/lng) missing in employee data.");
//     }

//     // Extract fleet configuration settings from metadata
//     let fleetConfigRow = {};
//     if (data[3]) {
//             data[3].map(row => {
//             fleetConfigRow[row.key] = row.value;
//         })
//     }
    
//     const weights = {
//         cost: fleetConfigRow.objective_cost_weight !== undefined ? Number(fleetConfigRow.objective_cost_weight) : 0.5,
//         time: fleetConfigRow.objective_time_weight !== undefined ? Number(fleetConfigRow.objective_time_weight) : 0.5
//     };

//     const maxDelayDefaults = {
//         priority_1: Number(fleetConfigRow.priority_1_max_delay_min) || 10,
//         priority_2: Number(fleetConfigRow.priority_2_max_delay_min) || 15,
//         priority_3: Number(fleetConfigRow.priority_3_max_delay_min) || 20,
//         priority_4: Number(fleetConfigRow.priority_4_max_delay_min) || 30,
//         priority_5: Number(fleetConfigRow.priority_5_max_delay_min) || 45
//     };

//     const metrics = optimizerResult && optimizerResult.metrics ? optimizerResult.metrics : {};

//     const newFleet = await Fleet.create({
//         fleetId: `FLEET-${fileName ? fileName.split('.')[0] : Date.now()}`,
//         company: companyId,
//         weekdays: days || ["Mon", "Tue", "Wed", "Thu", "Fri"],
//         destination: {
//             type: "Point",
//             coordinates: [dropLng, dropLat]
//         },
//         max_delay: maxDelayDefaults,
//         objectiveCostWeight: weights.cost,
//         objectiveTimeWeight: weights.time,
//         metrics: {
//             base_cost: metrics.base_cost,
//             optimized_cost: metrics.optimized_cost,
//             cost_savings_pct: metrics.cost_savings_pct,
//             base_time_min: metrics.base_time_min,
//             optimized_time_min: metrics.optimized_time_min,
//             time_savings_pct: metrics.time_savings_pct,
//             total_drop_delay: metrics.total_drop_delay,
//             unassigned_count: metrics.unassigned_count,
//             unassigned_ids: metrics.unassigned_ids,
//             violations: metrics.violations
//         }
//     });


//     // 1. Process Vehicle Sheet
//     const vehicleRawData = data[1] || [];
//     const vehiclesToCreate = vehicleRawData.map(veh => ({
//         vehicleId: veh.vehicle_id,
//         fleet: newFleet._id,
//         company: companyId,
//         fuelType: veh.fuel_type,
//         vehicleMode: veh.vehicle_type === "2W" ? "2-wheeler" : (veh.vehicle_type === "4W" ? "4-wheeler" : "van"),
//         seatingCapacity: veh.capacity,
//         vehicleType: veh.category.toLowerCase() === "premium" ? "premium" : "normal",
//         costPerKm: veh.cost_per_km,
//         performance: {
//             averageMileage: veh.avg_mileage,
//             averageSpeed: veh.avg_speed_kmph,
//             vehicleAge: veh.vehicle_age || 0
//         },
//         currentLocation: {
//             type: "Point",
//             coordinates: [veh.current_lng, veh.current_lat] // [lng, lat]
//         },
//         availableFrom: (veh.available_from && !isNaN(new Date(veh.available_from).getTime()))
//             ? new Date(veh.available_from)
//             : new Date(),
//         availabilityStatus: "available"
//     }));

//     const createdVehicles = await Vehicle.insertMany(vehiclesToCreate);


//     // 2. Process Employee Sheet
//     const employeeRawData = data[0] || [];
//     let empResult = { results: [] };

//     if (employeeRawData.length > 0) {
//         // Filter out employees that already exist to avoid duplicates
//         const existingEmployeesRes = await Company.findById(companyId).populate('employees');
//         const existingEmployees = existingEmployeesRes.employees || [];
//         const existingEmployeeIds = new Set(existingEmployees.map(emp => emp.employeeId));
//         const employeesToCreate = employeeRawData.filter(emp => !existingEmployeeIds.has(emp.employee_id)).map(emp => ({
//             employeeId: emp.employee_id,
//             name: emp.employee_id,
//             company: companyId
//         }));
        
//         if (employeesToCreate.length > 0) {
//                 try {
//                     const results = await processCreateEmployees(employeesToCreate);
//                     empResult = { success: true, count: results.length, results: results };
//             } catch (empError) {
//                     throw new Error("Failed to create/fetch employees: " + empError.message);
//             }
//         }

//         const emailToIdMap = new Map();
//         if (empResult.results && Array.isArray(empResult.results)) {
//             empResult.results.forEach(r => {
//                 if (r.employee && r.employee.employeeId) {
//                     emailToIdMap.set(r.employee.employeeId, r.id);
//                 }
//             });
//         }

//         existingEmployeesRes.employees.forEach(emp => {
//             if (emp.employeeId) {
//                 emailToIdMap.set(emp.employeeId, emp._id.toString());
//             }
//         });

//         const attributesToCreate = [];

//         // Map Excel rows to Employee Attribute models
//         data[0].forEach(row => {
//             const empIdKey = row.employee_id || row.employeeId;
//             const empId = emailToIdMap.get(empIdKey);

//             if (empId) {
//                 attributesToCreate.push({
//                     employee: empId,
//                     fleet: newFleet._id,
//                     company: companyId,
//                     pickupLocation: {
//                         type: "Point",
//                         coordinates: [Number(row.pickup_lng) || 0, Number(row.pickup_lat) || 0]
//                     },
//                     priority: row.priority,
//                     timeWindow: {
//                         startTime: row.earliest_pickup,
//                         endTime: row.latest_drop
//                     },
//                     sharingPreference: row.sharing_preference,
//                     vehiclePreference: row.vehicle_preference,

//                 });
//             }
//         });

//         // Save all employee attributes
//         if (attributesToCreate.length > 0) {
//             try {
//                 await EmployeeAttr.insertMany(attributesToCreate, { ordered: false });
//             } catch (attrError) {
//                 console.warn("Attribute creation warning:", attrError.message);
//             }
//         }
    
//         return {
//             success: true,
//             message: "Fleet processed successfully",
//             optimizerResult: optimizerResult,
//             fleet: newFleet,
//             vehicleCount: createdVehicles.length,
//             employeeCount: empResult.count,
//             employeeDetails: empResult.results,
//             vehicleDetails: createdVehicles
//         };

//     } else {
//         return {
//             success: true,
//             message: "Fleet processed. No employees found.",
//             fleet: newFleet,
//             vehicleCount: createdVehicles.length,
//             employeeCount: 0
//         };
//     }
// };

export const processFleetData = async (
  companyId,
  data,
  days,
  url,
  providedOptimizerResult = null,
  fileName = null,
  useHaversine = false,
) => {
  console.log("========== PROCESS FLEET DATA START ==========");
  console.log("companyId:", companyId);
  console.log("days:", days);
  console.log("fileName:", fileName);
  console.log("data type:", typeof data);
  console.log("data length:", data?.length);

  if (!companyId) {
    console.error("❌ Company ID missing");
    throw new Error("Company ID is required");
  }

  if (!data || !Array.isArray(data) || data.length < 2) {
    console.error("❌ Invalid spreadsheet data:", data);
    throw new Error("Invalid data format. Expected array of spreadsheet data.");
  }

  console.log("Employee rows:", data[0]?.length);
  console.log("Vehicle rows:", data[1]?.length);
  console.log("Metadata rows:", data[3]?.length);

  const optimizerResult = providedOptimizerResult;

  if (!optimizerResult || !optimizerResult.vehicles) {
    throw new Error("Optimizer result is required to process fleet data.");
  }

  console.log("Optimizer result metrics:", optimizerResult?.metrics);

  const dropLat = data[0]?.[0]?.drop_lat;
  const dropLng = data[0]?.[0]?.drop_lng;

  console.log("Drop coordinates:", dropLat, dropLng);

  if (!dropLat || !dropLng) {
    console.error("❌ Missing drop location in employee sheet");
    throw new Error(
      "Fleet destination (drop_lat/lng) missing in employee data.",
    );
  }

  console.log("Parsing fleet configuration metadata...");

  let fleetConfigRow = {};

  if (data[3]) {
    data[3].forEach((row) => {
      fleetConfigRow[row.key] = row.value;
    });
  }

  console.log("Fleet config:", fleetConfigRow);

  const weights = {
    cost:
      fleetConfigRow.objective_cost_weight !== undefined
        ? Number(fleetConfigRow.objective_cost_weight)
        : 0.5,
    time:
      fleetConfigRow.objective_time_weight !== undefined
        ? Number(fleetConfigRow.objective_time_weight)
        : 0.5,
  };

  const maxDelayDefaults = {
    priority_1: Number(fleetConfigRow.priority_1_max_delay_min) || 10,
    priority_2: Number(fleetConfigRow.priority_2_max_delay_min) || 15,
    priority_3: Number(fleetConfigRow.priority_3_max_delay_min) || 20,
    priority_4: Number(fleetConfigRow.priority_4_max_delay_min) || 30,
    priority_5: Number(fleetConfigRow.priority_5_max_delay_min) || 45,
  };

  console.log("Fleet weights:", weights);
  console.log("Max delay config:", maxDelayDefaults);

  const metrics = optimizerResult?.metrics || {};

  console.log("Creating fleet document...");

  const newFleet = await Fleet.create({
    fleetId: `FLEET-${fileName ? fileName.split(".")[0] : Date.now()}`,
    company: companyId,
    weekdays: days || ["Mon", "Tue", "Wed", "Thu", "Fri"],
    destination: {
      type: "Point",
      coordinates: [dropLng, dropLat],
    },
    max_delay: maxDelayDefaults,
    objectiveCostWeight: weights.cost,
    objectiveTimeWeight: weights.time,
    metrics: metrics,
    optimizationMethod: useHaversine ? "haversine" : "google",
    link: url
  });

  console.log("✅ Fleet created:", newFleet._id);

  // VEHICLES

  console.log("Processing vehicles...");

  const vehicleRawData = data[1] || [];

  console.log("Vehicle rows:", vehicleRawData.length);

  const vehiclesToCreate = vehicleRawData.map((veh) => ({
    vehicleId: veh.vehicle_id,
    fleet: newFleet._id,
    company: companyId,
    fuelType: veh.fuel_type,
    vehicleMode:
      veh.vehicle_type === "2W"
        ? "2-wheeler"
        : veh.vehicle_type === "4W"
          ? "4-wheeler"
          : "van",
    seatingCapacity: veh.capacity,
    vehicleType:
      veh.category.toLowerCase() === "premium" ? "premium" : "normal",
    costPerKm: veh.cost_per_km,
    performance: {
      averageMileage: veh.avg_mileage,
      averageSpeed: veh.avg_speed_kmph,
      vehicleAge: veh.vehicle_age || 0,
    },
    currentLocation: {
      type: "Point",
      coordinates: [veh.current_lng, veh.current_lat],
    },
    availableFrom:
      veh.available_from && !isNaN(new Date(veh.available_from).getTime())
        ? new Date(veh.available_from)
        : new Date(),
    availabilityStatus: "available",
  }));

  console.log("Vehicles prepared:", vehiclesToCreate.length);

  const createdVehicles = await Vehicle.insertMany(vehiclesToCreate);

  console.log("✅ Vehicles inserted:", createdVehicles.length);

  // EMPLOYEES

  console.log("Processing employees...");

  const employeeRawData = data[0] || [];

  console.log("Employee rows:", employeeRawData.length);

  let empResult = { results: [] };

  if (employeeRawData.length > 0) {
    console.log("Fetching existing employees for company:", companyId);

    const existingEmployeesRes =
      await Company.findById(companyId).populate("employees");

    const existingEmployees = existingEmployeesRes.employees || [];

    console.log("Existing employees:", existingEmployees.length);

    const existingEmployeeIds = new Set(
      existingEmployees.map((emp) => emp.employeeId),
    );

    const employeesToCreate = employeeRawData
      .filter((emp) => !existingEmployeeIds.has(emp.employee_id))
      .map((emp) => ({
        employeeId: emp.employee_id,
        name: emp.employee_id,
        company: companyId,
      }));

    console.log("New employees to create:", employeesToCreate.length);

    if (employeesToCreate.length > 0) {
      try {
        console.log("Creating employees...");

        const results = await processCreateEmployees(employeesToCreate);

        console.log("Employees created:", results.length);

        empResult = { success: true, count: results.length, results: results };
      } catch (empError) {
        console.error("❌ Employee creation failed:", empError);

        throw new Error(
          "Failed to create/fetch employees: " + empError.message,
        );
      }
    }

    console.log("Mapping employee IDs...");

    const emailToIdMap = new Map();

    if (empResult.results && Array.isArray(empResult.results)) {
      empResult.results.forEach((r) => {
        if (r.employee && r.employee.employeeId) {
          emailToIdMap.set(r.employee.employeeId, r.id);
        }
      });
    }

    existingEmployees.forEach((emp) => {
      if (emp.employeeId) {
        emailToIdMap.set(emp.employeeId, emp._id.toString());
      }
    });

    console.log("Employee ID map size:", emailToIdMap.size);

    const attributesToCreate = [];

    console.log("Creating employee attribute rows...");

    data[0].forEach((row) => {
      const empIdKey = row.employee_id || row.employeeId;
      const empId = emailToIdMap.get(empIdKey);

      if (empId) {
        attributesToCreate.push({
          employee: empId,
          fleet: newFleet._id,
          company: companyId,
          pickupLocation: {
            type: "Point",
            coordinates: [
              Number(row.pickup_lng) || 0,
              Number(row.pickup_lat) || 0,
            ],
          },
          priority: row.priority,
          timeWindow: {
            startTime: row.earliest_pickup,
            endTime: row.latest_drop,
          },
          sharingPreference: row.sharing_preference,
          vehiclePreference: row.vehicle_preference,
        });
      }
    });

    console.log("Employee attributes prepared:", attributesToCreate.length);

    if (attributesToCreate.length > 0) {
      try {
        await EmployeeAttr.insertMany(attributesToCreate, { ordered: false });

        console.log("✅ Employee attributes inserted");
      } catch (attrError) {
        console.warn("⚠ Attribute creation warning:", attrError.message);
      }
    }

    console.log("========== FLEET PROCESSING COMPLETE ==========");

    return {
      success: true,
      message: "Fleet processed successfully",
      optimizerResult: optimizerResult,
      fleet: newFleet,
      vehicleCount: createdVehicles.length,
      employeeCount: empResult.count,
      employeeDetails: empResult.results,
      vehicleDetails: createdVehicles,
    };
  } else {
    console.log("No employees found in spreadsheet");

    return {
      success: true,
      message: "Fleet processed. No employees found.",
      fleet: newFleet,
      vehicleCount: createdVehicles.length,
      employeeCount: 0,
    };
  }
};

// Create a new fleet
// const createFleet = async (req, res) => {
//     try {
//         const { companyId, data, days } = req.body;
//         const result = await processFleetData(companyId, data, days);
//         res.status(201).json(result);
//     } catch (error) {
//         console.error("Fleet creation error:", error);
//         res.status(500).json({
//             success: false,
//             message: "Fleet creation failed",
//             error: error.message
//         });
//     }
// }

const createFleet = async (req, res) => {
  try {
    console.log("===== CREATE FLEET API CALLED =====");

    const { companyId, data, days } = req.body;

    console.log("companyId:", companyId);
    console.log("days:", days);
    console.log("data length:", data?.length);

    const result = await processFleetData(companyId, data, days);

    console.log("Fleet created successfully");

    res.status(201).json(result);
  } catch (error) {
    console.error("❌ Fleet creation error:");
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Fleet creation failed",
      error: error.message,
    });
  }
};

// Get all vehicles in a specific fleet
const getFleetVehicles = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const vehicles = await Vehicle.find({ fleet: id })
            .skip(skip)
            .limit(limit);
            
        const total = await Vehicle.countDocuments({ fleet: id });

        res.json({ 
            success: true, 
            count: vehicles.length, 
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            vehicles 
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Get all employees assigned to a specific fleet
const getFleetEmployees = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Fetch fleet attributes and populate basic employee info
        const attributes = await EmployeeAttr.find({ fleet: id })
            .skip(skip)
            .limit(limit)
            .populate('employee', '-password')
            .populate('assignedVehicle');
        
        const total = await EmployeeAttr.countDocuments({ fleet: id });

        // Transform result to merge employee details with their fleet-specific preferences
        const employees = attributes
            .map(attr => {
                if(!attr.employee) return null;
                return {
                   ...attr.employee.toObject(),
                   assignedVehicle: attr.assignedVehicle || null,
                   ridePreferences: {
                       pickupLocation: attr.pickupLocation,
                       timeWindow: attr.timeWindow,
                       priority: attr.priority
                   }
                };
            })
            .filter(e => e !== null);
        
        res.json({ 
            success: true, 
            count: employees.length, 
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            employees 
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Get details of a single fleet
const getFleetById = async (req, res) => {
    try {
        const { id } = req.params;
        const fleet = await Fleet.findById(id).populate('company', 'name');
        
        if(!fleet) {
            return res.status(404).json({ success: false, message: "Fleet not found" });
        }

        res.json({ success: true, fleet });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
}

// Get fleets with flexible filtering (days, company)
const getFleets = async (req, res) => {
    try {
        const { days, company, page = 1, limit = 20 } = req.query;
        let query = {};

        if (days) {
            const daysList = days.split(',').map(d => d.trim());
            // Find fleets where 'weekdays' array contains ANY of the provided days
            query.weekdays = { $in: daysList };
        }

        if (company) {
            query.company = company;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const fleets = await Fleet.find(query)
            .populate('company', 'name')
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Fleet.countDocuments(query);
        
        res.json({
            success: true,
            count: fleets.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            fleets
        });
    } catch (error) {
         res.status(500).json({ success: false, message: "Error fetching fleets", error: error.message });
    }
}

const deleteFleet = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedFleet = await Fleet.findByIdAndDelete(id);
        if (!deletedFleet) {
            return res.status(404).json({ success: false, message: "Fleet not found" });
        }
        // Optionally, you can also delete related vehicles and employee attributes here
        await Vehicle.deleteMany({ fleet: id });
        await EmployeeAttr.deleteMany({ fleet: id });
        res.json({ success: true, message: "Fleet and related data deleted successfully" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
}

export { createFleet, getFleets, getFleetVehicles, getFleetEmployees, getFleetById, deleteFleet };