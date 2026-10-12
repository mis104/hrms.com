import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('joining_fms').insert([{ employee_code: 'TEST/01', candidate_name: 'Test Candidate' }]).select();
  console.log("Insert result:", { data, error });
  if (data && data[0]) {
    console.log("ALL COLUMNS:", Object.keys(data[0]));
    await supabase.from('joining_fms').delete().eq('employee_code', 'TEST/01');
  }
}

check();
