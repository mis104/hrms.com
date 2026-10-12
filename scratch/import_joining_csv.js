import fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const xlsx = XLSX.default || XLSX;

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

const csvPath = '_HR-JOINING FMS NEW - JOINING_FMS (2).csv';

async function syncToSupabase() {
  const fileBuf = fs.readFileSync(csvPath);
  const workbook = xlsx.read(fileBuf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const dataRows = rawRows.slice(7).filter(r => r && r.some(c => c && c.toString().trim() !== ''));
  console.log(`Data rows found in CSV: ${dataRows.length}`);

  const parsedRecords = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];

    // Check if indent_no or lookup_designation can be extracted from r[5] (ID like IN-68_Cook For Plant) if r[65] is empty
    let indentNo = (r[65] || '').toString().trim();
    let lookupDesig = (r[66] || '').toString().trim();
    const customId = (r[5] || '').toString().trim();

    if ((!indentNo || !lookupDesig) && customId.includes('_')) {
      const parts = customId.split('_');
      if (!indentNo) indentNo = parts[0];
      if (!lookupDesig) lookupDesig = parts.slice(1).join('_');
    }

    const rec = {
      employee_code: (r[4] || '').toString().trim(),
      candidate_name: (r[6] || '').toString().trim(),
      finalized_salary: (r[7] || '').toString().trim(),
      update_link: (r[8] || '').toString().trim(),
      timestamp: (r[9] || '').toString().trim(),
      name_as_per_aadhar: (r[10] || '').toString().trim(),
      father_name: (r[11] || '').toString().trim(),
      date_of_joining: (r[12] || '').toString().trim(),
      joining_place: (r[13] || '').toString().trim(),
      designation: (r[14] || lookupDesig || '').toString().trim(),
      salary: (r[15] || r[7] || '').toString().trim(),
      aadhar_frontside_photo: (r[16] || '').toString().trim(),
      pan_card: (r[17] || '').toString().trim(),
      candidate_photo: (r[18] || '').toString().trim(),
      current_address: (r[19] || '').toString().trim(),
      address_as_per_aadhar_card: (r[20] || '').toString().trim(),
      dob_as_per_aadhar: (r[21] || '').toString().trim(),
      gender: (r[22] || '').toString().trim(),
      mobile_no: (r[23] || '').toString().trim(),
      family_mobile_no: (r[24] || '').toString().trim(),
      relationship_with_family_person: (r[25] || '').toString().trim(),
      past_pf_id_no: (r[26] || '').toString().trim(),
      current_bank_ac_no: (r[27] || '').toString().trim(),
      ifsc_code: (r[28] || '').toString().trim(),
      branch_name: (r[29] || '').toString().trim(),
      photo_of_front_bank_passbook: (r[30] || '').toString().trim(),
      personal_email_id: (r[31] || '').toString().trim(),
      esic_no: (r[32] || '').toString().trim(),
      highest_qualification: (r[33] || '').toString().trim(),
      aadhar_card_no: (r[34] || '').toString().trim(),
      qualification_photo: (r[35] || '').toString().trim(),
      salary_slip: (r[36] || '').toString().trim(),
      resume_cv_upload: (r[37] || '').toString().trim(),
      stage1_planned: (r[38] || '').toString().trim(),
      stage1_actual: (r[39] || '').toString().trim(),
      stage1_status: (r[40] || '').toString().trim(),
      stage1_time_delay: (r[41] || '').toString().trim(),
      stage2_planned: (r[42] || '').toString().trim(),
      stage2_actual: (r[43] || '').toString().trim(),
      stage2_status: (r[44] || '').toString().trim(),
      letter_attachment: (r[45] || '').toString().trim(),
      stage2_time_delay: (r[46] || '').toString().trim(),
      stage3_planned: (r[47] || '').toString().trim(),
      stage3_actual: (r[48] || '').toString().trim(),
      stage3_status: (r[49] || '').toString().trim(),
      checklist: (r[50] || '').toString().trim(),
      stage3_time_delay: (r[51] || '').toString().trim(),
      stage4_planned: (r[52] || '').toString().trim(),
      stage4_actual: (r[53] || '').toString().trim(),
      stage4_status: (r[54] || '').toString().trim(),
      stage4_time_delay: (r[55] || '').toString().trim(),
      stage5_planned: (r[56] || '').toString().trim(),
      stage5_actual: (r[57] || '').toString().trim(),
      stage5_status: (r[58] || '').toString().trim(),
      stage5_update: (r[59] || '').toString().trim(),
      laptop_brand_model: (r[60] || '').toString().trim(),
      assets: (r[61] || '').toString().trim(),
      mobile_brand_sim: (r[62] || '').toString().trim(),
      gmail_id: (r[63] || '').toString().trim(),
      leave: (r[64] || '').toString().trim(),
      indent_no: indentNo,
      lookup_designation: lookupDesig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (rec.candidate_name || rec.employee_code) {
      parsedRecords.push(rec);
    }
  }

  console.log(`Ready to sync ${parsedRecords.length} records to joining_fms in Supabase...`);

  // Delete all existing records from joining_fms to ensure clean sync with latest CSV data
  const { error: delErr } = await supabase.from('joining_fms').delete().neq('id', 0);
  if (delErr) {
    console.error('Delete error:', delErr);
    return;
  }
  console.log('Cleared old joining_fms records.');

  // Insert in batches of 20
  for (let i = 0; i < parsedRecords.length; i += 20) {
    const chunk = parsedRecords.slice(i, i + 20);
    const { data: insData, error: insErr } = await supabase.from('joining_fms').insert(chunk).select('id, employee_code, candidate_name, update_link');
    if (insErr) {
      console.error(`Error inserting chunk ${i}:`, insErr);
      return;
    }
    console.log(`Inserted chunk ${i + 1} to ${Math.min(i + 20, parsedRecords.length)}:`, insData.map(d => `${d.employee_code} (${d.candidate_name})`));
  }

  const { count } = await supabase.from('joining_fms').select('*', { count: 'exact', head: true });
  console.log(`\nSync Completed! Total records in joining_fms now: ${count}`);

  const { data: pendingRows } = await supabase.from('joining_fms').select('id, employee_code, candidate_name, update_link, indent_no, designation').neq('update_link', 'DONE');
  console.log('Pending records count:', pendingRows.length);
  console.log('Pending records:', pendingRows);
}

syncToSupabase();
