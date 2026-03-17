const mongoose = require('mongoose');
const Department = require('./models/Department');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/cms_portal';

const defaults = [
    { name: "Police", icon: "bi-shield-shaded", description: "Public safety and law enforcement." },
    { name: "Water Supply", icon: "bi-droplet-fill", description: "Water distribution and maintenance." },
    { name: "Electricity", icon: "bi-lightning-charge-fill", description: "Power supply and electrical grid management." },
    { name: "Sanitation", icon: "bi-trash3-fill", description: "Waste management and cleanliness." },
    { name: "Roads & Transport", icon: "bi-hammer", description: "Infrastructure and public transportation." }
];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const dept of defaults) {
            const existing = await Department.findOne({ name: dept.name });
            if (!existing) {
                await Department.create(dept);
                console.log(`Created: ${dept.name}`);
            } else {
                console.log(`Skipped: ${dept.name} (exists)`);
            }
        }
        
        console.log('Seeding complete');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
