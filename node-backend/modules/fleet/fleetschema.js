import { Schema, model } from "mongoose";

const fleetSchema = new Schema(
    {
        fleetId: {
            type: String,
            required: true
        },
        company : {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true
        },
        weekdays : {
            type : [String], // e.g., ["Mon", "Wed", "Fri"]
            required : true
        },
        destination : {
            type : {
                type: String,
                enum: ["Point"],
                default: "Point"
            }
            ,
            coordinates : {
                type : [Number], // [longitude, latitude]
                required : true
            }
        },
        max_delay:{
            priority_1 : { type: Number },
            priority_2 : { type: Number },
            priority_3 : { type: Number },
            priority_4 : { type: Number },
            priority_5 : { type: Number },
        },
        objectiveCostWeight : {
            type : Number,
            required : true
        },
        objectiveTimeWeight : {
            type : Number,
            required : true
        },
        metrics: {
            base_cost: Number,
            optimized_cost: Number,
            cost_savings_pct: Number,
            base_time_min: Number,
            optimized_time_min: Number,
            time_savings_pct: Number,
            total_drop_delay: Number,
            unassigned_count: Number,
            unassigned_ids: [String],
            violations: [String]
        },
        optimizationMethod: {
            type: String,
            enum: ["haversine", "google"],
            default: "google"
        },
        link: {
          type: String,
          required: true
    },
    }, { timestamps: true
    }
);

fleetSchema.index({ destination: "2dsphere" });
fleetSchema.virtual("vehicles", {
    ref: "Vehicle",
    localField: "_id",
    foreignField: "fleet"
});
fleetSchema.virtual("employeeAttrs", {
    ref: "EmployeeAttr",
    localField: "_id",
    foreignField: "fleet"
});

export default model("Fleet", fleetSchema);
