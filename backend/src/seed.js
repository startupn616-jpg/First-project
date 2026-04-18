require('dotenv').config();
const bcrypt    = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const users = [
  { username: 'admin',    password: 'Admin@123',   fullName: 'System Administrator',        role: 'admin'   },
  { username: 'officer1', password: 'Officer@123', fullName: 'Field Officer Rajan Kumar',   role: 'officer' },
  { username: 'officer2', password: 'Officer@123', fullName: 'Field Officer Priya Devi',    role: 'officer' },
];

async function seedUsers() {
  console.log('🌱 Seeding users via Supabase HTTPS...\n');

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const { error } = await sb.from('users').upsert(
      { username: u.username, password_hash: hash, full_name: u.fullName, role: u.role },
      { onConflict: 'username' }
    );
    if (error) {
      console.error(`❌ ${u.username}:`, error.message);
    } else {
      console.log(`✅ ${u.username} (${u.role}) | ${u.password}`);
    }
  }

  console.log('\n📋 Login credentials:');
  console.log('  admin    | Admin@123');
  console.log('  officer1 | Officer@123\n');
}

seedUsers().catch((e) => { console.error(e.message); process.exit(1); });
