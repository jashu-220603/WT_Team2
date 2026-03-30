const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

// Try with current dir .env or root .env
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nivaran_setu';

const seedDeptHead = async () => {
    try {
        console.log('Connecting to MONGO_URI:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'head@police.gov';
        const existing = await User.findOne({ email });
        
        if (existing) {
            console.log('User already exists, updating to dept-head...');
            existing.role = 'dept-head';
            existing.department = 'Police';
            await existing.save();
            console.log('Updated user:', existing.email);
        } else {
            const head = new User({
                name: 'Police Department Head',
                email: email,
                password: 'password123',
                role: 'dept-head',
                department: 'Police',
                staffId: 'head-001'
            });
            await head.save();
            console.log('Department Head created: head@police.gov / password123');
        }

        mongoose.connection.close();
        console.log('Done.');
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
};

seedDeptHead();
