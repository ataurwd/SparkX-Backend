import mongoose from 'mongoose';
import dns from 'dns';

// Fix Node.js Windows c-ares SRV lookup issue for MongoDB Atlas (ONLY on Windows)
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {
    // Ignore if permissions or platform restricts custom DNS
  }
}

export const TARGET_DB_NAME = 'sparkx_db';

/**
 * Ensures the MongoDB connection string explicitly specifies sparkx_db
 * and passes dbName: 'sparkx_db' in options so it NEVER falls back to default/test database.
 */
export function formatMongoUri(rawUri: string): string {
  let uri = rawUri.trim();

  // If URI is mongodb+srv or standard mongodb without a db name before query parameters
  if (uri.includes('.mongodb.net/?') || uri.includes('.mongodb.net/')) {
    const [base, query] = uri.split('.mongodb.net/');
    const queryPart = query ? (query.startsWith('?') ? query : query.includes('?') ? '?' + query.split('?')[1] : '') : '';
    uri = `${base}.mongodb.net/${TARGET_DB_NAME}${queryPart}`;
  } else if (!uri.includes(`/${TARGET_DB_NAME}`)) {
    // If standard URI like mongodb://localhost:27017
    if (uri.includes('?')) {
      const [base, query] = uri.split('?');
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
      uri = `${cleanBase}/${TARGET_DB_NAME}?${query}`;
    } else {
      const cleanBase = uri.endsWith('/') ? uri.slice(0, -1) : uri;
      uri = `${cleanBase}/${TARGET_DB_NAME}`;
    }
  }

  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseConnection: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseConnection || { conn: null, promise: null };
if (!global.mongooseConnection) {
  global.mongooseConnection = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  // If connection is already open and ready, reuse it immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    const errMessage = '[Database Error] MONGODB_URI is not defined! Please set MONGODB_URI in your Vercel Dashboard (Project Settings -> Environment Variables).';
    console.error(errMessage);
    throw new Error(errMessage);
  }

  const uri = formatMongoUri(rawUri);

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      dbName: TARGET_DB_NAME,
      autoIndex: process.env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 8000, // Fail fast if unreachable (e.g. Atlas IP whitelist missing)
      bufferCommands: false // Do not hang for 10000ms if connection is not ready
    };

    console.log(`[Database] Connecting to MongoDB Atlas (${TARGET_DB_NAME})...`);
    cached.promise = mongoose.connect(uri, opts).then((m) => {
      const activeDbName = m.connection.name;
      console.log(`[Database] Successfully connected to MongoDB Atlas! Active DB: "${activeDbName}"`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error: any) {
    cached.promise = null; // Clear so subsequent requests can retry
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
}

