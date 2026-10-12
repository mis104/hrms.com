import fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const xlsx = XLSX.default || XLSX;

const supabase = createClient(
  'https://nmfnppmhguvcmaagqgzp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZm5wcG1oZ3V2Y21hYWdxZ3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNTIwOTcsImV4cCI6MjEwNjkyODA5N30.dQPM3gdU-eO_GDBB1oDhWEfcHMCN3dfQwsC5IRzge7Y'
);

const csvPath = 'd:/HRMS-PIRAMAL - SUPABASE/HR_Piramal/JOINING_FMS.csv';

function formatToDDMMYYYY(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str === 'EMPTY') return '';

  // 1. Excel numeric serial date (e.g. 46029.31318287037 or 28921)
  const num = Number(str);
  if (!isNaN(num) && num > 1000) {
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const year = date_info.getUTCFullYear();
    return `${day}-${month}-${year}`;
  }

  // 2. Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // 3. DD-MM-YYYY HH:mm:ss
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashMatch) {
    const day = dashMatch[1].padStart(2, '0');
    const month = dashMatch[2].padStart(2, '0');
    const year = dashMatch[3];
    return `${day}-${month}-${year}`;
  }

  // 4. DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${day}-${month}-${year}`;
  }

  // 5. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // 6. Generic Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

