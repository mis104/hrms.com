const fs = require('fs');

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

const fileContent = fs.readFileSync('HR - RECRUITMENT NEW FMS  - Data Resposnse.csv', 'utf8');
const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

const maxLens = {};
const keys = [
  'unique_id', 'step_code', 'timestamp', 'status', 'online_platform',
  'attachment', 'job_consultancy', 'job_consultancy_attachment',
  'screenshot', 'finalized_salary', 'joining_date',
  'contact_person_name', 'contact_no', 'customer_says', 'next_follow_up_date'
];
keys.forEach(k => maxLens[k] = 0);

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  keys.forEach((k, idx) => {
    const val = (cols[idx] || '').trim();
    if (val.length > maxLens[k]) {
      maxLens[k] = val.length;
    }
  });
}

console.log('Max column lengths:', maxLens);
