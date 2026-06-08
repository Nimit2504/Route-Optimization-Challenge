import Fleet from "../modules/fleet/fleetschema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import { processCreateTrips } from "./trip.controller.js";
import Trip from "../modules/trip/tripschema.js";
import EmployeeAttr from "../modules/attributes/empattSchema.js";
import Vehicle from "../modules/vehicle/vehicleschema.js";
import Employee from "../modules/employee/employeeschema.js";
import { processCreateEmployees } from "./employee.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const processDynamicUpdate = async (req, res) => {
  try {
    const { companyId, fleetId, changes } = req.body;

    if (!companyId || !fleetId || !changes) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // fetch fleet by companyId and fleetId
    const fleet = await Fleet.findOne({ company: companyId, _id: fleetId });
    if (!fleet) {
      return res.status(404).json({ success: false, message: "Fleet not found" });
    }

    if (!fleet.link) {
      return res.status(400).json({ success: false, message: "Fleet does not have a Cloudinary file URL" });
    }

    // Download Excel file from Fleet.link (Cloudinary URL)
    const excelResponse = await axios.get(fleet.link, { responseType: "arraybuffer" });
    const workbook = xlsx.read(excelResponse.data, { type: "buffer" });

    // Read original employees from first sheet
    const originalEmployees = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const existingIds = new Set(originalEmployees.map(e => String(e.employee_id || e.employeeId)));

    // Transform changes to backend-compatible format
    const changesArray = Array.isArray(changes) ? changes : [changes];
    const transformedChanges = changesArray.map(change => {
      const id = change.employee_id || change.employeeId;
      let requestType = "UPDATE"; // default

      const actionInput = change.action || change.type || change.request_type;
      if (actionInput) {
        const act = String(actionInput).toUpperCase();
        if (act === "DELETE" || act === "REMOVE") requestType = "DELETE";
        else if (act === "ADD" || act === "CREATE") requestType = "ADD";
        else if (act === "UPDATE" || act === "EDIT" || act === "MODIFY") requestType = "UPDATE";
      } else {
        requestType = existingIds.has(String(id)) ? "UPDATE" : "ADD";
      }

      const sampleEmp = originalEmployees[0] || {};
      const dropLat = sampleEmp.drop_lat;
      const dropLng = sampleEmp.drop_lng;

      return {
        ...change,
        request_type: requestType,
        employee_id: id,
        pickup_lat: change.pickup_lat || change.pickupLat || change.pickupLocation?.coordinates?.[1],
        pickup_lng: change.pickup_lng || change.pickupLng || change.pickupLocation?.coordinates?.[0],
        drop_lat: dropLat,
        drop_lng: dropLng,
        earliest_pickup: change.earliest_pickup || change.earliestPickup || change.timeWindow?.startTime,
        latest_drop: change.latest_drop || change.latestDrop || change.timeWindow?.endTime,
        priority: change.priority || 1,
        vehicle_preference: change.vehicle_preference || change.vehiclePreference || "any",
        sharing_preference: change.sharing_preference || change.sharingPreference || "any",
      };
    });

    // Create a temporary CSV for changes
    const changesWorkbook = xlsx.utils.book_new();
    const changesSheet = xlsx.utils.json_to_sheet(transformedChanges);
    xlsx.utils.book_append_sheet(changesWorkbook, changesSheet, "Changes");
    const tempFilePath = path.join(__dirname, "../uploads", `temp_changes_${Date.now()}.csv`);
    xlsx.writeFile(changesWorkbook, tempFilePath, { bookType: "csv" });

    // Upload changes CSV to Cloudinary
    console.log("[dynamic] uploading changes CSV to Cloudinary...");
    const csvCloudRes = await cloudinary.uploader.upload(tempFilePath, {
      folder: "fleet_dynamic_changes",
      resource_type: "auto",
      public_id: `${Date.now()}-dynamic-changes`,
    });
    console.log("[dynamic] CSV Cloudinary URL:", csvCloudRes.secure_url);

    // Clean up local temp file now that it's on Cloudinary
    try {
      fs.unlinkSync(tempFilePath);
    } catch (err) {
      console.warn("[dynamic] failed to delete temp CSV:", err?.message);
    }

    // Send Cloudinary URLs to optimizer instead of raw files
    const optiUrl = process.env.OPTI_URL;
    if (!optiUrl) throw new Error("OPTI_URL is not defined in environment");

    console.log("[dynamic] calling optimizer with Cloudinary URLs...");
    console.log(csvCloudRes.secure_url);
    const optimizerRes = await axios.post(
      `${optiUrl}/api/dynamic`,
      {
        static_file_url: fleet.link,
        dynamic_file_url: csvCloudRes.secure_url,
        company_id: companyId,
      }
    );

    const optimizerResult = optimizerRes.data;

    // Delete old trips and employee attributes for this fleet
    await Trip.deleteMany({ fleet: fleetId });
    await EmployeeAttr.deleteMany({ fleet: fleetId });

    // Create new trips using optimizerResult
    const createdTrips = await processCreateTrips(fleetId, new Date(), optimizerResult);

    // Update fleet metrics
    if (optimizerResult.metrics) {
      fleet.metrics = optimizerResult.metrics;
      await fleet.save();
    }

    // Re-create employee attributes based on optimizer result
    const employeeDataMap = new Map();
    originalEmployees.forEach(emp => {
      const id = emp.employee_id || emp.employeeId;
      if (id) employeeDataMap.set(String(id), emp);
    });

    // Build lookup maps from optimizer result
    // empId -> optimizer vehicle entry (pickup_min, drop_min, etc.)
    const optiVehicleMap = new Map();
    (optimizerResult.vehicles || []).forEach(v => {
      optiVehicleMap.set(String(v.employee_id), v);
    });

    // empId -> actual pickup coordinates used by optimizer [lng, lat]
    const optiPickupCoordsMap = new Map();
    (optimizerResult.mapbox_geojson?.features || []).forEach(f => {
      if (f.properties?.type === "pickup" && f.properties?.employee) {
        optiPickupCoordsMap.set(String(f.properties.employee), f.geometry.coordinates);
      }
    });

    // Convert minutes-from-midnight to "HH:MM" string
    const minsToTimeStr = (mins) => {
      const h = Math.floor(mins / 60).toString().padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    };

    const attributesToCreate = [];
    const assignedEmployeeIds = new Set((optimizerResult.vehicles || []).map(v => String(v.employee_id)));
    const existingEmployees = await Employee.find({ employeeId: { $in: Array.from(employeeDataMap.keys()) } });

    const existingEmployeeMap = new Map();
    existingEmployees.forEach(e => existingEmployeeMap.set(String(e.employeeId), e._id));

    for (const [empIdKey, data] of employeeDataMap.entries()) {
      if (!assignedEmployeeIds.has(empIdKey)) continue;
      const empObjectId = existingEmployeeMap.get(empIdKey);
      if (!empObjectId) continue;

      const optiEntry = optiVehicleMap.get(empIdKey);
      const optiCoords = optiPickupCoordsMap.get(empIdKey);

      // Use optimizer result for location and times; fall back to original Excel data
      const pickupCoords = optiCoords ?? [Number(data.pickup_lng) || 0, Number(data.pickup_lat) || 0];
      const startTime = optiEntry?.pickup_min != null ? minsToTimeStr(optiEntry.pickup_min) : data.earliest_pickup;
      const endTime   = optiEntry?.drop_min   != null ? minsToTimeStr(optiEntry.drop_min)   : data.latest_drop;

      attributesToCreate.push({
        employee: empObjectId,
        fleet: fleetId,
        company: companyId,
        pickupLocation: { type: "Point", coordinates: pickupCoords },
        priority: Number(data.priority) || 0,
        timeWindow: { startTime, endTime },
        sharingPreference: data.sharing_preference || "any",
        vehiclePreference: data.vehicle_preference || "any",
        assignedVehicle: null
      });
    }

    if (attributesToCreate.length > 0) {
      await EmployeeAttr.insertMany(attributesToCreate);
    }

    res.status(200).json({
      success: true,
      message: "Dynamic optimization successful",
      result: optimizerResult,
      tripsCreated: createdTrips.length,
      attributesUpdated: attributesToCreate.length
    });

  } catch (error) {
    console.error("Dynamic route error:", error);
    res.status(500).json({
      success: false,
      message: "Dynamic optimization failed",
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
};