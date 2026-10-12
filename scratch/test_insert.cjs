const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmfnppmhguvcmaagqgzp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZm5wcG1oZ3V2Y21hYWdxZ3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNTIwOTcsImV4cCI6MjEwNjkyODA5N30.dQPM3gdU-eO_GDBB1oDhWEfcHMCN3dfQwsC5IRzge7Y';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

async function testAll() {
  const fileContent = fs.readFileSync('HR - RECRUITMENT NEW FMS  - Data Resposnse.csv', 'utf8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  // Let's test inserting each row individually to see which one fails and why
  for (let i = 1; i <= 30; i++) {
    const cols = parseCSVLine(lines[i]);
    const row = {
      unique_id: (cols[0] || '').trim(),
      step_code: (cols[1] || '').trim(),
      timestamp: (cols[2] || '').trim(),
      status: (cols[3] || '').trim(),
      online_platform: (cols[4] || '').trim(),
      attachment: (cols[5] || '').trim(),
      job_consultancy: (cols[6] || '').trim(),
      job_consultancy_attachment: (cols[7] || '').trim(),
      screenshot: (cols[8] || '').trim(),
      finalized_salary: (cols[9] || '').trim(),
      joining_date: (cols[10] || '').trim(),
      contact_person_name: (cols[11] || '').trim(),
      contact_no: (cols[12] || '').trim(),
      customer_says: (cols[13] || '').trim(),
      next_follow_up_date: (cols[14] || '').trim(),
    };
    const { error } = await supabase.from('data_response').insert([row]);
    if (error) {
      console.log(`Line ${i} (${row.unique_id}, ${row.step_code}) failed: ${error.message}`);
      console.log('Row payload:', row);
      break;
    } else {
      console.log(`Line ${i} (${row.unique_id}, ${row.step_code}) OK`);
    }
  }
}
testAll();
