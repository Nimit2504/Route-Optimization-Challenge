import { Schema, model } from "mongoose";

const tripSchema = new Schema(
    {
        fleet: {
            type: Schema.Types.ObjectId,
            ref: "Fleet",
            required: true
        },
        vehicle: {
            type: Schema.Types.ObjectId,
            ref: "Vehicle",
            required: true
        },
        days: {
            type: [String],
            required: true
        },
        status: {
            type: String,
            enum: ["scheduled", "in-progress", "completed", "cancelled"],
            default: "scheduled"
        },
        initialLocation: {
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
        stops: [
            {
                stopType: {
                    type: String,
                    enum: ["pickup", "dropoff"],
                    default: "pickup"
                },
                employee: {
                    type: Schema.Types.ObjectId,
                    ref: "Employee",
                    required: false
                },
                location: {
                    type: {
                        type: String,
                        enum: ["Point"],
                        default: "Point"
                    },
                    coordinates: {
                        type: [Number], // [lon, lat]
                        required: true
                    }
                },
                plannedTime: {
                    type: String,
                    required: true
                },
                actualTime: {
                    type: String
                },
                status: {
                    type: String,
                    enum: ["pending", "completed", "skipped"],
                    default: "pending"
                },
                delay : {
                    type: Number, // delay in minutes
                    default: 0
                }
            }
        ],
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String
        },
        totalDistance: {
            type: Number,
            default: 0
        },
        totalDuration: {
            type: Number, // In minutes
            default: 0
        },
        oldDistance: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

tripSchema.index({ fleet: 1, days: 1 });
tripSchema.index({ vehicle: 1, days: 1 });

const Trip = model("Trip", tripSchema);
export default Trip;
