import { supabase } from './supabaseClient';

/**
 * Universal helper for fetching all records or filtered records from any Supabase table
 * @param {string} table - Table name
 * @param {object} [options] - Query options { select, filters, orderBy, ascending, limit }
 */
export const fetchTableData = async (table, options = {}) => {
  try {
    let query = supabase.from(table).select(options.select || '*');

    if (options.filters && Array.isArray(options.filters)) {
      options.filters.forEach(({ column, operator, value }) => {
        if (operator === 'eq') query = query.eq(column, value);
        else if (operator === 'neq') query = query.neq(column, value);
        else if (operator === 'in') query = query.in(column, value);
        else if (operator === 'gte') query = query.gte(column, value);
        else if (operator === 'lte') query = query.lte(column, value);
        else if (operator === 'ilike') query = query.ilike(column, `%${value}%`);
      });
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error(`Error fetching data from table ${table}:`, error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Insert one or multiple rows into a table
 */
export const insertTableRow = async (table, rowOrRows) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(rowOrRows)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Error inserting into ${table}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Update row(s) matching a column condition
 */
export const updateTableRow = async (table, column, value, updates) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq(column, value)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Error updating ${table}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Upsert (insert or update on match)
 */
export const upsertTableRow = async (table, rowOrRows, onConflict = 'id') => {
  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(rowOrRows, { onConflict })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Error upserting into ${table}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete row(s) matching a condition
 */
export const deleteTableRow = async (table, column, value) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq(column, value);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch all master dropdown options grouped by category with 0 latency
 */
export const fetchMasterDropdowns = async () => {
  try {
    const { data, error } = await supabase
      .from('master_dropdowns')
      .select('*');

    if (error) throw error;

    const indenterNames = Array.from(new Set((data || []).map(r => r.indenter_name).filter(Boolean)));
    const departments = Array.from(new Set((data || []).map(r => r.department).filter(Boolean)));
    const timings = Array.from(new Set((data || []).map(r => r.timing).filter(Boolean)));
    const socialSiteTypes = Array.from(new Set((data || []).map(r => r.social_site_type).filter(Boolean)));
    const flwUpStatuses = Array.from(new Set((data || []).map(r => r.flw_up_status).filter(Boolean)));
    const entryByList = Array.from(new Set((data || []).map(r => r.entry_by).filter(Boolean)));
    const consultancies = Array.from(new Set((data || []).map(r => r.cunsultancy_name).filter(Boolean)));
    const candidateStatuses = Array.from(new Set((data || []).map(r => r.candidate_status).filter(Boolean)));

    return {
      indenterNames,
      departments,
      timings,
      socialSiteTypes,
      flwUpStatuses,
      entryByList,
      consultancies,
      candidateStatuses,
    };
  } catch (err) {
    console.error("fetchMasterDropdowns error:", err);
    return {};
  }
};

/**
 * Fetch leave requests with low-egress server pagination and filters
 */
export const fetchLeaveRequests = async ({
  page = 1,
  limit = 50,
  requestedBy = null,
  status = null,
  search = null,
  year = null,
  month = null, // JS month index as string ('0'..'11') or 'all'/null
  select = '*',
  orderBy = 'id',
  ascending = true,
} = {}) => {
  try {
    let query = supabase
      .from('leave_requests')
      .select(select, { count: 'exact' });

    // Exact match keeps egress low and prevents one employee's name from
    // partially matching another's (e.g. "Deepak" matching several people).
    if (requestedBy && requestedBy !== 'all') {
      query = query.eq('requested_by', requestedBy);
    }

    if (status && status !== 'all') {
      query = query.ilike('approval_status', `%${status}%`);
    }

    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(
        `requested_by.ilike.%${s}%,leave_request_no.ilike.%${s}%,department.ilike.%${s}%,leave_reason.ilike.%${s}%`
      );
    }

    // Server-side Year / Month filter on the string date columns.
    // Dates are stored mostly as DD-MM-YYYY, with a few as YYYY-MM-DD, so we
    // match both layouts against leave_from_date and leave_to_date.
    if (year) {
      const y = String(year);
      let dateOr;
      if (month === null || month === undefined || month === 'all' || month === '') {
        dateOr =
          `leave_from_date.ilike.%-${y},leave_from_date.ilike.${y}-%,` +
          `leave_to_date.ilike.%-${y},leave_to_date.ilike.${y}-%`;
      } else {
        const mm = String(parseInt(month, 10) + 1).padStart(2, '0');
        dateOr =
          `leave_from_date.ilike.%-${mm}-${y},leave_from_date.ilike.${y}-${mm}-%,` +
          `leave_to_date.ilike.%-${mm}-${y},leave_to_date.ilike.${y}-${mm}-%`;
      }
      query = query.or(dateOr);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order(orderBy, { ascending }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: data || [],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return { success: false, error: error.message, data: [], totalCount: 0, totalPages: 1 };
  }
};

const getCurrentDDMMYYYY = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
};

/**
 * Create a new leave request in Supabase
 */
export const createLeaveRequest = async (leaveData) => {
  try {
    let lrNo = leaveData.leave_request_no;
    if (!lrNo) {
      const { data: latestRows } = await supabase
        .from('leave_requests')
        .select('leave_request_no')
        .order('id', { ascending: false })
        .limit(50);

      let maxNum = 0;
      (latestRows || []).forEach((r) => {
        const m = (r.leave_request_no || '').match(/LR-?(\d+)/i);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      });
      lrNo = `LR-${String(maxNum + 1).padStart(2, '0')}`;
    }

    const newRecord = {
      ...leaveData,
      leave_request_no: lrNo,
      timestamp: leaveData.timestamp || getCurrentDDMMYYYY(),
      approval_status: leaveData.approval_status || 'Pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('leave_requests')
      .insert(newRecord)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating leave request:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update leave request status (Approved / Rejected)
 */
export const updateLeaveStatus = async ({ id, leaveRequestNo, status, approvedBy, remarks, fromDate, toDate }) => {
  try {
    const updates = {
      approval_status: status,
      approved_by: approvedBy || 'Manager',
      approval_actual: getCurrentDDMMYYYY(),
      approval_remarks: remarks || '',
      updated_at: new Date().toISOString(),
    };


    if (fromDate) updates.leave_from_date = fromDate;
    if (toDate) updates.leave_to_date = toDate;

    let query = supabase.from('leave_requests').update(updates);

    if (id) {
      query = query.eq('id', id);
    } else if (leaveRequestNo) {
      query = query.eq('leave_request_no', leaveRequestNo);
    } else {
      throw new Error('Either id or leaveRequestNo is required');
    }

    const { data, error } = await query.select().single();
    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating leave status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Universal helper to log recruitment events to 'data_response' and sync actual dates/status in candidate_selection or fms.
 */
export const recordDataResponse = async ({
  uniqueId,
  stepCode, // 'PO-1', 'PO-2', 'PO-3', 'CS-1', 'CS-2', 'CS-3', 'CS-4', 'J-1', 'J-2', 'J-3', 'J-5'
  status, // 'Done', 'Yes', 'Selected', 'Rejected', 'Hold'
  onlinePlatform,
  attachment,
  jobConsultancy,
  jobConsultancyAttachment,
  screenshot,
  finalizedSalary,
  joiningDate,
  contactPersonName,
  contactNo,
  customerSays,
  nextFollowUpDate,
  timestamp,
  laptopBrandModel,
  assets,
  mobileBrandSim,
  gmailId
}) => {
  try {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const todayFormatted = `${d}-${m}-${y}`;
    const nowTimestamp = timestamp || `${d}-${m}-${y} ${hh}:${mm}:${ss}`;

    // 1. Insert into data_response table
    const logPayload = {
      unique_id: uniqueId,
      step_code: stepCode,
      timestamp: nowTimestamp,
      status: status || '',
      online_platform: onlinePlatform || '',
      attachment: attachment || '',
      job_consultancy: jobConsultancy || '',
      job_consultancy_attachment: jobConsultancyAttachment || '',
      screenshot: screenshot || '',
      finalized_salary: finalizedSalary || '',
      joining_date: joiningDate || '',
      contact_person_name: contactPersonName || '',
      contact_no: contactNo || '',
      customer_says: customerSays || '',
      next_follow_up_date: nextFollowUpDate || '',
      checklist: checklist || '',
      laptop_brand_model: laptopBrandModel || '',
      mobile_brand_sim: mobileBrandSim || '',
      gmail_id: gmailId || '',
      assets: assets || ''
    };

    const { error: logErr } = await supabase
      .from('data_response')
      .insert([logPayload]);

    if (logErr) {
      console.warn("Could not insert into data_response table:", logErr.message);
    }

    // 2. Cascade sync to candidate_selection (for CS-1, CS-2, CS-3, CS-4)
    if (stepCode && stepCode.startsWith('CS-')) {
      const updates = { updated_at: new Date().toISOString() };

      if (stepCode === 'CS-1') {
        updates.stage1_actual = todayFormatted;
        updates.stage1_status = status;
        if (status === 'Selected' || status === 'Shortlisted' || status === 'Good Canidate') {
          updates.stage2_planned = todayFormatted;
        }
      } else if (stepCode === 'CS-2') {
        updates.stage2_actual = todayFormatted;
        updates.stage2_status = status;
        if (status === 'Selected' || status === 'Yes' || status === 'Done') {
          updates.stage3_planned = todayFormatted;
        }
      } else if (stepCode === 'CS-3') {
        updates.stage3_actual = todayFormatted;
        updates.stage3_status = status;
        if (finalizedSalary) updates.finalized_salary = finalizedSalary;
        if (status === 'Selected') {
          updates.stage4_planned = todayFormatted;
        }
      } else if (stepCode === 'CS-4') {
        updates.stage4_actual = todayFormatted;
        updates.stage4_status = status;
        if (joiningDate) updates.joining_date = joiningDate;
      }

      await supabase
        .from('candidate_selection')
        .update(updates)
        .or(`indent_and_name.eq.${uniqueId},candidate_id.eq.${uniqueId},id_name.eq.${uniqueId}`);
    }

    // 3. Cascade sync to joining_fms (for J-1, J-2, J-3, J-5)
    if (stepCode && (stepCode.startsWith('J-') || stepCode.startsWith('JOINING-'))) {
      const updates = { updated_at: new Date().toISOString() };
      
      if (stepCode === 'J-1') {
        updates.stage1_actual = todayFormatted;
        updates.stage1_status = status;
        if (status === 'Yes' || status === 'Done' || status === 'Selected' || status === 'Completed') {
          updates.stage2_planned = todayFormatted;
        }
      } else if (stepCode === 'J-2') {
        updates.stage2_actual = todayFormatted;
        updates.stage2_status = status;
        if (attachment) updates.letter_attachment = attachment;
        if (status === 'Yes' || status === 'Done' || status === 'Selected' || status === 'Completed') {
          updates.stage3_planned = todayFormatted;
        }
      } else if (stepCode === 'J-3') {
        updates.stage3_actual = todayFormatted;
        updates.stage3_status = status;
        if (attachment) updates.checklist = attachment;
        // Direct jump to J-5 (skipping J-4)
        if (status === 'Yes' || status === 'Done' || status === 'Selected' || status === 'Completed') {
          updates.stage5_planned = todayFormatted;
        }
      } else if (stepCode === 'J-5') {
        updates.stage5_actual = todayFormatted;
        updates.stage5_status = status;
        updates.stage5_update = 'DONE';
        if (laptopBrandModel) updates.laptop_brand_model = laptopBrandModel;
        if (assets) updates.assets = assets;
        if (mobileBrandSim) updates.mobile_brand_sim = mobileBrandSim;
        if (gmailId) updates.gmail_id = gmailId;
      }

      await supabase
        .from('joining_fms')
        .update(updates)
        .or(`id.eq.${uniqueId},candidate_name.eq.${uniqueId},employee_code.eq.${uniqueId},indent_no.eq.${uniqueId}`);
    }

    // 4. Cascade sync to fms (for PO-1, PO-2, PO-3)
    if (stepCode && stepCode.startsWith('PO-')) {
      const updates = { updated_at: new Date().toISOString() };
      if (stepCode === 'PO-1') {
        updates.stage1_actual = todayFormatted;
        updates.stage1_status = status;
        if (onlinePlatform) updates.online_platform = onlinePlatform;
        if (attachment) updates.online_platform_attachments = attachment;
      } else if (stepCode === 'PO-2') {
        updates.stage2_actual = todayFormatted;
        updates.stage2_status = status;
        if (jobConsultancy) updates.job_consultancy = jobConsultancy;
        if (contactPersonName) updates.contact_person_name = contactPersonName;
        if (contactNo) updates.contact_no = contactNo;
      } else if (stepCode === 'PO-3') {
        updates.stage3_actual = todayFormatted;
        updates.stage3_status = status;
        if (screenshot) updates.screenshot = screenshot;
      }

      await supabase
        .from('fms')
        .update(updates)
        .eq('indent_no', uniqueId);
    }

    return { success: true };
  } catch (err) {
    console.error("recordDataResponse error:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Record Final Selection (Inserts/Updates final_selection table and syncs FMS selected candidate name)
 * @param {object} params - { id, name, salary, dp, indentNo, candidateId, joiningDate, status }
 */
export const recordFinalSelection = async ({
  id,
  name,
  salary,
  dp,
  indentNo,
  candidateId,
  joiningDate,
  status = 'Selected'
}) => {
  try {
    const finalId = id || (indentNo ? `${indentNo}_${dp || 'Position'}` : `FS_${Date.now()}`);
    
    // 1. Upsert into final_selection table
    const payload = {
      id: finalId,
      name: name || '',
      salary: salary ? parseFloat(salary) || 0 : 0,
      dp: dp || '',
      indent_no: indentNo || '',
      candidate_id: candidateId || '',
      joining_date: joiningDate || '',
      status: status || 'Selected',
      updated_at: new Date().toISOString()
    };

    const { error: fsError } = await supabase
      .from('final_selection')
      .upsert(payload, { onConflict: 'id' });

    if (fsError) throw fsError;

    // 2. Lookup & update FMS with Selected Candidate Name if indentNo is present
    if (indentNo) {
      await supabase
        .from('fms')
        .update({
          selected_candidate_name: name,
          updated_at: new Date().toISOString()
        })
        .eq('indent_no', indentNo);
    }

    return { success: true };
  } catch (err) {
    console.error("recordFinalSelection error:", err);
    return { success: false, error: err.message };
  }
};

export { supabase };


