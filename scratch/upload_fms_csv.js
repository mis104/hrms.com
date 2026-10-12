import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Read .env directly
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

let supabaseUrl = "https://nmfnppmhguvcmaagqgzp.supabase.co";
let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZm5wcG1oZ3V2Y21hYWdxZ3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNTIwOTcsImV4cCI6MjEwNjkyODA5N30.dQPM3gdU-eO_GDBB1oDhWEfcHMCN3dfQwsC5IRzge7Y";

envContent.split(/\r?\n/).forEach((line) => {
  const [k, ...rest] = line.split("=");
  const val = rest.join("=").trim();
  if (k.trim() === "VITE_SUPABASE_URL") supabaseUrl = val;
  if (k.trim() === "VITE_SUPABASE_ANON_KEY") supabaseKey = val;
});

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeToDDMMYYYY(val) {
  if (!val || typeof val !== "string") return "";
  val = val.trim();
  if (!val) return "";

  let [datePart, timePart] = val.split(" ");

  if (datePart.includes("/")) {
    const parts = datePart.split("/");
    if (parts.length === 3) {
      let [p1, p2, p3] = parts;
      if (p3.length === 4) {
        let month = parseInt(p1, 10);
        let day = parseInt(p2, 10);
        if (parseInt(p1, 10) > 12) {
          day = parseInt(p1, 10);
          month = parseInt(p2, 10);
        }
        const dd = String(day).padStart(2, "0");
        const mm = String(month).padStart(2, "0");
        const yyyy = p3;
        datePart = `${dd}-${mm}-${yyyy}`;
      } else if (p1.length === 4) {
        const dd = String(p3).padStart(2, "0");
        const mm = String(p2).padStart(2, "0");
        datePart = `${dd}-${mm}-${p1}`;
      }
    }
  } else if (datePart.includes("-")) {
    const parts = datePart.split("-");
    if (parts.length === 3) {
      let [p1, p2, p3] = parts;
      if (p1.length === 4) {
        const dd = String(p3).padStart(2, "0");
        const mm = String(p2).padStart(2, "0");
        datePart = `${dd}-${mm}-${p1}`;
      } else if (p3.length === 4) {
        const dd = String(p1).padStart(2, "0");
        const mm = String(p2).padStart(2, "0");
        datePart = `${dd}-${mm}-${p3}`;
      }
    }
  }

  return timePart ? `${datePart} ${timePart}` : datePart;
}

function parseCSVLine(text) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

async function uploadFMS() {
  const csvPath = path.resolve(process.cwd(), "FMS.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("FMS.csv not found at", csvPath);
    return;
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (rawLines.length < 2) {
    console.error("CSV has no data rows");
    return;
  }

  const rows = [];
  for (let i = 1; i < rawLines.length; i++) {
    const cols = parseCSVLine(rawLines[i]);
    if (!cols[3] && !cols[5]) continue; // skip empty indent and post

    const rowObj = {
      position_status: cols[0] || "OPEN",
      location: cols[1] || "",
      timestamp: normalizeToDDMMYYYY(cols[2]),
      indent_no: cols[3] || `IN-${i}`,
      person_name: cols[4] || "",
      post: cols[5] || "",
      salary: cols[6] || "",
      office_timing: cols[7] || "",
      types_of_weekly_off: cols[8] || "Week off",
      residence: cols[9] || "",
      gender: cols[10] || "Any",
      department: cols[11] || "",
      prefer: cols[12] || "",
      number_of_post: cols[13] || "1",
      completion_date: normalizeToDDMMYYYY(cols[14]),
      required_qualifications: cols[15] || "",
      stage1_planned: normalizeToDDMMYYYY(cols[16]),
      stage1_actual: normalizeToDDMMYYYY(cols[17]),
      stage1_status: cols[18] || "No",
      online_platform: cols[19] || "",
      online_platform_attachments: cols[20] || "",
      stage1_time_delay: cols[21] || "",
      stage2_planned: normalizeToDDMMYYYY(cols[22]),
      stage2_actual: normalizeToDDMMYYYY(cols[23]),
      stage2_status: cols[24] || "No",
      job_consultancy: cols[25] || "",
      contact_person_name: cols[26] || "",
      contact_no: cols[27] || "",
      stage2_time_delay: cols[28] || "",
      stage3_planned: normalizeToDDMMYYYY(cols[29]),
      stage3_actual: normalizeToDDMMYYYY(cols[30]),
      stage3_status: cols[31] || "No",
      screenshot: cols[32] || "",
      stage3_time_delay: cols[33] || "",
      selected_candidate_name: cols[34] || "",
      finalized_salary: cols[35] || "",
      indent_close_status: cols[36] || "",
      closer_status: cols[37] || "NO",
      priority: cols[38] || "Medium",
    };

    rows.push(rowObj);
  }

  console.log(`Parsed ${rows.length} rows from FMS.csv with DD-MM-YYYY normalized dates.`);

  // Upsert batch into Supabase public.fms
  const batchSize = 25;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("fms")
      .upsert(chunk, { onConflict: "indent_no" });

    if (error) {
      console.error(`Error uploading batch ${i}-${i + chunk.length}:`, error.message);
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.error("\n[CRITICAL]: Table 'fms' does not exist in Supabase! Please create it in the Supabase SQL Editor first.\n");
        return;
      }
    } else {
      console.log(`Successfully uploaded batch ${i + 1} to ${Math.min(i + batchSize, rows.length)}.`);
    }
  }

  console.log("FMS CSV Upload completed successfully!");
}

uploadFMS();
