const dotenv = require('dotenv');

const app = require('./app');
const connectDB = require('./db');

dotenv.config();

async function start() {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('MongoDB connected successfully');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

