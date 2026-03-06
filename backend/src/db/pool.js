const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     process.env.DB_PORT     || 5432,
        database: process.env.DB_NAME     || 'nktctf',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || 'Salmafall',
      }
);

// Test connexion au démarrage
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message, err.stack);
  } else {
    console.log('✅ DB connected:', res.rows[0].now);
  }
});

module.exports = pool;