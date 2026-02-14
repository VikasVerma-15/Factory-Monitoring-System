const mongoose = require('mongoose');

/**
 * MongoDB Atlas connection
 * Connects directly to MongoDB Atlas without caching
 */
async function connectDB(uri) {
  const mongoUri =
    uri ||
    process.env.MONGODB_URI;

  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return mongoose.connection;
    }

    // Connect to MongoDB Atlas
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('MongoDB Atlas connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected to:', mongoose.connection.host);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;



