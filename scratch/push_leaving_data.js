import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://nmfnppmhguvcmaagqgzp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZm5wcG1oZ3V2Y21hYWdxZ3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNTIwOTcsImV4cCI6MjEwNjkyODA5N30.dQPM3gdU-eO_GDBB1oDhWEfcHMCN3dfQwsC5IRzge7Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

async function checkAndPush() {
  console.log("Checking if table leaving_fms exists...");
  const testRes = await supabase.from('leaving_fms').select('id').limit(1);
  if (testRes.error) {
    console.error("Table check error:", testRes.error.message);
    if (testRes.error.message.includes('relation "public.leaving_fms" does not exist')) {
      console.log("TABLE_NOT_EXIST");
      return;
    }
  } else {
    console.log("Table leaving_fms exists!");
  }

  const csvPath = 'D:\\HRMS-PIRAMAL - SUPABASE\\HR_Piramal\\HR EMPLOYEE EXIT FMS - FMS.csv';
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

  // Headers are on line index 5 (0-based)
  // Data starts on line index 7 (0-based)
  const dataRows = [];
  for (let i = 7; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    // check if valid row
    const employeeId = cols[5] || '';
    const candidateName = cols[10] || '';
    if (!employeeId && !candidateName) continue;

    const row = {
      employee_id: employeeId,
      timestamp: cols[6] || '',
      last_working_day: cols[7] || '',
      reason_for_resignation: cols[8] || '',
      salary: cols[9] || '',
      candidate_name: candidateName,
      designation: cols[11] || '',
      mobile_no: cols[12] || '',
      family_mobile_no: cols[13] || '',
      relationship_with_family_person: cols[14] || '',
      past_pf_id_no: cols[15] || '',
      current_bank_ac_no: cols[16] || '',
      ifsc_code: cols[17] || '',
      branch_name: cols[18] || '',
      photo_of_front_bank_passbook: cols[19] || '',
      personal_email_id: cols[20] || '',
      esic_no: cols[21] || '',
      highest_qualification: cols[22] || '',
      aadhar_card_no: cols[23] || '',
      qualification_photo: cols[24] || '',
      salary_slip: cols[25] || '',
      resume_cv_upload: cols[26] || '',
      ex1_planned: cols[27] || '',
      ex1_actual: cols[28] || '',
      ex1_status: cols[29] || 'Pending',
      ex1_time_delay: cols[30] || '',
      ex2_planned: cols[31] || '',
      ex2_actual: cols[32] || '',
      ex2_status: cols[33] || 'Pending',
      ex2_time_delay: cols[34] || '',
      ex3_planned: cols[35] || '',
      ex3_actual: cols[36] || '',
      ex3_status: cols[37] || 'Pending',
      ex3_exit_checklist: cols[38] || '',
      ex3_time_delay: cols[39] || '',
      ex4_planned: cols[40] || '',
      ex4_actual: cols[41] || '',
      ex4_status: cols[42] || 'Pending',
      ex4_time_delay: cols[43] || '',
      leaving: cols[44] || '',
      exit_checklist: cols[45] || '',
    };
    dataRows.push(row);
  }

  console.log(`Parsed ${dataRows.length} rows to insert.`);

  // Insert in chunks of 10
  for (let i = 0; i < dataRows.length; i += 10) {
    const chunk = dataRows.slice(i, i + 10);
    const { data, error } = await supabase.from('leaving_fms').insert(chunk).select();
    if (error) {
      console.error(`Error inserting chunk ${i}:`, error.message);
    } else {
      console.log(`Inserted chunk ${i} - ${i + chunk.length}`);
    }
  }

  const countRes = await supabase.from('leaving_fms').select('*', { count: 'exact', head: true });
  console.log(`Total count in leaving_fms: ${countRes.count}`);
}

checkAndPush().catch(console.error);
