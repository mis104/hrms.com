const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)?.[1]?.trim();
const supabase = createClient(url, key);

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentStr = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentStr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentStr.trim());
      currentStr = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentStr.trim());
      if (row.some(c => c.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentStr = '';
    } else {
      currentStr += char;
    }
  }

  if (currentStr.length > 0 || row.length > 0) {
    row.push(currentStr.trim());
    if (row.some(c => c.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

async function pushData() {
  const content = fs.readFileSync('HR - RECRUITMENT NEW FMS  - Onboard and Status.csv', 'utf-8');
  const rows = parseCSV(content);

  console.log('Total parsed rows:', rows.length);
  const headers = rows[0];
  console.log('Headers:', headers);

  const dataRows = rows.slice(1);

  const records = dataRows.map(r => {
    let d = r[0] || '';
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      d = `${m[3]}-${m[2]}-${m[1]}`;
    }

    return {
      date: d,
      image: r[1] || '',
      sms: (r[2] || '').trim(),
      sms_type: r[3] || '',
      name: r[4] || '',
      designation: r[5] || ''
    };
  });

  console.log('Formatted records to insert:', records);

  // Clear existing if any
  await supabase.from('onboard_and_status').delete().neq('id', 0);

  // Insert into Supabase
  const { data, error } = await supabase.from('onboard_and_status').insert(records).select();
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Successfully inserted records:', data.length, data);
  }
}

pushData();
