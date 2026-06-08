import Employee from "../modules/employee/employeeschema.js";
import EmployeeAttr from "../modules/attributes/empattSchema.js";
import Company from "../modules/company/companyschema.js";
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const generatePassword = (length = 8) => {
    return "password123"
};

export const processCreateEmployees = async (employees) => {
    // Find the company first to ensure it exists
    const companyId = employees[0].company;
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found');
    
    const sanitizedCompanyName = company.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const processedEmployees = [];

    // Create unique credentials (email/password) for each new employee
    for (const emp of employees) {
        let email;
        const cleanName = emp.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        email = `${cleanName}@${sanitizedCompanyName}.com`;
        
        const rawPassword = generatePassword(10);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        processedEmployees.push({
            ...emp,
            email,
            password: hashedPassword,
            company: companyId,
            rideStatus: "pending"
        });
    }

    // Bulk insert for better performance
    const empRes =  await Employee.insertMany(processedEmployees);

    return empRes.map(emp => ({
        success: true,
        employee: emp,
        id: emp._id,
        credentials: { email: emp.email } 
    }));
};

const createEmployee = async (req, res) => {
    try {
        const employees = req.body; 

        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({ success: false, message: "Input must be a non-empty array of employees." });
        }

        const results = await processCreateEmployees(employees);

        res.status(201).json({
            success: true,
            count: results.length,
            results
        });

    } catch (error) {
        console.error("Bulk create error:", error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Link attributes (preferences, location) to employees
const createEmployeeAttributes = async (req, res) => {
    try {
        const attributes = req.body;

        if (!Array.isArray(attributes) || attributes.length === 0) {
            return res.status(400).json({ success: false, message: "Input must be a non-empty array of employee attributes." });
        }

        console.log("Creating Employee Attributes:", attributes);

        // 'ordered: false' keeps going even if one insert fails
        const result = await EmployeeAttr.insertMany(attributes, { ordered: false });

        res.status(201).json({
            success: true,
            count: result.length,
            message: "Employee attributes created successfully",
            data: result
        });

    } catch (error) {
        
        console.error("Create Attributes Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create some or all attributes",
            error: error.message
        });
    }
};

// Update existing employee record
const updateEmployee = async (req, res) => {
    try {
        const employeeId = req.params.id;
        const updateData = req.body;
        // hash password if it's being updated
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }
        const updatedEmployee = await Employee.findByIdAndUpdate(employeeId, updateData, { new: true });

        if (!updatedEmployee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        res.json({ success: true, employee: updatedEmployee });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating employee", error });
    }
}


// Public profile fetch
const getEmployeeProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findById(id).select('-password').populate('company', 'name');
        
        if (!employee) {
            console.log("No employee found with that ID");
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const attributes = await EmployeeAttr.findOne({ employee: id });

        res.json({
            success: true,
            employee,
            preferences: attributes || null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching profile", error: error.message });
    }
};


// Fetch ride stats for the dashboard
const getEmployeeRideDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        const employee = await Employee.findById(id).select('-password');

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const attributes = await EmployeeAttr.findOne({ employee: id })
            .populate({
                path: 'fleet',
                select: 'fleetId destination weekdays'
            })
            .populate('assignedVehicle');

        res.json({
            success: true,
            rideStatus: employee.rideStatus,
            vehicle: attributes?.assignedVehicle || null,
            schedule: attributes ? {
                pickupTime: attributes.timeWindow?.startTime,
                dropTime: attributes.timeWindow?.endTime,
                pickupLocation: attributes.pickupLocation,
                days: attributes.fleet?.weekdays
            } : null,
            fleetInfo: attributes?.fleet || null
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching ride details", error: error.message });
    }
};

// List all fleets this employee belongs to
const getEmployeeFleets = async (req, res) => {
    try {
        const { id } = req.params;
        // Find all attribute records for this employee, suggesting all fleets they are part of
        const attributes = await EmployeeAttr.find({ employee: id })
            .populate('fleet')
            .populate('assignedVehicle')
            .sort({ createdAt: -1 });

        const assignments = attributes.map(attr => ({
            fleet: attr.fleet,
            preferences: {
                pickupLocation: attr.pickupLocation,
                timeWindow: attr.timeWindow,
                priority: attr.priority,
                vehiclePreference: attr.vehiclePreference
            },
            assignedVehicle: attr.assignedVehicle || null 
        }));

        res.json({
            success: true,
            count: assignments.length,
            assignments
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching employee fleets", error: error.message });
    }
};

// get employee fleets filtered by day(s)
const getEmployeeFleetsByDay = async (req, res) => {
    try {
        const { id } = req.params;
        const { days } = req.query; // e.g., "Mon,Tue"

        let matchQuery = {};
        if (days) {
            const daysList = days.split(',').map(d => d.trim());
            matchQuery = { weekdays: { $in: daysList } };
        }

        const attributes = await EmployeeAttr.find({ employee: id })
            .populate({
                path: 'fleet',
                match: matchQuery
            })
            .populate('assignedVehicle')
            .sort({ createdAt: -1 });

        // Filter out where fleet is null (didn't match the populate query)
        const validAttributes = attributes.filter(attr => attr.fleet !== null);

        const assignments = validAttributes.map(attr => ({
            fleet: attr.fleet,
            preferences: {
                pickupLocation: attr.pickupLocation,
                timeWindow: attr.timeWindow,
                priority: attr.priority,
                vehiclePreference: attr.vehiclePreference
            },
            assignedVehicle: attr.assignedVehicle || null 
        }));

        res.json({
            success: true,
            count: assignments.length,
            assignments
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching employee fleets by day", error: error.message });
    }
};

export { createEmployee, updateEmployee, createEmployeeAttributes, getEmployeeProfile, getEmployeeRideDetails, getEmployeeFleets, getEmployeeFleetsByDay };