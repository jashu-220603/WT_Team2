const mongoose = require("mongoose");

const connectDB = async () => {

  try {

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {

    console.error("Database connection failed:");
    console.error(error.message);
    console.error("Continuing without database connection; API endpoints will not work until the database is available.");

    // Note: we avoid exiting here so that static/frontend functionality can still run
    // even when the database is unreachable (e.g., on machines without MongoDB).

  }

};

module.exports = connectDB;