import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').replace(/^["']|["']$/g, '');
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').replace(/^["']|["']$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('joining_fms').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Columns in joining_fms:", Object.keys(data[0]));
  }
}

check().catch(console.error);