async function run() {
  const fileBuf = fs.readFileSync(csvPath);
  const workbook = xlsx.read(fileBuf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log('Total raw rows:', rawRows.length);
  const header = rawRows[0];
  console.log('Headers count:', header.length);
  header.forEach((h, idx) => console.log(`[${idx}] ${h}`));

  // Find data rows (skip header and empty rows)
  const dataRows = rawRows.slice(1).filter(r => r && r.some(c => c && c.toString().trim() !== ''));
  console.log(`Valid data rows to insert: ${dataRows.length}`);

  const parsedRecords = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];

    // Let's map according to column indices from header
    // [0] EMPLOYEE CODE
    // [1] ID
    // [2] CANDIATE NAME
    // [3] Finalized Salary
    // [4] UPDATE LINK
    // [5] Timestamp
    // [6] Name As per Aadhar
    // [7] Father Name
    // [8] Date of Joining
    // [9] Joining Place
    // [10] Designation
    // [11] Salary
    // [12] Aadhar Frontside photo
    // [13] Pan Card
    // [14] Candidate Photo
    // [15] Current Address
    // [16] Address  As per Aadhar Card
    // [17] Date of Birth As Per Aadhar Card
    // [18] Gender
    // [19] Mobile No.
    // [20] Family Mobile No.
    // [21] Relationship with Family Person
    // [22] Past Pf Id No. (If Any)
    // [23] Current Bank AC No.
    // [24] IFSC Code
    // [25] Branch Name
    // [26] Photo Of Front Bank Passbook
    // [27] Personal Email-Id
    // [28] ESIC No (IF Any)
    // [29] Highest Qualification
    // [30] Aadhar Card No
    // [31] Qualication Photo
    // [32] Salary Slip
    // [33] Resume/Cv Upload
    // [34] Planned (Stage 1)
    // [35] Actual (Stage 1)
    // [36] Status (Stage 1)
    // [37] Time Delay (Stage 1)
    // [38] Planned (Stage 2)
    // [39] Actual (Stage 2)
    // [40] Status (Stage 2)
    // [41] Letter Attachment (Stage 2)
    // [42] Time Delay (Stage 2)
    // [43] Planned (Stage 3)
    // [44] Actual (Stage 3)
    // [45] Status (Stage 3)
    // [46] Checklist (Stage 3)
    // [47] Time Delay (Stage 3)
    // [48] Planned (Stage 4)
    // [49] Actual (Stage 4)
    // [50] Status (Stage 4)
    // [51] Time Delay (Stage 4)
    // [52] Planned (Stage 5)
    // [53] Actual (Stage 5)
    // [54] Status (Stage 5)
    // [55] Update (Stage 5)
    // [56] LAPTOP BRAND NAME -MODEL NAME
    // [57] ASSESTS
    // [58] MOBILE BRAND NAME-SIM NUMBER
    // [59] GMAIL ID
    // [60] Leave
    // [61] INDENT NO
    // [62] DESIGNANTION

    let indentNo = (r[61] || '').toString().trim();
    let lookupDesig = (r[62] || '').toString().trim();
    const customId = (r[1] || '').toString().trim();

    if ((!indentNo || !lookupDesig) && customId.includes('_')) {
      const parts = customId.split('_');
      if (!indentNo) indentNo = parts[0];
      if (!lookupDesig && parts.length > 1) lookupDesig = parts.slice(1).join('_');
    }

    const payload = {
      employee_code: (r[0] || '').toString().trim(),
      candidate_name: (r[2] || '').toString().trim(),
      finalized_salary: (r[3] || '').toString().trim(),
      update_link: (r[4] || '').toString().trim(),
      timestamp: formatToDDMMYYYY(r[5]),
      name_as_per_aadhar: (r[6] || '').toString().trim(),
      father_name: (r[7] || '').toString().trim(),
      date_of_joining: formatToDDMMYYYY(r[8]),
      joining_place: (r[9] || '').toString().trim(),
      designation: (r[10] || '').toString().trim(),
      salary: (r[11] || '').toString().trim(),
      aadhar_frontside_photo: (r[12] || '').toString().trim(),
      pan_card: (r[13] || '').toString().trim(),
      candidate_photo: (r[14] || '').toString().trim(),
      current_address: (r[15] || '').toString().trim(),
      address_as_per_aadhar_card: (r[16] || '').toString().trim(),
      dob_as_per_aadhar: formatToDDMMYYYY(r[17]),
      gender: (r[18] || '').toString().trim(),
      mobile_no: (r[19] || '').toString().trim(),
      family_mobile_no: (r[20] || '').toString().trim(),
      relationship_with_family_person: (r[21] || '').toString().trim(),
      past_pf_id_no: (r[22] || '').toString().trim(),
      current_bank_ac_no: (r[23] || '').toString().trim(),
      ifsc_code: (r[24] || '').toString().trim(),
      branch_name: (r[25] || '').toString().trim(),
      photo_of_front_bank_passbook: (r[26] || '').toString().trim(),
      personal_email_id: (r[27] || '').toString().trim(),
      esic_no: (r[28] || '').toString().trim(),
      highest_qualification: (r[29] || '').toString().trim(),
      aadhar_card_no: (r[30] || '').toString().trim(),
      qualification_photo: (r[31] || '').toString().trim(),
      salary_slip: (r[32] || '').toString().trim(),
      resume_cv_upload: (r[33] || '').toString().trim(),

      stage1_planned: formatToDDMMYYYY(r[34]),
      stage1_actual: formatToDDMMYYYY(r[35]),
      stage1_status: (r[36] || '').toString().trim(),
      stage1_time_delay: (r[37] || '').toString().trim(),

      stage2_planned: formatToDDMMYYYY(r[38]),
      stage2_actual: formatToDDMMYYYY(r[39]),
      stage2_status: (r[40] || '').toString().trim(),
      letter_attachment: (r[41] || '').toString().trim(),
      stage2_time_delay: (r[42] || '').toString().trim(),

      stage3_planned: formatToDDMMYYYY(r[43]),
      stage3_actual: formatToDDMMYYYY(r[44]),
      stage3_status: (r[45] || '').toString().trim(),
      checklist: (r[46] || '').toString().trim(),
      stage3_time_delay: (r[47] || '').toString().trim(),

      stage4_planned: formatToDDMMYYYY(r[48]),
      stage4_actual: formatToDDMMYYYY(r[49]),
      stage4_status: (r[50] || '').toString().trim(),
      stage4_time_delay: (r[51] || '').toString().trim(),

      stage5_planned: formatToDDMMYYYY(r[52]),
      stage5_actual: formatToDDMMYYYY(r[53]),
      stage5_status: (r[54] || '').toString().trim(),
      stage5_update: (r[55] || '').toString().trim(),

      laptop_brand_model: (r[56] || '').toString().trim(),
      assets: (r[57] || '').toString().trim(),
      mobile_brand_sim: (r[58] || '').toString().trim(),
      gmail_id: (r[59] || '').toString().trim(),
      leave: (r[60] || '').toString().trim(),

      indent_no: indentNo,
      lookup_designation: lookupDesig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    parsedRecords.push(payload);
  }

  console.log(`Parsed ${parsedRecords.length} records.`);
  console.log('Sample record 0:', parsedRecords[0]);

  // Insert into joining_fms in batches
  const batchSize = 25;
  for (let b = 0; b < parsedRecords.length; b += batchSize) {
    const batch = parsedRecords.slice(b, b + batchSize);
    const { data, error } = await supabase.from('joining_fms').insert(batch).select();
    if (error) {
      console.error(`Error inserting batch ${b}:`, error);
      return;
    }
    console.log(`Inserted batch ${b} to ${b + batch.length - 1} (${data.length} rows)`);
  }

  // Final verification
  const { data: finalRows, count } = await supabase.from('joining_fms').select('*', { count: 'exact' });
  console.log(`Sync complete! Total records in joining_fms: ${count}`);
  
  // Verify date formats
  const dateFields = [
    'timestamp', 'date_of_joining', 'dob_as_per_aadhar',
    'stage1_planned', 'stage1_actual',
    'stage2_planned', 'stage2_actual',
    'stage3_planned', 'stage3_actual',
    'stage4_planned', 'stage4_actual',
    'stage5_planned', 'stage5_actual'
  ];

  let bad = [];
  finalRows.forEach(r => {
    dateFields.forEach(f => {
      const v = r[f];
      if (v && v !== 'EMPTY' && !/^\d{2}-\d{2}-\d{4}$/.test(v)) {
        bad.push({ id: r.id, name: r.candidate_name, field: f, val: v });
      }
    });
  });

  console.log('Bad date count:', bad.length);
  if (bad.length > 0) {
    console.log('Bad dates:', bad);
  } else {
    console.log('ALL DATES & TIMESTAMPS ARE 100% STRICTLY DD-MM-YYYY!');
  }
}

run();
