// Same MongoDB cluster/database the inventory app uses (see its .env) - the
// Hub only ever touches the shared `employees` collection here, purely to
// verify a login and know who's signed in. No other app's business data is
// read or written from this connection.
import { MongoClient } from 'mongodb'
import dns from 'dns'

// Some ISPs/routers/VPNs (and some sandboxed/container networks) block or
// fail to resolve the SRV DNS record that mongodb+srv:// needs, even though
// ordinary DNS lookups work fine. Pointing Node's own resolver at public DNS
// servers works around this in most cases. Only affects this process's own
// lookups, not the OS. Mirrors the same workaround in the inventory app's
// db.js, which hits the same class of environments.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (err) {
  console.warn('Could not override DNS servers, continuing with system defaults:', err.message)
}

const MONGO_URI = process.env.MONGO_URI
const DB_NAME = process.env.MONGO_DB_NAME || 'inventory'

let client
let db

export async function connectToDatabase() {
  if (db) return db
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.')
  }
  client = new MongoClient(MONGO_URI)
  await client.connect()
  db = client.db(DB_NAME)
  return db
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected yet - call connectToDatabase() before using getDb().')
  }
  return db
}

export { DB_NAME }
