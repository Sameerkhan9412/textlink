// Starts a throwaway in-memory MongoDB for local development / e2e runs (no Atlas needed).
// Usage: node scripts/dev-db.mjs   -> prints MONGODB_URI, keeps running until Ctrl+C
import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.env.DEV_DB_PORT ?? 27555);
const mongod = await MongoMemoryServer.create({ instance: { port } });
console.log(`MONGODB_URI=${mongod.getUri("textlink")}`);
const stop = async () => { await mongod.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
