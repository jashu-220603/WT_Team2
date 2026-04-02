require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('./models/Department');

const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI).then(async () => {
    const keep = ['Police', 'Water Supply', 'Electricity', 'Sanitation', 'Roads & Transport'];
    const result = await Department.deleteMany({ name: { $nin: keep } });
    console.log('Deleted leftover departments. Count: ', result.deletedCount);
    process.exit(0);
}).catch(console.error);
