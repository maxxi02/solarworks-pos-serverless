import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
import { MongoClient } from "mongodb";

async function checkFields() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const payment = await db.collection("payments").findOne({ 
      $or: [
        { cashierId: { $exists: true } }, 
        { staffId: { $exists: true } }, 
        { cashier: { $exists: true } },
        { cashierName: { $exists: true } }
      ] 
    });
    console.log("Sample Identifying Payment Document:");
    console.log(JSON.stringify(payment, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkFields();
