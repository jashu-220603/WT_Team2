const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const createTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Create Admin
    const adminId = 'adm-001';
    let admin = await User.findOne({ staffId: adminId });
    if (!admin) {
      await User.create({
        name: 'Super Admin',
        email: 'admin_test_new@portal.gov',
        password: 'admin123', // Model handles hashing
        role: 'admin',
        staffId: adminId
      });
      console.log('Test Admin created: adm-001 / admin123');
    } else {
        console.log('Admin adm-001 already exists');
    }

    // Create Officer
    const officerId = 'off-001';
    let officer = await User.findOne({ staffId: officerId });
    if (!officer) {
      await User.create({
        name: 'Officer John',
        email: 'officer_test_new@portal.gov',
        password: 'officer123', // Model handles hashing
        role: 'officer',
        staffId: officerId,
        department: 'Cyber Crime'
      });
      console.log('Test Officer created: off-001 / officer123');
    } else {
        console.log('Officer off-001 already exists');
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createTestUsers();
