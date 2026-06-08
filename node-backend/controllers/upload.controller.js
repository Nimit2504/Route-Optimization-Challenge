import xlsx from "xlsx";
import fs from "fs";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import { processFleetData } from "./fleet.controller.js";
import { processCreateTrips } from "./trip.controller.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFile = async (req, res) => {
  try {
    console.log("[uploadFile] called");

    if (!req.file) {
      console.error("[uploadFile] no file on request");
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { companyId, days: daysStr, isHaversine: isHaversine } = req.body;
    console.log("[uploadFile] companyId:", companyId, "daysStr:", daysStr, "useHaversineStr:", isHaversine);

    const useHaversine = isHaversine === "true" || isHaversine === true;

    // Parse days
    let days;
    try {
      days = daysStr ? JSON.parse(daysStr) : ["Mon", "Tue", "Wed", "Thu", "Fri"];
    } catch (e) {
      days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      console.warn("[uploadFile] failed to parse daysStr, defaulting:", daysStr, e?.message);
    }

    // Upload file to Cloudinary
    console.log("[uploadFile] uploading to Cloudinary...");
    const cloudRes = await cloudinary.uploader.upload(req.file.path, {
      folder: "fleet_uploads",
      resource_type: "auto",
      public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`,
    });
    console.log("[uploadFile] Cloudinary URL:", cloudRes.secure_url);

    // Call optimizer with the Cloudinary URL as a raw JSON string body
    console.log("[uploadFile] calling optimizer service...");
    const optiUrl = process.env.OPTI_URL;
    if (!optiUrl) throw new Error("OPTI_URL is not defined in environment");

    const optimizerEndpoint = useHaversine ? "/api/optimizerhaversine/" : "/api/optimizer/";
    console.log(`[uploadFile] using optimizer endpoint: ${optimizerEndpoint}`);

    const formData = new FormData();
    // formData.append("file", fs.createReadStream(req.file.path), {
    //   filename: req.file.originalname,
    //   contentType: req.file.mimetype,
    // });
    // const optimizerRes = await axios.post(`${optiUrl}${optimizerEndpoint}`, formData, {
    //   headers: { ...formData.getHeaders() },
    //   maxBodyLength: Infinity,
    //   maxContentLength: Infinity,
    // });
    console.log("yaha pe aaya 1");
    const optimizerRes = await axios.post(`${optiUrl}${optimizerEndpoint}`, {
      file_url: cloudRes.secure_url,
    });
    const optimizerResult = optimizerRes.data;
    console.log("[uploadFile] optimizer result received, vehicles:", optimizerResult?.vehicles?.length);

    // Delete local temp file
    try {
      fs.unlinkSync(req.file.path);
      console.log("[uploadFile] deleted temp file:", req.file.path);
    } catch (err) {
      console.warn("[uploadFile] failed to delete temp file:", err?.message);
    }


    // Download the Excel file from Cloudinary for processing
    console.log("[uploadFile] fetching workbook from Cloudinary...");
    const response = await axios.get(cloudRes.secure_url, { responseType: "arraybuffer" });
    const workbook = xlsx.read(response.data, { type: "buffer" });

    const data = workbook.SheetNames.map(sheetName =>
      xlsx.utils.sheet_to_json(workbook.Sheets[sheetName])
    );
    console.log("[uploadFile] Cloudinary URL:", cloudRes.secure_url);
    console.log("[uploadFile] calling processFleetData...");
    const result = await processFleetData(
      companyId,
      data,
      days,
      cloudRes.secure_url,
      optimizerResult,
      req.file.originalname,
      useHaversine
    );

    console.log("[uploadFile] fleet processed:", result.fleet?._id);

    // Generate trips immediately
    if (result.success && result.fleet?._id) {
      try {
        const trips = await processCreateTrips(
          result.fleet._id,
          new Date(),
          result.optimizerResult // pass actual optimizerResult from fleet processing
        );
        result.tripCount = trips.length;
        result.trips = trips;
        console.log("[uploadFile] created trips count:", trips.length);
      } catch (tripError) {
        console.error("[uploadFile] Error creating trips:", tripError?.message);
        result.tripError = tripError.message;
      }
    }

    res.status(201).json(result);
  } catch (e) {
    console.error("[uploadFile] error:", e);
    const errorMsg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    res.status(500).json({
      success: false,
      message: "Upload processing failed: " + errorMsg,
    });
  }
};

export { uploadFile };
