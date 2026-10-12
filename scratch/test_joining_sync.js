import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key && !key.startsWith('#')) {
      env[key] = val;
    }
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  const { data: dbRows, error: dbErr } = await supabase.from('joining_fms').select('*').limit(3);
  if (dbErr) {
    console.error('Error fetching joining_fms:', dbErr);
    return;
  }
  console.log('Sample row from Supabase joining_fms:');
  console.log(dbRows[0]);
  console.log('Total columns in joining_fms:', Object.keys(dbRows[0] || {}).length);
  console.log('Column names in joining_fms:', Object.keys(dbRows[0] || {}));
  
  const { count } = await supabase.from('joining_fms').select('*', { count: 'exact', head: true });
  console.log('Total existing rows in joining_fms:', count);
}

inspect();
