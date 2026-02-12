import { Db, MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);
export const MONGODB: Db = client.db();
export default MONGODB;