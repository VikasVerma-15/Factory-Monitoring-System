const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 
  'mongodb+srv://vikasverma152001:vikas123@cluster0.gqslnz2.mongodb.net/factory_monitor?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    console.log('Connection string:', mongoUri.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    
    // Test creating a simple document
    const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
    const testDoc = new TestModel({ name: 'test' });
    await testDoc.save();
    console.log('✅ Successfully saved test document');
    
    await TestModel.deleteOne({ name: 'test' });
    console.log('✅ Successfully deleted test document');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testConnection();

