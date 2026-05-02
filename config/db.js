// config/db.js
// ─────────────────────────────────────────────
// This file handles ONE job only:
// Connect our Express app to the MongoDB database.
//
// We separate this from server.js so our code stays
// clean and easy to maintain.
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // mongoose.connect() returns a promise, so we await it
    // process.env.MONGO_URI reads from your .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // If connection succeeds, log the host name
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {
    // If connection fails, log the error and EXIT the app
    // There's no point running a server with no database
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // 1 means "exit with failure"
  }
};

// Export so server.js can call it
module.exports = connectDB;