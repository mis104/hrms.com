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

function formatToDDMMYYYY(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str === 'EMPTY') return '';

  // 1. Check if it's an Excel numeric serial date (e.g. 46062.5035...)
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    // Excel epoch: Dec 30 1899
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const year = date_info.getUTCFullYear();
    return `${day}-${month}-${year}`;
  }

  // 2. Check if it's already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // 3. Check DD/MM/YYYY or DD/MM/YYYY HH:MM:SS or D/M/YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${day}-${month}-${year}`;
  }

  // 4. Check YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // 5. Try standard Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

async function syncWithDDMMYYYY() {
  const fileBuf = fs.readFileSync(csvPath);
  const workbook = xlsx.read(fileBuf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const dataRows = rawRows.slice(7).filter(r => r && r.some(c => c && c.toString().trim() !== ''));
  console.log(`Data rows in CSV: ${dataRows.length}`);

  const parsedRecords = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];

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
      date_of_joining: formatToDDMMYYYY(r[12]),
      joining_place: (r[13] || '').toString().trim(),
      designation: (r[14] || lookupDesig || '').toString().trim(),
      salary: (r[15] || r[7] || '').toString().trim(),
      aadhar_frontside_photo: (r[16] || '').toString().trim(),
      pan_card: (r[17] || '').toString().trim(),
      candidate_photo: (r[18] || '').toString().trim(),
      current_address: (r[19] || '').toString().trim(),
      address_as_per_aadhar_card: (r[20] || '').toString().trim(),
      dob_as_per_aadhar: formatToDDMMYYYY(r[21]),
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
      stage1_planned: formatToDDMMYYYY(r[38]),
      stage1_actual: formatToDDMMYYYY(r[39]),
      stage1_status: (r[40] || '').toString().trim(),
      stage1_time_delay: (r[41] || '').toString().trim(),
      stage2_planned: formatToDDMMYYYY(r[42]),
      stage2_actual: formatToDDMMYYYY(r[43]),
      stage2_status: (r[44] || '').toString().trim(),
      letter_attachment: (r[45] || '').toString().trim(),
      stage2_time_delay: (r[46] || '').toString().trim(),
      stage3_planned: formatToDDMMYYYY(r[47]),
      stage3_actual: formatToDDMMYYYY(r[48]),
      stage3_status: (r[49] || '').toString().trim(),
      checklist: (r[50] || '').toString().trim(),
      stage3_time_delay: (r[51] || '').toString().trim(),
      stage4_planned: formatToDDMMYYYY(r[52]),
      stage4_actual: formatToDDMMYYYY(r[53]),
      stage4_status: (r[54] || '').toString().trim(),
      stage4_time_delay: (r[55] || '').toString().trim(),
      stage5_planned: formatToDDMMYYYY(r[56]),
      stage5_actual: formatToDDMMYYYY(r[57]),
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

  console.log(`Syncing ${parsedRecords.length} records with DD-MM-YYYY dates...`);

  // Clear existing records
  const { error: delErr } = await supabase.from('joining_fms').delete().neq('id', 0);
  if (delErr) {
    console.error('Delete error:', delErr);
    return;
  }

  // Insert in batches of 20
  for (let i = 0; i < parsedRecords.length; i += 20) {
    const chunk = parsedRecords.slice(i, i + 20);
    const { data: insData, error: insErr } = await supabase.from('joining_fms').insert(chunk).select('id, employee_code, stage1_planned, stage2_planned, date_of_joining');
    if (insErr) {
      console.error(`Error inserting chunk ${i}:`, insErr);
      return;
    }
    console.log(`Inserted chunk ${i + 1} to ${Math.min(i + 20, parsedRecords.length)}`);
  }

  console.log('\nSample synced records stage1_planned:');
  const { data: samples } = await supabase.from('joining_fms').select('id, employee_code, candidate_name, date_of_joining, stage1_planned, stage1_actual, update_link').limit(10);
  console.table(samples);
}

syncWithDDMMYYYY();
