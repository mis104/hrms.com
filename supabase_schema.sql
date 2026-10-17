-- ==============================================================================
-- 🚀 PIRAMAL HRMS - COMPLETE 1-CLICK MASTER DATABASE SETUP FOR SUPABASE
-- ==============================================================================
-- Instructions:
-- 1. Open Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Go to your Project -> SQL Editor
-- 3. Click "New query"
-- 4. Paste this ENTIRE script and click "Run" (Ctrl + Enter)
-- 5. Result: All 21 tables, columns, indexes, RLS security policies,
--    and initial seed data (Admin user, HOD Matrix, Dropdowns, Templates)
--    will be created / updated instantly!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSIONS & TRIGGER FUNCTIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. USERS & AUTHENTICATION TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    admin TEXT DEFAULT 'No',                    -- 'Yes', 'No', or 'Employee'
    pages_access TEXT DEFAULT '',               -- Accessible modules
    manual TEXT DEFAULT 'No',                   -- Manual punch enabled
    profile TEXT,                               -- Cloudinary photo URL
    employee_type TEXT DEFAULT 'Staff',         -- 'Staff', 'Worker', etc.
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    range NUMERIC DEFAULT 100,                  -- Geofence radius in meters
    time_in TEXT,                               -- e.g. '09:00 AM'
    time_out TEXT,                              -- e.g. '06:00 PM'
    category TEXT,
    employee_status TEXT DEFAULT 'Active',      -- 'Active', 'Left', 'Terminated'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(employee_status);

