import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSample() {
  const { data, count, error } = await supabase.from('outstation_traveling').select('*', { count: 'exact' }).limit(3);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total count in Supabase:', count);
    console.log('Sample rows:', JSON.stringify(data, null, 2));
  }
}

checkSample();
