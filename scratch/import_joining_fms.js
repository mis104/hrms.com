import fs from 'fs';
import path from 'path';
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

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];
  let currentLine = '';

  for (const rawLine of lines) {
    if (!currentLine) {
      currentLine = rawLine;
    } else {
      currentLine += '\n' + rawLine;
    }
    
    let quoteCount = 0;
    for (let i = 0; i < currentLine.length; i++) {
      if (currentLine[i] === '"') quoteCount++;
    }

    if (quoteCount % 2 === 0) {
      rows.push(parseCSVLine(currentLine));
      currentLine = '';
    }
  }
  if (currentLine) {
    rows.push(parseCSVLine(currentLine));
  }
  return rows;
}

async function run() {
  const csvPath = path.resolve(process.cwd(), '_HR-JOINING FMS NEW - JOINING_FMS (1).csv');
  console.log(`Reading CSV from ${csvPath}...`);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const allRows = parseCSV(fileContent);

  console.log(`Total parsed lines: ${allRows.length}`);

  let headerIndex = -1;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    if (allRows[i].some(col => col.toUpperCase().includes('EMPLOYEE CODE'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error("Could not locate header row in CSV");
    return;
  }

  const dataRows = allRows.slice(headerIndex + 1);
  const records = [];

  for (const row of dataRows) {
    const empCode = row.find(c => c && c.startsWith('PPPL/EI/')) || row[4] || '';
    if (!empCode || !empCode.startsWith('PPPL/EI/')) continue;

    const empIdx = row.indexOf(empCode);
    const id = row[empIdx + 1] || '';
    const candidateName = row[empIdx + 2] || '';
    const finalizedSalary = row[empIdx + 3] || '';
    const updateLink = row[empIdx + 4] || '';
    const timestamp = row[empIdx + 5] || '';
    const nameAsPerAadhar = row[empIdx + 6] || '';
    const fatherName = row[empIdx + 7] || '';
    const dateOfJoining = row[empIdx + 8] || '';
    const joiningPlace = row[empIdx + 9] || '';
    const designation = row[empIdx + 10] || '';
    const salary = row[empIdx + 11] || '';
    const aadharFront = row[empIdx + 12] || '';
    const panCard = row[empIdx + 13] || '';
    const candidatePhoto = row[empIdx + 14] || '';
    const currentAddress = row[empIdx + 15] || '';
    const addressAadhar = row[empIdx + 16] || '';
    const dobAadhar = row[empIdx + 17] || '';
    const gender = row[empIdx + 18] || '';
    const mobileNo = row[empIdx + 19] || '';
    const familyMobile = row[empIdx + 20] || '';
    const relationship = row[empIdx + 21] || '';
    const pastPf = row[empIdx + 22] || '';
    const bankAc = row[empIdx + 23] || '';
    const ifsc = row[empIdx + 24] || '';
    const branchName = row[empIdx + 25] || '';
    const passbookPhoto = row[empIdx + 26] || '';
    const personalEmail = row[empIdx + 27] || '';
    const esicNo = row[empIdx + 28] || '';
    const highestQual = row[empIdx + 29] || '';
    const aadharNo = row[empIdx + 30] || '';
    const qualPhoto = row[empIdx + 31] || '';
    const salarySlip = row[empIdx + 32] || '';
    const resumeUpload = row[empIdx + 33] || '';

    // Stage 1 (J-1)
    const stage1_planned = row[empIdx + 34] || '';
    const stage1_actual = row[empIdx + 35] || '';
    const stage1_status = row[empIdx + 36] || '';
    const stage1_delay = row[empIdx + 37] || '';

    // Stage 2 (J-2)
    const stage2_planned = row[empIdx + 38] || '';
    const stage2_actual = row[empIdx + 39] || '';
    const stage2_status = row[empIdx + 40] || '';
    const stage2_attachment = row[empIdx + 41] || '';
    const stage2_delay = row[empIdx + 42] || '';

    // Stage 3 (J-3)
    const stage3_planned = row[empIdx + 43] || '';
    const stage3_actual = row[empIdx + 44] || '';
    const stage3_status = row[empIdx + 45] || '';
    const stage3_checklist = row[empIdx + 46] || '';
    const stage3_delay = row[empIdx + 47] || '';

    // Stage 4 (J-4)
    const stage4_planned = row[empIdx + 48] || '';
    const stage4_actual = row[empIdx + 49] || '';
    const stage4_status = row[empIdx + 50] || '';
    const stage4_delay = row[empIdx + 51] || '';

    // Stage 5 (J-5)
    const stage5_planned = row[empIdx + 52] || '';
    const stage5_actual = row[empIdx + 53] || '';
    const stage5_status = row[empIdx + 54] || '';
    const stage5_update = row[empIdx + 55] || '';
    const laptopBrand = row[empIdx + 56] || '';
    const assets = row[empIdx + 57] || '';
    const mobileSim = row[empIdx + 58] || '';
    const gmailId = row[empIdx + 59] || '';
    const leave = row[empIdx + 60] || '';
    const indentNo = row[empIdx + 61] || (id.includes('_') ? id.split('_')[0] : '');
    const desigLookup = row[empIdx + 62] || (id.includes('_') ? id.split('_').slice(1).join('_') : '');

    const record = {
      employee_code: empCode,
      candidate_name: candidateName,
      finalized_salary: finalizedSalary,
      update_link: updateLink,
      timestamp: timestamp,
      name_as_per_aadhar: nameAsPerAadhar,
      father_name: fatherName,
      date_of_joining: dateOfJoining,
      joining_place: joiningPlace,
      designation: designation,
      salary: salary,
      aadhar_frontside_photo: aadharFront,
      pan_card: panCard,
      candidate_photo: candidatePhoto,
      current_address: currentAddress,
      address_as_per_aadhar_card: addressAadhar,
      dob_as_per_aadhar: dobAadhar,
      gender: gender,
      mobile_no: mobileNo,
      family_mobile_no: familyMobile,
      relationship_with_family_person: relationship,
      past_pf_id_no: pastPf,
      current_bank_ac_no: bankAc,
      ifsc_code: ifsc,
      branch_name: branchName,
      photo_of_front_bank_passbook: passbookPhoto,
      personal_email_id: personalEmail,
      esic_no: esicNo,
      highest_qualification: highestQual,
      aadhar_card_no: aadharNo,
      qualification_photo: qualPhoto,
      salary_slip: salarySlip,
      resume_cv_upload: resumeUpload,
      stage1_planned: stage1_planned,
      stage1_actual: stage1_actual,
      stage1_status: stage1_status,
      stage1_time_delay: stage1_delay,
      stage2_planned: stage2_planned,
      stage2_actual: stage2_actual,
      stage2_status: stage2_status,
      letter_attachment: stage2_attachment,
      stage2_time_delay: stage2_delay,
      stage3_planned: stage3_planned,
      stage3_actual: stage3_actual,
      stage3_status: stage3_status,
      checklist: stage3_checklist,
      stage3_time_delay: stage3_delay,
      stage4_planned: stage4_planned,
      stage4_actual: stage4_actual,
      stage4_status: stage4_status,
      stage4_time_delay: stage4_delay,
      stage5_planned: stage5_planned,
      stage5_actual: stage5_actual,
      stage5_status: stage5_status,
      stage5_update: stage5_update,
      laptop_brand_model: laptopBrand,
      assets: assets,
      mobile_brand_sim: mobileSim,
      gmail_id: gmailId,
      leave: leave,
      indent_no: indentNo,
      lookup_designation: desigLookup || designation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    records.push(record);
  }

  console.log(`Prepared ${records.length} records for insert.`);
  
  if (records.length > 0) {
    // Clear any existing test records if needed, or insert in batches
    for (let i = 0; i < records.length; i += 15) {
      const batch = records.slice(i, i + 15);
      const { error: insErr } = await supabase
        .from('joining_fms')
        .insert(batch);

      if (insErr) {
        console.error(`Error inserting batch ${Math.floor(i / 15) + 1}:`, insErr.message);
      } else {
        console.log(`Inserted batch ${Math.floor(i / 15) + 1} (${batch.length} items) successfully.`);
      }
    }
  }

  const { count } = await supabase.from('joining_fms').select('*', { count: 'exact', head: true });
  console.log(`🎉 Total rows now in joining_fms: ${count}`);
  console.log("Import completed successfully!");
}

run().catch(console.error);
