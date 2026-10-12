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

async function upload() {
  const fileContent = fs.readFileSync('HR - RECRUITMENT NEW FMS  - Data Resposnse.csv', 'utf8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  console.log('Total CSV lines:', lines.length);

  const header = parseCSVLine(lines[0]);
  console.log('Header columns:', header.slice(0, 15));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const uniqueId = (cols[0] || '').trim();
    const stepCode = (cols[1] || '').trim();
    if (!uniqueId || !stepCode) continue;

    rows.push({
      unique_id: uniqueId,
      step_code: stepCode,
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
    });
  }

  console.log('Parsed valid data rows:', rows.length);

  // Upload in chunks of 50
  const chunkSize = 50;
  let uploaded = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('data_response').insert(chunk);
    if (error) {
      console.error('Error inserting chunk ' + i + ':', error.message);
      return;
    }
    uploaded += chunk.length;
    console.log('Uploaded ' + uploaded + ' of ' + rows.length + ' rows...');
  }

  console.log('SUCCESS: All ' + uploaded + ' rows uploaded to public.data_response!');
}

upload();
