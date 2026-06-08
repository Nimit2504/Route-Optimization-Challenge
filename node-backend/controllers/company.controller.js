import Company from "../modules/company/companyschema.js";
import Fleet from "../modules/fleet/fleetschema.js";
import Employee from "../modules/employee/employeeschema.js";
import Vehicle from "../modules/vehicle/vehicleschema.js";
import bcrypt from 'bcrypt';


const generatePassword = (length = 8) => {
    return "password123";
};

const createCompany = async (req, res) => {
    try {
        const { name, email, googleId } = req.body;
        
        // Assign temporary password
        const password = generatePassword(10);

        const company = await Company.create({
            name,
            email,
            password,
            googleId,
        });

        
        res.status(201).json({
            success: true,
            company,
            credentials: {
                email,
                password
            },
            id : company._id
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// Modify company profile
const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        }

        const company = await Company.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        res.json({
            success: true,
            company
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Aggregated stats for the main dashboard
const getCompanyDashboard = async (req, res) => {
    try {
        const { id } = req.params;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        const [fleetCount, employeeCount, vehicleCount] = await Promise.all([
            Fleet.countDocuments({ company: id }),
            Employee.countDocuments({ company: id }),
            Vehicle.countDocuments({ company: id })
        ]);

        const recentFleets = await Fleet.find({ company: id }).sort({ createdAt: -1 }).limit(5);

        res.json({
            success: true,
            data: {
                company: {
                    name: company.name,
                    email: company.email,
                    id: company._id
                },
                stats: {
                    totalFleets: fleetCount,
                    totalEmployees: employeeCount,
                    totalVehicles: vehicleCount
                },
                recentFleets
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// List fleets with pagination
const getCompanyFleets = async (req, res) => {
    try {
        // Handle page/limit for large lists
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const fleets = await Fleet.find({ company: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Fleet.countDocuments({ company: id });
        
        res.json({
            success: true,
            count: fleets.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            fleets
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// List employees with pagination
const getCompanyEmployees = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const employees = await Employee.find({ company: id })
            .select('-password') // Exclude password
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Employee.countDocuments({ company: id });

        res.json({
            success: true,
            count: employees.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            employees
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// List vehicles with pagination
const getCompanyVehicles = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const vehicles = await Vehicle.find({ company: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Vehicle.countDocuments({ company: id });

        res.json({
            success: true,
            count: vehicles.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            vehicles
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { createCompany, updateCompany, getCompanyDashboard, getCompanyFleets, getCompanyEmployees, getCompanyVehicles };
