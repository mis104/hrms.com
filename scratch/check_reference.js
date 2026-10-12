import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { count, error } = await supabase.from('reference').select('*', { count: 'exact', head: true });
  const { data: samples } = await supabase.from('reference').select('*').limit(3);
  console.log('Total references in Supabase:', count, 'Samples:', samples, 'Error:', error);
}

check();
