const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync('migrations/open_source_module_migration.sql', 'utf8');
  await client.query(sql);
  console.log('Migration successful');
  await client.end();
}

run().catch(console.error);
