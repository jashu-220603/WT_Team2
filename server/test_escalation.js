const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' }); // Adjust path if needed

const PORT = process.env.PORT || 7000;
const URL = `http://localhost:${PORT}`;

// Load models
require('./models/Complaint');
require('./models/User');

const testFlow = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        // 1. Login user
        const loginRes = await axios.post(`${URL}/api/auth/login`, {
            email: 'user1@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log("User logged in");

        // 2. Create a complaint
        const compRes = await axios.post(`${URL}/api/complaints`, 
            { 
                category: "Road & Transport", 
                title: "Test Complaint for Escalation", 
                description: "This is a test",
                address: "Test Location"
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const compId = compRes.data.complaint._id;
        console.log("Created complaint:", compId);

        // 3. Admin login
        const adminLoginRes = await axios.post(`${URL}/api/auth/login`, {
            email: 'adm-001',
            password: 'admin123',
            role: 'admin'
        });
        const adminToken = adminLoginRes.data.token;
        console.log("Admin logged in");

        // 4. Officer login
        const offLoginRes = await axios.post(`${URL}/api/auth/login`, {
            email: 'off-001',
            password: 'officer123',
            role: 'officer'
        });
        const offToken = offLoginRes.data.token;
        console.log("Officer logged in");
        const User = mongoose.model('User');
        const officer = await User.findOne({staffId: 'off-001'});

        // 5. Admin assigns complaint to officer
        await axios.put(`${URL}/api/complaints/${compId}/assign`, 
            { officerId: officer._id.toString() },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log("Complaint assigned to officer");

        // 6. Manipulate older date for complaint to pass the 7 days check
        const Complaint = mongoose.model('Complaint');
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 15); // 15 calendar days ensures at least 7 working days
        await Complaint.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(compId) }, 
            { $set: { createdAt: oldDate } }
        );
        console.log("Manipulated complaint creation date to 15 days ago");

        // 7. Check Eligibility
        const eligRes = await axios.get(`${URL}/api/concerns/eligible/${compId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Eligibility:", eligRes.data);

        // 8. Raise 1st Concern
        const c1Res = await axios.post(`${URL}/api/concerns`, {
            complaintId: compId,
            description: "First concern - Still pending after 10 days"
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`Concern 1 Raised: ${c1Res.data.escalationLevel}`);

        // Manipulate lastConcernDate to allow next concern
        await Complaint.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(compId) }, 
            { $set: { lastConcernDate: oldDate } }
        );
        
        // 9. Raise 2nd Concern
        const c2Res = await axios.post(`${URL}/api/concerns`, {
            complaintId: compId,
            description: "Second concern - No action taken"
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`Concern 2 Raised: ${c2Res.data.escalationLevel}`);

        await Complaint.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(compId) }, 
            { $set: { lastConcernDate: oldDate } }
        );

        // 10. Raise 3rd Concern
        const c3Res = await axios.post(`${URL}/api/concerns`, {
            complaintId: compId,
            description: "Third concern - completely ignored"
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`Concern 3 Raised: ${c3Res.data.escalationLevel}. Legal notice auto-gen: ${c3Res.data.legalNoticeGenerated}`);

        // 11. Officer checks legal notices
        const noticesRes = await axios.get(`${URL}/api/legal-notices/mine`, {
            headers: { Authorization: `Bearer ${offToken}` }
        });
        console.log("Officer Legal Notices Count:", noticesRes.data.notices.length);
        const latestNotice = noticesRes.data.notices[0];
        
        // 12. Officer responds to legal notice
        if (latestNotice) {
            await axios.put(`${URL}/api/legal-notices/${latestNotice._id}/respond`, {
                response: "I apologize for the delay. Looking into this now."
            }, { headers: { Authorization: `Bearer ${offToken}` } });
            console.log("Officer responded to legal notice");
        }

        // 13. Admin views legal notices
        const adminNoticesRes = await axios.get(`${URL}/api/legal-notices/all`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log("Admin Legal Notices Count:", adminNoticesRes.data.length);
        if (adminNoticesRes.data.length > 0) {
            console.log("Latest Notice Status:", adminNoticesRes.data[0].status);
        } else {
            console.warn("WARNING: No legal notices found for admin!");
        }

        console.log("Flow completed successfully.");

        process.exit(0);
    } catch (e) {
        if (e.response) {
            console.error("Test failed with server response:", e.response.status, e.response.data);
        } else {
            console.error("Test failed with message:", e.message);
            if (e.stack) console.error(e.stack);
        }
        process.exit(1);
    }
};

testFlow();
