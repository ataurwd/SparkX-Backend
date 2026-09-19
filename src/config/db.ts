import mongoose from 'mongoose';
import dns from 'dns';

// Fix Node.js Windows c-ares SRV lookup issue for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if permissions or platform restricts custom DNS
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

export async function connectDB(): Promise<void> {
  const rawUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sparkx_db';
  const uri = formatMongoUri(rawUri);

  try {
    // Setting dbName explicitly forces Mongoose to use 'sparkx_db'
    await mongoose.connect(uri, {
      dbName: TARGET_DB_NAME,
      autoIndex: true,
      serverSelectionTimeoutMS: 10000
    });

    const activeDbName = mongoose.connection.name;
    console.log(`[Database] Successfully connected to MongoDB Atlas!`);
    console.log(`[Database] Active Database: "${activeDbName}" (Verified target: ${TARGET_DB_NAME})`);

    if (activeDbName !== TARGET_DB_NAME) {
      console.error(`[Database Critical Error] Connected to '${activeDbName}' instead of '${TARGET_DB_NAME}'. Forcing useDb('${TARGET_DB_NAME}')...`);
      mongoose.connection.useDb(TARGET_DB_NAME);
    }
  } catch (error: any) {
    console.warn(`[Database] Connection notice: ${error.message}. Target database is '${TARGET_DB_NAME}'.`);
  }
}
