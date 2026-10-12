import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').replace(/^["']|["']$/g, '');
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').replace(/^["']|["']$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  const { count } = await supabase.from('data_response').select('*', { count: 'exact', head: true });
  const { data } = await supabase.from('data_response').select('*').order('id', { ascending: false }).limit(3);
  console.log("Total rows in data_response:", count);
  console.log("Latest inserted rows sample:", JSON.stringify(data, null, 2));
}

verify().catch(console.error);
