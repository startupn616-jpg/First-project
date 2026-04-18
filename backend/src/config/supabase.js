const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const testConnection = async () => {
  const { error } = await supabase.from('districts').select('id').limit(1);
  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
  } else {
    console.log('✅ Supabase connected successfully (HTTPS)');
  }
};

testConnection();

module.exports = supabase;
