/**
 * Test MongoDB connection with authSource parameter
 */
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://crm:password@localhost:27017/clientforge?authSource=admin';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('URI:', uri.replace(/:[^:@]+@/, ':****@')); // Hide password

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ MongoDB connected successfully!');

    // Test ping command
    await client.db('admin').command({ ping: 1 });
    console.log('✅ MongoDB ping successful!');

    // List databases
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    console.log('✅ Available databases:', dbs.databases.map(db => db.name).join(', '));

    // Test write to clientforge database
    const db = client.db('clientforge');
    const testCollection = db.collection('connection_test');

    const testDoc = {
      test: 'MongoDB connection test',
      timestamp: new Date(),
      authSource: 'admin'
    };

    const result = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted with ID:', result.insertedId);

    // Cleanup test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Test document cleaned up');

    console.log('\n🎉 All MongoDB tests passed!');

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (error.code === 18) {
      console.error('   Authentication failed - check credentials and authSource parameter');
    }
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

testConnection();
