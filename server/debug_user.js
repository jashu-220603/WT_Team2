const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const user = await User.findOne({ staffId: 'adm-001' }).select('+password');
    if (user) {
      console.log('User found:', user.email);
      console.log('Role:', user.role);
      console.log('Password exists:', !!user.password);
      console.log('Password length:', user.password ? user.password.length : 0);
    } else {
      console.log('User not found');
    }
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

check();
