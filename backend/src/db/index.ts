import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });

export * from './schema.js';
