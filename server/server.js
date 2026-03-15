require("dotenv").config();
const cors = require("cors");
const express = require("express");
const connectDB = require("./config/db");
const path = require("path");

// connect database
connectDB();

const app = express();

// middlewares
app.use(cors({
  origin: ["http://localhost:5500", "http://127.0.0.1:5500", "https://wt-team2.vercel.app"],
  credentials: true
}));

app.use(express.json());

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// health check
app.get('/', (req, res) => res.send('CMS Backend is running...'));

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/legal-notices', require('./routes/legal-notices'));

// error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});