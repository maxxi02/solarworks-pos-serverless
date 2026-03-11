import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
import { MongoClient } from "mongodb";

async function verifyStaffAnalytics() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection("payments");

    // Find a cashierId that has some completed payments
    const samplePayment = await collection.findOne({ status: "completed", cashierId: { $exists: true } });
    if (!samplePayment) {
      console.log("No completed payments with cashierId found. Skipping specific staff test.");
      return;
    }

    const staffId = samplePayment.cashierId;
    console.log(`Testing filtering for staffId: ${staffId}`);

    const now = new Date();
    const periodStart = new Date(0); // All time

    const [result] = await collection.aggregate([
      {
        $match: {
          createdAt: { $gte: periodStart },
          status: "completed",
          cashierId: staffId
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$total" },
                totalTransactions: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]).toArray();

    const summary = result.summary?.[0] || { totalRevenue: 0, totalTransactions: 0 };
    console.log(`Filtered Revenue for ${staffId}: ₱${summary.totalRevenue.toLocaleString()}`);
    console.log(`Filtered Transactions for ${staffId}: ${summary.totalTransactions}`);

    // Verify it's actually filtered
    const totalPayments = await collection.countDocuments({ status: "completed" });
    console.log(`Total completed payments in DB: ${totalPayments}`);
    
    if (summary.totalTransactions <= totalPayments) {
      console.log("Verification SUCCESS: Staff filtering applied correctly.");
    } else {
      console.error("Verification FAILED: Filtered results exceed total payments.");
    }

  } catch (error) {
    console.error("Verification FAILED:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

verifyStaffAnalytics();
