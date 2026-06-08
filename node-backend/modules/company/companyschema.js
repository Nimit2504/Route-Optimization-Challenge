import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const companySchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            unique: true,
            sparse: true 
        },

        password: {
            type: String,
            required: false, // Changed from true to false for OAuth
        },

        googleId: {
            type: String, // Store Google ID
            unique: true,
            sparse: true
        },
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true }, 
        toObject: { virtuals: true } 
    }
);

// Virtual for Vehicles
companySchema.virtual("fleet", {
    ref: "Fleet",
    localField: "_id",
    foreignField: "company"
});

// Virtual for Employees
companySchema.virtual("employees", {
    ref: "Employee",
    localField: "_id",
    foreignField: "company"
});

// Hash password before saving
companySchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

// Method to verify password
companySchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

export default model("Company", companySchema);
