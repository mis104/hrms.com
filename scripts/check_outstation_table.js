import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from('outstation_traveling').select('*').limit(1);
  if (error) {
    console.error('Check error:', error.message);
  } else {
    console.log('Success! Table outstation_traveling found, row count:', data.length);
  }
}

checkTable();
