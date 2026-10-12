import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').trim();
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const candidateTables = [
    'employees', 'leave_requests', 'master_dropdowns', 'data_response',
    'candidate_selection', 'joining_fms', 'fms', 'users', 'indents',
    'candidates', 'joining_records', 'joining_letter_releases', 'leavings',
    'assets', 'company_calendar', 'inventory', 'vendors', 'videos',
    'payroll', 'social_site', 'mis_report', 'gate_pass', 'hr_leads',
    'outstation_attendance', 'outstation_master', 'outstation_advance',
    'attendances', 'attendance_daily', 'enquiry', 'daily_attendance',
    'advances', 'advance_requests', 'asset_assignments', 'call_tracker',
    'interview_selection', 'feeds', 'gatepass', 'gatepass_requests',
    'inventory_items', 'master', 'candidate_shortlisted', 'induction_training',
    'interviews', 'job_agencies', 'online_postings', 'travel_records', 'tada_records'
  ];

  const results = {};
  const errors = {};
  for (const t of candidateTables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        errors[t] = error.message;
      } else {
        results[t] = count;
      }
    } catch (e) {
      errors[t] = e.message;
    }
  }
  console.log('=== EXISTING SUPABASE TABLES (WITH ROW COUNT) ===');
  console.log(JSON.stringify(results, null, 2));

  console.log('=== TABLES NOT FOUND / ERROR ===');
  console.log(JSON.stringify(errors, null, 2));
}

checkTables();
