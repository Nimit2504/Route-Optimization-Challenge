import { Schema, model } from "mongoose";

const employeeAttrSchema = new Schema({
    employee: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    fleet : {
        type: Schema.Types.ObjectId,
        ref: "Fleet",
        required: true
    },
    company : {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    pickupLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    priority: {
        type: Number,
    },
    timeWindow: {
        startTime: {
            type: String,
        },
        endTime: {
            type: String,
        }
    },
    sharingPreference: {
        type: String,
        enum: ["single", "double", "triple", "any"],
    },
    vehiclePreference: {
        type: String,
        enum: ["premium", "normal", "any"],
    },
    assignedVehicle: {
        type: Schema.Types.ObjectId,
        ref: "Vehicle",
        default: null
    }
    
}, { timestamps: true });

export default model("EmployeeAttr", employeeAttrSchema);