-- ------------------------------------------------------------------------------
-- 2. ATTENDANCE TABLE (DAILY BIOMETRIC & MOBILE PUNCHES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestampe TEXT,                            -- Legacy timestamp string
    date_and_time TEXT,
    end_date TEXT,
    status TEXT,                                -- 'P', 'A', 'WO', 'HD', 'PRESENT', etc.
    reason TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    map_link TEXT,
    address TEXT,
    person_name TEXT NOT NULL,
    date TEXT NOT NULL,                         -- 'DD-MM-YYYY' or 'YYYY-MM-DD'
    time TEXT,                                  -- 'HH:mm:ss'
    year_name TEXT,
    month_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_person_name ON public.attendance(person_name);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_month_year ON public.attendance(month_name, year_name);

-- ------------------------------------------------------------------------------
-- 3. LEAVE REQUESTS TABLE (APPLICATIONS & 1-CLICK APPROVALS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id BIGSERIAL PRIMARY KEY,
    timestamp TEXT,
    leave_request_no TEXT,                      -- e.g. 'LR-01', 'LR-309'
    requested_by TEXT NOT NULL,
    department TEXT,
    total_leaves NUMERIC(5, 1) DEFAULT 1,
    job_location TEXT,
    leave_from_date TEXT NOT NULL,
    leave_to_date TEXT NOT NULL,
    leave_reason TEXT,
    remark TEXT,
    image_url TEXT,
    approval_planned TEXT,
    approval_actual TEXT,
    approval_delay TEXT,
    approved_by TEXT,
    approval_status TEXT DEFAULT 'Pending',     -- 'Pending', 'Approved', 'Rejected'
    approval_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_no ON public.leave_requests(leave_request_no);
CREATE INDEX IF NOT EXISTS idx_leave_requests_requested_by ON public.leave_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(approval_status);

-- ------------------------------------------------------------------------------
-- 4. JOINING FMS (EMPLOYEES ONBOARDING & MASTER DIRECTORY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.joining_fms (
    id BIGSERIAL PRIMARY KEY,
    employee_code TEXT,                         -- e.g. 'PPPL/EI/60'
    candidate_name TEXT NOT NULL,
    finalized_salary TEXT,
    update_link TEXT DEFAULT 'Pending',
    timestamp TEXT,
    name_as_per_aadhar TEXT,
    father_name TEXT,
    date_of_joining TEXT,
    joining_place TEXT,
    designation TEXT,
    salary TEXT,
    aadhar_frontside_photo TEXT,
    pan_card TEXT,
    candidate_photo TEXT,
    current_address TEXT,
    address_as_per_aadhar_card TEXT,
    dob_as_per_aadhar TEXT,
    gender TEXT,
    mobile_no TEXT,
    family_mobile_no TEXT,
    relationship_with_family_person TEXT,
    past_pf_id_no TEXT,
    current_bank_ac_no TEXT,
    ifsc_code TEXT,
    branch_name TEXT,
    photo_of_front_bank_passbook TEXT,
    personal_email_id TEXT,
    esic_no TEXT,
    highest_qualification TEXT,
    aadhar_card_no TEXT,
    qualification_photo TEXT,
    salary_slip TEXT,
    resume_cv_upload TEXT,
    stage1_planned TEXT,
    stage1_actual TEXT,
    stage1_status TEXT,
    stage1_time_delay TEXT,
    stage2_planned TEXT,
    stage2_actual TEXT,
    stage2_status TEXT,
    letter_attachment TEXT,
    stage2_time_delay TEXT,
    stage3_planned TEXT,
    stage3_actual TEXT,
    stage3_status TEXT,
    checklist TEXT,
    stage3_time_delay TEXT,
    stage4_planned TEXT,
    stage4_actual TEXT,
    stage4_status TEXT,
    stage4_time_delay TEXT,
    stage5_planned TEXT,
    stage5_actual TEXT,
    stage5_status TEXT,
    stage5_update TEXT,
    laptop_brand_model TEXT,
    assets TEXT,
    mobile_brand_sim TEXT,
    gmail_id TEXT,
    leave TEXT,
    indent_no TEXT,
    lookup_designation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_joining_fms_code ON public.joining_fms(employee_code);
CREATE INDEX IF NOT EXISTS idx_joining_fms_name ON public.joining_fms(candidate_name);
CREATE INDEX IF NOT EXISTS idx_joining_fms_indent ON public.joining_fms(indent_no);

-- ------------------------------------------------------------------------------
-- 5. LEAVING FMS (EMPLOYEE RESIGNATIONS & EXIT MANAGEMENT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaving_fms (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT,
    timestamp TEXT,
    last_working_day TEXT,
    reason_for_resignation TEXT,
    salary TEXT,
    candidate_name TEXT NOT NULL,
    designation TEXT,
    mobile_no TEXT,
    family_mobile_no TEXT,
    relationship_with_family_person TEXT,
    past_pf_id_no TEXT,
    current_bank_ac_no TEXT,
    ifsc_code TEXT,
    branch_name TEXT,
    photo_of_front_bank_passbook TEXT,
    personal_email_id TEXT,
    esic_no TEXT,
    highest_qualification TEXT,
    aadhar_card_no TEXT,
    qualification_photo TEXT,
    salary_slip TEXT,
    resume_cv_upload TEXT,
    ex1_planned TEXT,
    ex1_actual TEXT,
    ex1_status TEXT,
    ex1_time_delay TEXT,
    ex2_planned TEXT,
    ex2_actual TEXT,
    ex2_status TEXT,
    ex2_time_delay TEXT,
    ex3_planned TEXT,
    ex3_actual TEXT,
    ex3_status TEXT,
    ex3_exit_checklist TEXT,
    ex3_time_delay TEXT,
    ex4_planned TEXT,
    ex4_actual TEXT,
    ex4_status TEXT,
    ex4_time_delay TEXT,
    leaving TEXT,
    exit_checklist TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaving_fms_emp_id ON public.leaving_fms(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaving_fms_name ON public.leaving_fms(candidate_name);

-- ------------------------------------------------------------------------------
-- 6. LOCAL TRAVEL IN/OUT TABLE (LOCAL CONVEYANCE & VEHICLE RUNNING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_in_out (
    id BIGSERIAL PRIMARY KEY,
    timestamp TEXT,
    serial_no TEXT,
    person_name TEXT NOT NULL,
    from_location TEXT,
    to_location TEXT,
    in_vehicle_type TEXT,
    in_vehicle_mtr_number TEXT,
    total_running_km TEXT,
    in_vehicle_mtr_pic TEXT,
    date TEXT,
    in_remarks TEXT,
    in_vehicle_amount TEXT,
    planned TEXT,
    actual TEXT,
    time_delay TEXT,
    return_date TEXT,
    out_vehicle_type TEXT,
    out_vehicle_mtr_number TEXT,
    vehical_mtr_pic TEXT,
    remarks TEXT,
    vehicle_amount TEXT,
    gmail_id TEXT,
    db TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_person ON public.travel_in_out(person_name);
CREATE INDEX IF NOT EXISTS idx_travel_return_date ON public.travel_in_out(return_date);

-- ------------------------------------------------------------------------------
-- 7. OUTSTATION TRAVELING TABLE (TOUR, STAY, FOOD & TA/DA DETAILS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outstation_traveling (
    id BIGSERIAL PRIMARY KEY,
    serial_no TEXT,
    timestamp TEXT,
    name TEXT NOT NULL,
    from_location TEXT,
    to_location TEXT,
    vehicle_type TEXT,
    stay_date TEXT,
    accommadation_type TEXT,
    travel_date TEXT,
    stay_bill TEXT,
    fooding_date TEXT,
    fooding_bill TEXT,
    travel_receipt TEXT,
    local_travel_type TEXT,
    local_travel_receipt TEXT,
    return_date TEXT,
    return_ticket TEXT,
    advance_amount TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outstation_name ON public.outstation_traveling(name);
CREATE INDEX IF NOT EXISTS idx_outstation_serial ON public.outstation_traveling(serial_no);

-- ------------------------------------------------------------------------------
-- 8. ADVANCE REQUESTS TABLE (EMPLOYEE TRAVEL & SALARY ADVANCE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advance (
    id BIGSERIAL PRIMARY KEY,
    timestamp TEXT,
    serial_no TEXT,
    person_name TEXT NOT NULL,
    from_location TEXT,
    to_location TEXT,
    start_date TEXT,
    end_date TEXT,
    travel_type TEXT,
    advance NUMERIC DEFAULT 0,
    company_name TEXT,
    remarks TEXT,
    planned TEXT,
    actual TEXT,
    delay TEXT,
    status TEXT DEFAULT 'Pending',             -- 'Pending', 'Approved', 'Rejected'
    remarks1 TEXT,
    approved_by TEXT DEFAULT 'Neha Garg',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advance_person ON public.advance(person_name);
CREATE INDEX IF NOT EXISTS idx_advance_status ON public.advance(status);
CREATE INDEX IF NOT EXISTS idx_advance_approved_by ON public.advance(approved_by);

-- ------------------------------------------------------------------------------
-- 9. RECRUITMENT FMS (INDENTS & OPEN VACANCIES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_status TEXT DEFAULT 'Open',        -- 'Open', 'Closed', 'Hold'
    location TEXT,
    timestamp TEXT,
    indent_no TEXT UNIQUE NOT NULL,             -- e.g. 'IN-01'
    person_name TEXT,
    post TEXT,
    salary TEXT,
    office_timing TEXT,
    types_of_weekly_off TEXT,
    residence TEXT,
    gender TEXT,
    department TEXT,
    prefer TEXT,
    number_of_post INT DEFAULT 1,
    completion_date TEXT,
    required_qualifications TEXT,
    stage1_planned TEXT,
    stage1_actual TEXT,
    stage1_status TEXT,
    online_platform TEXT,
    online_platform_attachments TEXT,
    stage1_time_delay TEXT,
    stage2_planned TEXT,
    stage2_actual TEXT,
    stage2_status TEXT,
    job_consultancy TEXT,
    contact_person_name TEXT,
    contact_no TEXT,
    stage2_time_delay TEXT,
    stage3_planned TEXT,
    stage3_actual TEXT,
    stage3_status TEXT,
    screenshot TEXT,
    stage3_time_delay TEXT,
    selected_candidate_name TEXT,
    finalized_salary TEXT,
    indent_close_status TEXT,
    closer_status TEXT,
    priority TEXT DEFAULT 'Normal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fms_indent_no ON public.fms(indent_no);
CREATE INDEX IF NOT EXISTS idx_fms_status ON public.fms(position_status);

-- ------------------------------------------------------------------------------
-- 10. CANDIDATE SELECTION (INTERVIEWS & CANDIDATE PIPELINE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidate_selection (
    id BIGSERIAL PRIMARY KEY,
    timestamp TEXT,
    candidate_id TEXT,                          -- e.g. 'CD-101'
    open_position_department TEXT,
    designation TEXT,
    name_of_candidate TEXT NOT NULL,
    contact_no TEXT,
    mail_id TEXT,
    age TEXT,
    highest_qualification TEXT,
    native_place TEXT,
    current_working_location TEXT,
    current_employment_status TEXT,
    current_company TEXT,
    current_designation TEXT,
    tenure_with_current_company TEXT,
    total_work_experience TEXT,
    current_ctc TEXT,
    expected_ctc TEXT,
    notice_period TEXT,
    interview_date_with_hr_spoc TEXT,
    resume_url TEXT,
    stage1_planned TEXT,
    stage1_actual TEXT,
    stage1_status TEXT DEFAULT 'Pending',
    stage1_time_delay TEXT,
    stage2_planned TEXT,
    stage2_actual TEXT,
    stage2_status TEXT,
    stage2_time_delay TEXT,
    stage3_planned TEXT,
    stage3_actual TEXT,
    stage3_status TEXT,
    finalized_salary TEXT,
    stage3_time_delay TEXT,
    stage4_planned TEXT,
    stage4_actual TEXT,
    stage4_status TEXT,
    joining_date TEXT,
    stage4_time_delay TEXT,
    id_name TEXT,
    lookup_designation TEXT,
    indent_and_name TEXT,
    entry_by TEXT,
    stage1_remarks TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cand_selection_candidate_id ON public.candidate_selection(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_selection_name ON public.candidate_selection(name_of_candidate);

-- ------------------------------------------------------------------------------
-- 11. CALLING & INTERVIEW TRACKING TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calling_tracking (
    id BIGSERIAL PRIMARY KEY,
    timestamp TEXT,
    task_id TEXT,
    entry_by TEXT,
    applicant_name TEXT NOT NULL,
    contact_no TEXT,
    role TEXT,
    portal_used TEXT,
    location TEXT,
    stage TEXT,
    notes TEXT,
    feedback TEXT,
    status TEXT,
    interview_status TEXT,
    interview_date TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calling_applicant ON public.calling_tracking(applicant_name);
CREATE INDEX IF NOT EXISTS idx_calling_contact ON public.calling_tracking(contact_no);

-- ------------------------------------------------------------------------------
-- 12. FINAL CANDIDATE SELECTION TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.final_selection (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    salary TEXT,
    dp TEXT,
    indent_no TEXT,
    candidate_id TEXT,
    joining_date TEXT,
    status TEXT DEFAULT 'Selected',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_final_selection_name ON public.final_selection(name);

-- ------------------------------------------------------------------------------
-- 13. CANDIDATE REFERENCE CHECK TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reference (
    id BIGSERIAL PRIMARY KEY,
    date TEXT,
    candidate_name TEXT NOT NULL,
    ref_person_name TEXT,
    number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 14. COMPANY ASSETS ASSIGNMENT & RETURN TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_assets (
    id BIGSERIAL PRIMARY KEY,
    timestamp TEXT,
    employee_name TEXT NOT NULL,
    product TEXT,
    asset_type TEXT,
    quantity TEXT,
    reason TEXT,
    remark TEXT,
    image TEXT,
    return_date TEXT,
    return_image TEXT,
    return_remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_assets_emp ON public.company_assets(employee_name);

-- ------------------------------------------------------------------------------
-- 15. DATA RESPONSE (PIPELINE STEP EVENT AUDIT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_response (
    id BIGSERIAL PRIMARY KEY,
    unique_id TEXT NOT NULL,
    step_code TEXT NOT NULL,                    -- 'PO-1', 'PO-2', 'CS-1', 'J-1', etc.
    timestamp TEXT NOT NULL,
    status TEXT,
    online_platform TEXT,
    attachment TEXT,
    job_consultancy TEXT,
    job_consultancy_attachment TEXT,
    screenshot TEXT,
    finalized_salary TEXT,
    joining_date TEXT,
    contact_person_name TEXT,
    contact_no TEXT,
    customer_says TEXT,
    next_follow_up_date TEXT,
    checklist TEXT,
    laptop_brand_model TEXT,
    mobile_brand_sim TEXT,
    gmail_id TEXT,
    assets TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_response_uid ON public.data_response(unique_id);
CREATE INDEX IF NOT EXISTS idx_data_response_step ON public.data_response(step_code);

-- ------------------------------------------------------------------------------
-- 16. ONBOARD AND STATUS (COMPANY UPDATES & FEED STORIES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboard_and_status (
    id BIGSERIAL PRIMARY KEY,
    date TEXT NOT NULL,                         -- 'DD-MM-YYYY'
    image TEXT,                                 -- Banner / photo URL
    sms TEXT,                                   -- Post caption or announcement
    sms_type TEXT DEFAULT 'Announcement',       -- 'Birthday', 'New Joining', 'Festival'
    name TEXT,                                  -- Person name
    designation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboard_status_date ON public.onboard_and_status(date);

-- ------------------------------------------------------------------------------
-- 17. HOD MASTER (DEPARTMENT APPROVERS & WHATSAPP ROUTING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hod_master (
    id BIGSERIAL PRIMARY KEY,
    department TEXT NOT NULL,
    hod_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    hod_phone TEXT,
    hod_email TEXT,
    username TEXT,
    approval_types TEXT[] DEFAULT ARRAY['Leave Application']::TEXT[],
    send_sms BOOLEAN DEFAULT TRUE,
    send_whatsapp BOOLEAN DEFAULT TRUE,
    send_email BOOLEAN DEFAULT FALSE,
    level INT DEFAULT 1,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hod_dept ON public.hod_master(department);
CREATE INDEX IF NOT EXISTS idx_hod_name ON public.hod_master(hod_name);

-- ------------------------------------------------------------------------------
-- 18. WHATSAPP & SMS CONFIGURATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id BIGSERIAL PRIMARY KEY,
    active_provider TEXT DEFAULT 'maytapi',     -- 'maytapi' or 'meta'
    is_enabled BOOLEAN DEFAULT true,
    sender_phone TEXT DEFAULT '+91 70899 35002',
    sender_name TEXT DEFAULT 'Piramal HRMS Alert',
    meta_waba_id TEXT,
    meta_phone_number_id TEXT,
    meta_access_token TEXT,
    meta_api_version TEXT DEFAULT 'v20.0',
    meta_webhook_verify_token TEXT DEFAULT 'piramal_secure_webhook_2026',
    maytapi_product_id TEXT,
    maytapi_phone_id TEXT,
    maytapi_token TEXT,
    maytapi_base_url TEXT DEFAULT 'https://api.maytapi.com/api',
    auto_send_on_leave_request BOOLEAN DEFAULT true,
    auto_send_on_leave_approval BOOLEAN DEFAULT true,
    auto_send_on_leave_rejection BOOLEAN DEFAULT true,
    auto_send_on_interview_scheduled BOOLEAN DEFAULT true,
    auto_send_on_gate_pass BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 19. WHATSAPP & SMS DISPATCH LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id TEXT PRIMARY KEY,
    recipient_name TEXT,
    recipient_phone TEXT NOT NULL,
    event_type TEXT,
    template_name TEXT,
    provider TEXT,
    message_body TEXT,
    status TEXT DEFAULT 'delivered',
    status_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_phone ON public.whatsapp_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_wa_logs_event ON public.whatsapp_logs(event_type);

-- ------------------------------------------------------------------------------
-- 20. WHATSAPP MESSAGE TEMPLATES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    trigger_event TEXT,
    provider TEXT DEFAULT 'all',
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 21. MASTER DROPDOWNS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_dropdowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indenter_name TEXT,
    department TEXT,
    timing TEXT,
    social_site_type TEXT,
    flw_up_status TEXT,
    entry_by TEXT,
    cunsultancy_name TEXT,
    candidate_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 22. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 21 TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joining_fms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaving_fms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_in_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outstation_traveling ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_response ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboard_and_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hod_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_dropdowns ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 23. CREATE OPEN ACCESS POLICIES FOR SUPABASE ANON / AUTH ROLES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'users', 'attendance', 'leave_requests', 'joining_fms', 'leaving_fms',
        'travel_in_out', 'outstation_traveling', 'advance', 'fms',
        'candidate_selection', 'calling_tracking', 'final_selection', 'reference',
        'company_assets', 'data_response', 'onboard_and_status', 'hod_master',
        'whatsapp_settings', 'whatsapp_logs', 'whatsapp_templates', 'master_dropdowns'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Public access policy" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role;', tbl);
    END LOOP;
END $$;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 24. ATTACH AUTO-UPDATE TIMESTAMP TRIGGERS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables_with_updated_at text[] := ARRAY[
        'users', 'attendance', 'leave_requests', 'joining_fms', 'leaving_fms',
        'travel_in_out', 'outstation_traveling', 'advance', 'fms',
        'candidate_selection', 'calling_tracking', 'final_selection', 'reference',
        'company_assets', 'data_response', 'onboard_and_status', 'hod_master',
        'whatsapp_settings', 'whatsapp_templates', 'master_dropdowns'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_with_updated_at LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_timestamp_%I ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trg_set_timestamp_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- 25. INITIAL SEED DATA (CLONE-READY DEFAULT CONFIGURATIONS)
-- ==============================================================================

-- 1. Default Super Admin User (admin / 123)
INSERT INTO public.users (name, username, password, admin, pages_access, manual, employee_status)
VALUES (
    'System Administrator',
    'admin',
    '123',
    'Yes',
    'Dashboard, Recruitment Management, Onboarding Management, Employee Management, Assets Management, Attendance Management, Leave Management, Exit Management, User & Access Management',
    'Yes',
    'Active'
)
ON CONFLICT (username) DO NOTHING;

-- 2. Default HOD Approvers Matrix (Including Neha Garg as default Approver)
INSERT INTO public.hod_master (department, hod_name, phone_number, hod_phone, approval_types, send_sms, send_whatsapp, status)
VALUES
    ('Sales Head', 'Neha Garg', '9201958125,8982944569,9201959189', '9201958125,8982944569,9201959189', ARRAY['Leave Application', 'Advance Request'], true, true, 'Active'),
    ('Sales', 'Neha Garg', '9201958125,8982944569,9201959189', '9201958125,8982944569,9201959189', ARRAY['Leave Application', 'Advance Request'], true, true, 'Active'),
    ('Sales Head', 'Vaibhav Agrawal', '9329121512', '9329121512', ARRAY['Leave Application'], true, true, 'Active'),
    ('MDO', 'Varsha Pandey', '9201959184,9203401731,9201959189', '9201959184,9203401731,9201959189', ARRAY['Leave Application'], true, true, 'Active'),
    ('Directors', 'Varsha Pandey', '9201959189', '9201959189', ARRAY['Leave Application'], true, true, 'Active'),
    ('Accounts', 'Satbeer SIngh', '9201959184,9203401731,8982944569', '9201959184,9203401731,8982944569', ARRAY['Leave Application'], true, true, 'Active'),
    ('Plants', 'Rahul Sir', '9993831316,90981973958,8871030498', '9993831316,90981973958,8871030498', ARRAY['Leave Application'], true, true, 'Active')
ON CONFLICT DO NOTHING;

-- 3. Default WhatsApp Gateway Configuration (Maytapi Ready)
INSERT INTO public.whatsapp_settings (
    id, active_provider, is_enabled, sender_phone, sender_name,
    maytapi_product_id, maytapi_phone_id, maytapi_token, maytapi_base_url,
    auto_send_on_leave_request, auto_send_on_leave_approval, auto_send_on_leave_rejection
)
VALUES (
    1,
    'maytapi',
    true,
    '+91 70899 35002',
    'Piramal HRMS Alert',
    'ccfa596e-4020-4e5b-b4c7-dab84d18fb98',
    '109164',
    '9f4910f9-d04b-4ed9-be17-fc1b11a7d9d7',
    'https://api.maytapi.com/api',
    true,
    true,
    true
)
ON CONFLICT (id) DO UPDATE SET
    sender_phone = EXCLUDED.sender_phone,
    sender_name = EXCLUDED.sender_name;

-- 4. Default WhatsApp Message Templates
INSERT INTO public.whatsapp_templates (id, name, category, trigger_event, provider, body, is_active)
VALUES
    (
        'tmpl_leave_req',
        'Leave Approval Request (To Manager)',
        'Leave Management',
        'leave_request',
        'all',
        '📢 *Leave Approval Request*' || E'\n\n' ||
        '🆔 *LR No.:* $(LR-Unique No.)' || E'\n' ||
        '👤 *Request By:* $(Name of Employee)' || E'\n' ||
        '💼 *Department:* $(Designation)' || E'\n' ||
        '📍 *Job Location:* $(Job location)' || E'\n\n' ||
        '🗓️ *Leave Duration:* $(Date of leave FROM) ➡️ $(TO)' || E'\n' ||
        '📆 *Total Days:* $(Total No of leaves days)' || E'\n' ||
        '📝 *Reason:* $(Reason for Taking Leave)' || E'\n\n' ||
        '🔍 *Remark:* $(Remark)' || E'\n\n' ||
        '🕘 A leave request has been submitted for your approval.' || E'\n' ||
        'Please review and approve using the link below 👇' || E'\n' ||
        '🔗 *Approval Link:* $(Approved Link)' || E'\n\n' ||
        'Regards,' || E'\n' ||
        '💼 *Piramal Petroleum Pvt. Ltd.*',
        true
    ),
    (
        'tmpl_leave_app',
        'Leave Request Approved (To Employee)',
        'Leave Management',
        'leave_approval',
        'all',
        '👋 Hello $(Name of Employee),' || E'\n\n' ||
        '🧾 *Designation:* $(Designation)' || E'\n' ||
        '🗓️ *Leave:* $(Date of leave FROM) ➡️ $(TO)' || E'\n' ||
        '📅 *Days:* $(Total No of leaves days)' || E'\n' ||
        '💬 *Reason:* $(Reason for Taking Leave)' || E'\n\n' ||
        '🔖 *Status:* *Approved*' || E'\n' ||
        '✅ *Approved By:* $(Approved By)' || E'\n\n' ||
        'Regards,' || E'\n' ||
        '*Piramal Petroleum Pvt. Ltd.*',
        true
    ),
    (
        'tmpl_leave_rej',
        'Leave Request Rejected (To Employee)',
        'Leave Management',
        'leave_rejection',
        'all',
        '👋 Hello $(Name of Employee),' || E'\n\n' ||
        '🧾 *Designation:* $(Designation)' || E'\n' ||
        '🗓️ *Leave:* $(Date of leave FROM) ➡️ $(TO)' || E'\n' ||
        '📅 *Days:* $(Total No of leaves days)' || E'\n' ||
        '💬 *Reason:* $(Reason for Taking Leave)' || E'\n\n' ||
        '🔖 *Status:* *Rejected*' || E'\n' ||
        '❌ *Decision By:* $(Approved By)' || E'\n\n' ||
        'Regards,' || E'\n' ||
        '*Piramal Petroleum Pvt. Ltd.*',
        true
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Default Master Dropdown Values
INSERT INTO public.master_dropdowns (indenter_name, department, timing, social_site_type, flw_up_status, entry_by, cunsultancy_name, candidate_status)
VALUES
    ('Admin', 'Sales Head', '09:00 AM - 06:00 PM', 'LinkedIn', 'Done', 'HR Team', 'Direct', 'Selected'),
    ('HR Manager', 'Accounts', '09:30 AM - 06:30 PM', 'Naukri.com', 'Pending', 'Admin', 'Consultant A', 'Shortlisted'),
    ('Operations Head', 'Plants', '10:00 AM - 07:00 PM', 'Indeed', 'In Progress', 'HR Team', 'Consultant B', 'Interview Scheduled')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- ✅ SCHEMA CREATION COMPLETED SUCCESSFULLY!
-- ==============================================================================
