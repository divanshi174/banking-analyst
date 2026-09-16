import Database from "better-sqlite3";
import path from "node:path";

const databasePath = path.resolve(process.cwd(), "banking.db");

export const db: InstanceType<typeof Database> = new Database(databasePath);

db.pragma("foreign_keys = ON");

export default db;