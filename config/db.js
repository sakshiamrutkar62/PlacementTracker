const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,                      // prevent Supabase from dropping idle connections
    keepAliveInitialDelayMillis: 10000
});

// Log pool errors so they don't become unhandledRejections
pool.on('error', (err) => {
    console.error('[DB] Unexpected pool client error:', err.message);
});

module.exports = pool;