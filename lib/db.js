import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

export async function getDb() {
  if (cachedDb) return cachedDb;
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGO_URL);
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(process.env.DB_NAME || 'afinityos');
  await cachedDb.collection('users').createIndex({ email: 1 }, { unique: true });
  await cachedDb.collection('refresh_tokens').createIndex({ token: 1 }, { unique: true });
  await cachedDb.collection('refresh_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await cachedDb.collection('organizations').createIndex({ id: 1 }, { unique: true });
  await cachedDb.collection('org_invites').createIndex({ token: 1 }, { unique: true });
  await cachedDb.collection('customers').createIndex({ organizationId: 1, email: 1 });
  await cachedDb.collection('customer_timeline').createIndex({ organizationId: 1, customerId: 1, occurredAt: -1 });
  await cachedDb.collection('events').createIndex({ organizationId: 1, timestamp: -1 });
  await cachedDb.collection('events').createIndex({ type: 1, timestamp: -1 });
  await cachedDb.collection('api_logs').createIndex({ organizationId: 1, timestamp: -1 });
  await cachedDb.collection('module_installations').createIndex({ organizationId: 1, moduleId: 1 }, { unique: true });
  await cachedDb.collection('event_listener_log').createIndex({ organizationId: 1, timestamp: -1 });
  return cachedDb;
}

export function clean(o) { if (!o) return o; const { _id, ...rest } = o; return rest; }
