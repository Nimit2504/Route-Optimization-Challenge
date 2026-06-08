import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";



const employeeSchema = new Schema(
    {
        name: String,

        employeeId : String,

        // email in case for app to send notifications
        email: {
            type: String,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        // destination seedhe company ki id se nikal lenge

        rideStatus: {
            type: String,
            enum: ["pending", "assigned", "completed"],
            default: "pending"
        },

        company: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true
        }
    },
    { timestamps: true }
);

// Hash password before saving
employeeSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

// Method to verify password
employeeSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

employeeSchema.virtual("employeeAttrs", {
    ref: "EmployeeAttr",
    localField: "_id",
    foreignField: "employee"
});

export default model("Employee", employeeSchema);