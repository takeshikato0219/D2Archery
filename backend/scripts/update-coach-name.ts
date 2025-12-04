// One-time migration script to update coach name from キム・チョンテ to Kim Chung Tae
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateCoachName() {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'd2archery',
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    console.log('Updating coach name...');

    await connection.execute(
      `UPDATE coaches SET name = 'Kim Chung Tae' WHERE name = 'キム・チョンテ'`
    );

    console.log('Coach name updated successfully!');
  } catch (error) {
    console.error('Error updating coach name:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

updateCoachName()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
