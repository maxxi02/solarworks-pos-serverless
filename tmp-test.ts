import { MongoClient } from "mongodb";

// Your current SRV URI
const srvUri = "mongodb+srv://admin1:VxZ8mzulB9tQblgC@solarworksdb.vku9eef.mongodb.net/solarworks?retryWrites=true&w=majority";

// The long-form URI based on nslookup results
const longUri = "mongodb://admin1:VxZ8mzulB9tQblgC@ac-z7w3lto-shard-00-00.vku9eef.mongodb.net:27017,ac-z7w3lto-shard-00-01.vku9eef.mongodb.net:27017,ac-z7w3lto-shard-00-02.vku9eef.mongodb.net:27017/solarworks?ssl=true&replicaSet=atlas-z7w3lto-shard-0&authSource=admin&retryWrites=true&w=majority";

async function test(uri: string, name: string) {
    console.log(`Testing ${name}...`);
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
        await client.connect();
        const db = client.db();
        const result = await db.command({ ping: 1 });
        console.log(`✅ ${name} success!`, result);
        return true;
    } catch (err: any) {
        console.error(`❌ ${name} failed:`, err.message);
        return false;
    } finally {
        await client.close();
    }
}

async function run() {
    const srvOk = await test(srvUri, "SRV URI");
    const longOk = await test(longUri, "Long URI");

    if (!srvOk && longOk) {
        console.log("\nTIP: Use the Long URI in your .env file to bypass SRV lookup issues.");
    }
}

run().catch(console.error);
