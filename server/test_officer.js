require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Complaint = require('./models/Complaint');

async function checkValidOfficer() {
    await connectDB();
    const complaints = await Complaint.find({ assignedOfficer: { $exists: true, $ne: null } }).populate('assignedOfficer');
    
    let foundValid = false;
    for (const c of complaints) {
        if (c.assignedOfficer) {
            console.log(`Complaint ${c.complaintId} has valid assignedOfficer: ${c.assignedOfficer.name}`);
            foundValid = true;
        }
    }
    
    if (!foundValid) {
        console.log("No complaints in DB have a VALID mapped assignedOfficer (all references are dangling).");
    }
    process.exit(0);
}

checkValidOfficer();
