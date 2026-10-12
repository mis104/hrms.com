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

async function testAll() {
  console.log("--- Testing AssetAssignment ---");
  const q1 = "id, employee_code, candidate_name, finalized_salary, indent_no, designation, lookup_designation, joining_place, mobile_no, personal_email_id, laptop_brand_model, mobile_brand_sim, gmail_id, assets, stage5_planned, stage5_actual, stage5_status";
  const r1 = await supabase.from("joining_fms").select(q1).limit(5);
  console.log("AssetAssignment result:", r1.error ? r1.error.message : `OK (${r1.data.length})`);

  console.log("--- Testing JoiningLetterRelease ---");
  const q2 = "id, employee_code, candidate_name, finalized_salary, indent_no, designation, lookup_designation, joining_place, mobile_no, personal_email_id, letter_attachment, stage2_planned, stage2_actual, stage2_status, stage2_time_delay";
  const r2 = await supabase.from("joining_fms").select(q2).limit(5);
  console.log("JoiningLetterRelease result:", r2.error ? r2.error.message : `OK (${r2.data.length})`);

  console.log("--- Testing CheckSalarySlipAndResume ---");
  const q3 = "id, employee_code, candidate_name, finalized_salary, indent_no, designation, lookup_designation, joining_place, mobile_no, personal_email_id, stage1_planned, stage1_actual, stage1_status, stage1_time_delay, update_link";
  const r3 = await supabase.from("joining_fms").select(q3).limit(5);
  console.log("CheckSalarySlipAndResume result:", r3.error ? r3.error.message : `OK (${r3.data.length})`);

  console.log("--- Testing InductionTraining ---");
  const q4 = "id, employee_code, candidate_name, finalized_salary, indent_no, designation, lookup_designation, joining_place, mobile_no, personal_email_id, checklist, stage3_planned, stage3_actual, stage3_status, stage3_time_delay";
  const r4 = await supabase.from("joining_fms").select(q4).limit(5);
  console.log("InductionTraining result:", r4.error ? r4.error.message : `OK (${r4.data.length})`);
}

testAll().catch(console.error);
