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

async function test() {
  const queryStr = "id, employee_code, candidate_name, finalized_salary, indent_no, designation, lookup_designation, joining_place, mobile_no, personal_email_id, laptop_brand_model, mobile_brand_sim, gmail_id, assets, stage5_planned, stage5_actual, stage5_status, stage5_time_delay";
  const { data, error } = await supabase.from("joining_fms").select(queryStr).order("id", { ascending: false });
  if (error) {
    console.error("Test error:", error);
  } else {
    console.log("Success! Total rows:", data.length);
  }
}

test().catch(console.error);
