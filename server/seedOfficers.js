const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cms"; 

async function seedOfficers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Note: Make sure departments are seeded first!
        const departments = await Department.find();
        if (departments.length === 0) {
            console.warn('No departments found. Please run seedDepartments.js first.');
            process.exit(1);
        }

        let count = 1;
        for (const dept of departments) {
            // Check if there's already an officer for this department
            const existingOfficer = await User.findOne({ role: 'officer', department: dept.name });
            if (existingOfficer) {
                console.log(`Skipped: Officer already exists for ${dept.name}`);
                continue;
            }

            // Create an officer
            const formattedId = `off-${String(count).padStart(3, '0')}`;
            const newOfficer = await User.create({
                name: `${dept.name} Officer`,
                email: `officer_${dept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@system.com`,
                password: 'password123',
                role: 'officer',
                department: dept.name,
                staffId: formattedId,
                officerLevel: 'Ground'
            });

            console.log(`Created Officer: ${formattedId} for ${dept.name}`);
            count++;
        }

        console.log('Officer seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('Officer Seeding Failed:', err);
        process.exit(1);
    }
}

seedOfficers();
