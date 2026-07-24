import bcrypt from 'bcryptjs';
import pool, { initDB } from '../db.js';

async function main() {
  const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error('Runtime administrator credentials are required');
  await initDB();
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, password, name, role, email_verified)
     VALUES ($1, $2, $3, 'admin', true)
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password, name = EXCLUDED.name,
           role = 'admin', email_verified = true`,
    [email, hash, 'Runtime Administrator']
  );
  await pool.end();
}

main().catch((error) => {
  console.error(`Runtime database initialization failed: ${error.message}`);
  process.exitCode = 1;
});
