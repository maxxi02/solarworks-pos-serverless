const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log("Fetching one session...");
  const session = await db.collection('session').findOne({});
  if (!session) {
    console.log("No sessions found in DB");
  } else {
    console.log("Found session in DB:");
    console.log(session);
    console.log("-- Token string length:", session.token.length);
  }

  await client.close();
}

run().catch(console.error);
