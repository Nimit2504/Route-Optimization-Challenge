import {Schema, model} from 'mongoose';

const vehicleschema = new Schema({
    vehicleId :{
        type : String,
        required : true,
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
    availabilityStatus: {
        type: String,
        enum: ["available", "assigned", "maintenance"],
        default: "available"
    },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "electric"],
      required: true
    },

    vehicleMode: {
      type: String,
      enum: ["2-wheeler", "4-wheeler", "van"],
      required: true
    },

    seatingCapacity: {
      type: Number,
      required: true
    },

    vehicleType : {
      type: String,
      enum: ["premium", "normal"],
      required: true
    },

    costPerKm: {
      type: Number,
      required: true
    },

    performance: {
      averageMileage: Number,
      averageSpeed: Number,
      vehicleAge: Number
    },

    currentLocation: {
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

    availableFrom: {
      type: Date,
      required: true
    },
}, { timestamps: true });

export default model("Vehicle", vehicleschema);
