/**
 * Supabase Configuration
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

const supabase = createClient(
  config.supabase.url,
  config.supabase.key,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact' }).limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

module.exports = {
  supabase,
  testConnection
};
