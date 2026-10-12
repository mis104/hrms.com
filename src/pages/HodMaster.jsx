import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ShieldCheck,
  UserCheck,
  Bell,
  Smartphone,
  Mail,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ChevronDown,
  Check,
  Layers,
  Users,
  Building2,
  Sparkles,
  Copy,
  Download,
  Phone,
  MessageSquare,
  Send,
  Database,
  ArrowRight,
  Eye,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { supabase } from "../services/supabaseClient";

// Pre-defined Approval Modules
export const APPROVAL_MODULES = [
  { id: "Leave Application", label: "Leave Application", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Advance Request", label: "Travel Advance Request", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Outstation Travel", label: "Outstation Travel (TA & DA)", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "Local Travel", label: "Local Travel (IN / OUT)", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "Gate Pass", label: "Gate Pass Request", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "Company Assets", label: "Company Assets Issue", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export const DEFAULT_DEPARTMENTS = [
  "Sales Head",
  "MDO",
  "Directors",
  "Accounts",
  "Plants",
  "Sales",
  "Production",
  "Maintenance",
  "Quality Control",
  "Accounts & Finance",
  "Human Resources",
  "Purchase & Procurement",
  "IT & Systems",
  "Logistics & Dispatch",
  "Marketing",
  "Administration",
  "Operations",
  "General / All",
];

const LOCAL_STORAGE_KEY = "piramal_hod_master_cache_v1";

const SQL_SCHEMA_CODE = `-- ============================================================
-- SQL TO CREATE 'hod_master' TABLE IN SUPABASE ACCORDING TO EXCEL
-- Columns: Department, HOD Name, Phone Number (+ Approval SMS flags)
-- ============================================================

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

-- Enable Row Level Security (RLS)
ALTER TABLE public.hod_master ENABLE ROW LEVEL SECURITY;

-- Allow policies for HRMS
DROP POLICY IF EXISTS "Allow public select hod_master" ON public.hod_master;
CREATE POLICY "Allow public select hod_master" ON public.hod_master FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert hod_master" ON public.hod_master;
CREATE POLICY "Allow public insert hod_master" ON public.hod_master FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update hod_master" ON public.hod_master;
CREATE POLICY "Allow public update hod_master" ON public.hod_master FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete hod_master" ON public.hod_master;
CREATE POLICY "Allow public delete hod_master" ON public.hod_master FOR DELETE USING (true);

-- Grant Table Permissions
GRANT ALL ON TABLE public.hod_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.hod_master_id_seq TO anon, authenticated, service_role;

-- Insert Initial Data specifically for Leave Application Approval
INSERT INTO public.hod_master (department, hod_name, phone_number, hod_phone, approval_types, send_sms, send_whatsapp, status)
VALUES
  ('Sales Head', 'Vaibhav Agrawal', '9329121512', '9329121512', ARRAY['Leave Application'], true, true, 'Active'),
  ('MDO', 'Varsha Pandey', '9201959184,9203401731,9201959189', '9201959184,9203401731,9201959189', ARRAY['Leave Application'], true, true, 'Active'),
  ('Directors', 'Varsha Pandey', '9201959189', '9201959189', ARRAY['Leave Application'], true, true, 'Active'),
  ('Accounts', 'Satbeer SIngh', '9201959184,9203401731,8982944569', '9201959184,9203401731,8982944569', ARRAY['Leave Application'], true, true, 'Active'),
  ('Plants', 'Rahul Sir', '9993831316,90981973958,8871030498', '9993831316,90981973958,8871030498', ARRAY['Leave Application'], true, true, 'Active'),
  ('Sales', 'Neha Garg', '9201959184,9203401731,8982944569', '9201959184,9203401731,8982944569', ARRAY['Leave Application'], true, true, 'Active'),
  -- Travel Advance Request Approver for Sales Head
  ('Sales Head', 'Neha Garg', '9201958125,8982944569,9201959189', '9201958125,8982944569,9201959189', ARRAY['Advance Request'], true, true, 'Active')
ON CONFLICT DO NOTHING;
`;

const HodMaster = () => {
  const [hodList, setHodList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  const [systemUsers, setSystemUsers] = useState([]);
  const [departmentsList, setDepartmentsList] = useState(DEFAULT_DEPARTMENTS);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHod, setEditingHod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [testSmsModal, setTestSmsModal] = useState(null);
  const [templateModal, setTemplateModal] = useState(null);

  // Form State
  const [form, setForm] = useState({
    department: "Sales",
    customDepartment: "",
    hod_name: "",
    hod_phone: "",
    hod_email: "",
    username: "",
    approval_types: ["Leave Application", "Advance Request"],
    send_sms: true,
    send_whatsapp: true,
    send_email: false,
    level: 1,
    status: "Active",
    notes: "",
  });

  // Fetch Users & Departments for dropdown selection
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const { data: usersData } = await supabase
          .from("users")
          .select("name, username, phone, mobile, contact_no, email, department")
          .limit(200);

        if (usersData && usersData.length > 0) {
          setSystemUsers(usersData);
          const deptFromUsers = usersData
            .map((u) => u.department)
            .filter(Boolean)
            .map((d) => d.trim());
          setDepartmentsList((prev) => Array.from(new Set([...prev, ...deptFromUsers])));
        }
      } catch (err) {
        console.warn("User lookup note:", err);
      }
    };
    fetchDropdownOptions();
  }, []);

  // Fetch HODs from Supabase
  const fetchHodList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hod_master")
        .select("*")
        .order("department", { ascending: true });

      if (error) {
        // Table doesn't exist yet in Supabase or error
        if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
          setDbConnected(false);
          // Load from LocalStorage fallback
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (cached) {
            setHodList(JSON.parse(cached));
          }
        } else {
          throw error;
        }
      } else {
        setDbConnected(true);
        setHodList(data || []);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data || []));
      }
    } catch (err) {
      console.error("HOD Master fetch error:", err);
      toast.error("Failed to load HOD Master: " + err.message);
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) setHodList(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHodList();
  }, []);

  // Handle Form Open (New or Edit)
  const openForm = (hod = null) => {
    if (hod) {
      setEditingHod(hod);
      const isCustomDept = !DEFAULT_DEPARTMENTS.includes(hod.department);
      setForm({
        department: isCustomDept ? "Other" : hod.department,
        customDepartment: isCustomDept ? hod.department : "",
        hod_name: hod.hod_name || "",
        hod_phone: hod.hod_phone || hod.phone_number || "",
        hod_email: hod.hod_email || "",
        username: hod.username || "",
        approval_types: Array.isArray(hod.approval_types) ? hod.approval_types : ["Leave Application"],
        send_sms: hod.send_sms !== false,
        send_whatsapp: hod.send_whatsapp !== false,
        send_email: hod.send_email === true,
        level: hod.level || 1,
        status: hod.status || "Active",
        notes: hod.notes || "",
      });
    } else {
      setEditingHod(null);
      setForm({
        department: "Sales",
        customDepartment: "",
        hod_name: "",
        hod_phone: "",
        hod_email: "",
        username: "",
        approval_types: ["Leave Application", "Advance Request"],
        send_sms: true,
        send_whatsapp: true,
        send_email: false,
        level: 1,
        status: "Active",
        notes: "",
      });
    }
    setModalOpen(true);
  };

  // Handle User Dropdown Selection (Auto-fill Name, Phone, Email)
  const handleSelectUser = (e) => {
    const selectedVal = e.target.value;
    if (!selectedVal) return;

    const matchedUser = systemUsers.find(
      (u) => u.name === selectedVal || u.username === selectedVal
    );

    if (matchedUser) {
      setForm((prev) => ({
        ...prev,
        hod_name: matchedUser.name || matchedUser.username,
        username: matchedUser.username || "",
        hod_phone: matchedUser.phone || matchedUser.mobile || matchedUser.contact_no || prev.hod_phone,
        hod_email: matchedUser.email || prev.hod_email,
        department: matchedUser.department || prev.department,
      }));
    } else {
      setForm((prev) => ({ ...prev, hod_name: selectedVal }));
    }
  };

  // Toggle Module Selection in Form
  const handleToggleModule = (moduleId) => {
    setForm((prev) => {
      const exists = prev.approval_types.includes(moduleId);
      return {
        ...prev,
        approval_types: exists
          ? prev.approval_types.filter((id) => id !== moduleId)
          : [...prev.approval_types, moduleId],
      };
    });
  };

  // Submit Form (Save or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalDepartment =
      form.department === "Other" ? form.customDepartment.trim() : form.department;

    if (!finalDepartment) {
      toast.error("Please specify a Department.");
      return;
    }
    if (!form.hod_name.trim()) {
      toast.error("Please enter HOD / Approver Name.");
      return;
    }
    if (!form.hod_phone.trim()) {
      toast.error("Please enter a valid Mobile Number for SMS / WhatsApp.");
      return;
    }
    if (form.approval_types.length === 0) {
      toast.error("Please select at least one approval module.");
      return;
    }

    setSaving(true);
    const payload = {
      department: finalDepartment,
      hod_name: form.hod_name.trim(),
      phone_number: form.hod_phone.trim(),
      hod_phone: form.hod_phone.trim(),
      hod_email: form.hod_email.trim() || null,
      username: form.username.trim() || null,
      approval_types: form.approval_types,
      send_sms: form.send_sms,
      send_whatsapp: form.send_whatsapp,
      send_email: form.send_email,
      level: Number(form.level) || 1,
      status: form.status,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (dbConnected) {
        if (editingHod?.id) {
          const { error } = await supabase
            .from("hod_master")
            .update(payload)
            .eq("id", editingHod.id);
          if (error) throw error;
          toast.success("HOD settings updated successfully!");
        } else {
          const { error } = await supabase
            .from("hod_master")
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          toast.success("New HOD Approver added to Supabase!");
        }
        await fetchHodList();
      } else {
        // Fallback local storage
        let updatedList = [];
        if (editingHod?.id) {
          updatedList = hodList.map((h) =>
            h.id === editingHod.id ? { ...h, ...payload } : h
          );
        } else {
          const newEntry = {
            id: Date.now(),
            ...payload,
            created_at: new Date().toISOString(),
          };
          updatedList = [newEntry, ...hodList];
        }
        setHodList(updatedList);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
        toast.success(
          editingHod
            ? "HOD settings updated (local storage)!"
            : "HOD added! (Run the SQL setup to enable live Supabase sync)"
        );
      }

      setModalOpen(false);
    } catch (err) {
      console.error("Save HOD error:", err);
      toast.error("Error saving HOD: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Live Channel (SMS / WhatsApp) directly from Table
  const handleToggleChannel = async (hod, channel) => {
    const updatedVal = !hod[channel];
    const updateObj = { [channel]: updatedVal, updated_at: new Date().toISOString() };

    // Optimistic UI update
    setHodList((prev) =>
      prev.map((item) => (item.id === hod.id ? { ...item, ...updateObj } : item))
    );

    if (dbConnected) {
      try {
        const { error } = await supabase
          .from("hod_master")
          .update(updateObj)
          .eq("id", hod.id);
        if (error) throw error;
        toast.success(
          `${channel === "send_sms" ? "SMS" : "WhatsApp"} ${
            updatedVal ? "Enabled" : "Disabled"
          } for ${hod.hod_name}`
        );
      } catch (err) {
        console.error("Channel toggle error:", err);
        toast.error("Failed to update status in database.");
        fetchHodList();
      }
    } else {
      const updated = hodList.map((item) =>
        item.id === hod.id ? { ...item, ...updateObj } : item
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      toast.success(
        `${channel === "send_sms" ? "SMS" : "WhatsApp"} ${
          updatedVal ? "Enabled" : "Disabled"
        }`
      );
    }
  };

  // One-click update: Set all current HODs to Leave Application approval only
  const handleSetAllToLeaveOnly = async () => {
    try {
      setLoading(true);
      if (dbConnected) {
        const { error } = await supabase
          .from("hod_master")
          .update({
            approval_types: ["Leave Application"],
            updated_at: new Date().toISOString(),
          })
          .gte("id", 0);
        if (error) throw error;
      }
      const updated = hodList.map((h) => ({
        ...h,
        approval_types: ["Leave Application"],
      }));
      setHodList(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      toast.success("Updated! All HODs set to 'Leave Application' approval only.");
      await fetchHodList();
    } catch (err) {
      console.error("Update to leave only error:", err);
      toast.error("Failed to update: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // One-click add: Advance Approval Confirmation Approver (9201958125, 9321691120)
  const handleAddAdvanceConfirmationApprover = async () => {
    try {
      setLoading(true);
      const newEntry = {
        department: "Sales Head",
        hod_name: "Advance Approval Confirmation",
        phone_number: "9201958125,9321691120",
        hod_phone: "9201958125,9321691120",
        approval_types: ["Advance Request"],
        send_sms: true,
        send_whatsapp: true,
        send_email: false,
        status: "Active",
        level: 1,
        notes: "Receives approval & rejection confirmation alert (+ Requester Employee)",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (dbConnected) {
        const { error } = await supabase.from("hod_master").insert([newEntry]);
        if (error) throw error;
      }

      setHodList((prev) => [newEntry, ...prev]);
      toast.success("Added! Advance Confirmation (9201958125, 9321691120) now active.");
      await fetchHodList();
    } catch (err) {
      console.error("Add advance confirmation approver error:", err);
      toast.error("Failed to add: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete HOD
  const handleDelete = async (id) => {
    try {
      if (dbConnected) {
        const { error } = await supabase.from("hod_master").delete().eq("id", id);
        if (error) throw error;
      }
      const updated = hodList.filter((h) => h.id !== id);
      setHodList(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      toast.success("HOD Approver removed successfully.");
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Delete HOD error:", err);
      toast.error("Delete failed: " + err.message);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (hodList.length === 0) {
      toast.error("No HOD records to export.");
      return;
    }
    const exportData = hodList.map((h, i) => ({
      "S.No": i + 1,
      Department: h.department,
      "HOD Name": h.hod_name,
      "Mobile Number": h.hod_phone,
      Email: h.hod_email || "-",
      "Approval Modules": Array.isArray(h.approval_types)
        ? h.approval_types.join(", ")
        : h.approval_types || "-",
      "Send SMS": h.send_sms ? "Yes" : "No",
      "Send WhatsApp": h.send_whatsapp ? "Yes" : "No",
      Level: `Level ${h.level || 1}`,
      Status: h.status || "Active",
      Notes: h.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HOD_Master");
    XLSX.writeFile(wb, `Piramal_HOD_Master_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return hodList.filter((h) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        h.hod_name?.toLowerCase().includes(q) ||
        h.department?.toLowerCase().includes(q) ||
        h.hod_phone?.includes(q) ||
        h.hod_email?.toLowerCase().includes(q) ||
        h.username?.toLowerCase().includes(q);

      const matchDept = departmentFilter === "all" || h.department === departmentFilter;
      const matchStatus = statusFilter === "all" || h.status === statusFilter;
      const matchModule =
        moduleFilter === "all" ||
        (Array.isArray(h.approval_types) && h.approval_types.includes(moduleFilter));

      const matchChannel =
        channelFilter === "all"
          ? true
          : channelFilter === "sms"
          ? h.send_sms
          : channelFilter === "whatsapp"
          ? h.send_whatsapp
          : true;

      return matchSearch && matchDept && matchStatus && matchModule && matchChannel;
    });
  }, [hodList, searchTerm, departmentFilter, statusFilter, moduleFilter, channelFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = hodList.length;
    const active = hodList.filter((h) => h.status === "Active").length;
    const smsActive = hodList.filter((h) => h.send_sms && h.status === "Active").length;
    const whatsappActive = hodList.filter((h) => h.send_whatsapp && h.status === "Active").length;
    const depts = new Set(hodList.map((h) => h.department)).size;
    return { total, active, smsActive, whatsappActive, depts };
  }, [hodList]);

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 bg-[#f8fafc] min-h-screen text-xs antialiased text-slate-800">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Banner with Dark Teal/Slate Gradient */}
        <div className="relative bg-gradient-to-r from-slate-950 via-[#064445] to-teal-950 px-5 py-5 sm:px-6 sm:py-6 text-white overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_70%_50%,rgba(45,212,191,0.18),transparent_70%)] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-400/20 text-teal-300 border border-teal-400/30">
                  <Sparkles size={11} className="text-teal-400" />
                  Approver Notification Matrix
                </span>
                {!dbConnected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Database size={10} /> Local Mode (SQL Pending)
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2.5">
                HOD Master & Approval SMS Settings
              </h1>
              <p className="text-xs text-teal-100/80 mt-1 max-w-2xl leading-relaxed">
                Set up Department HODs and customize who receives automated SMS and WhatsApp approval alerts
                for leave applications, travel advance, gate passes, and expenses.
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer backdrop-blur-xs"
                title="View Supabase SQL schema"
              >
                <Database size={13} className="text-teal-300" />
                <span>SQL Setup</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer backdrop-blur-xs"
              >
                <Download size={13} className="text-teal-300" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={fetchHodList}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? "animate-spin text-teal-300" : "text-teal-300"} />
                <span>Sync</span>
              </button>

              <button
                type="button"
                onClick={handleSetAllToLeaveOnly}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 hover:text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Click to reset all current HODs to Leave Application approval only"
              >
                <CheckCircle2 size={13} className="text-amber-300" />
                <span>Set to Leave Only</span>
              </button>

              <button
                type="button"
                onClick={handleAddAdvanceConfirmationApprover}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 hover:text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Add Advance Approval Confirmation Alert (9201958125, 9321691120)"
              >
                <Plus size={13} className="text-emerald-300" />
                <span>+ Add Advance Confirmation (9201958125, 9321691120)</span>
              </button>

              <button
                type="button"
                onClick={() => openForm()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-teal-500/30 active:scale-95 cursor-pointer"
              >
                <Plus size={15} strokeWidth={3} />
                <span>Add HOD Approver</span>
              </button>
            </div>
          </div>
        </div>

        {/* Database Notice Banner (If table is not yet in Supabase) */}
        {!dbConnected && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900 font-semibold">
                <span className="font-extrabold">Supabase Table Pending:</span> Table{" "}
                <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  public.hod_master
                </code>{" "}
                is not created yet in database. Changes are currently cached locally.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="inline-flex items-center gap-1 text-xs font-black text-amber-800 underline hover:text-amber-950 shrink-0 cursor-pointer"
            >
              <span>Get SQL Script to Create Table</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Approvers
            </span>
            <Users size={15} className="text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{metrics.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{metrics.depts} Departments Configured</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Active HODs
            </span>
            <UserCheck size={15} className="text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">{metrics.active}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Ready for approvals</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              SMS Alerts
            </span>
            <Smartphone size={15} className="text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700">{metrics.smsActive}</div>
          <div className="text-[10px] text-blue-600 mt-0.5">SMS enabled approvers</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
              WhatsApp Alerts
            </span>
            <MessageSquare size={15} className="text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-700">{metrics.whatsappActive}</div>
          <div className="text-[10px] text-teal-600 mt-0.5">WhatsApp enabled</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Approval Modules
            </span>
            <Layers size={15} className="text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700">
            {APPROVAL_MODULES.length}
          </div>
          <div className="text-[10px] text-indigo-600 mt-0.5">Leave, Advance, Travel, etc.</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Module Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setModuleFilter("all")}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition cursor-pointer ${
              moduleFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Approvers ({hodList.length})
          </button>
          {APPROVAL_MODULES.map((m) => {
            const count = hodList.filter((h) => {
              const types = Array.isArray(h.approval_types)
                ? h.approval_types
                : typeof h.approval_types === "string"
                ? [h.approval_types]
                : [];
              return types.includes(m.id);
            }).length;
            const isSelected = moduleFilter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModuleFilter(m.id)}
                className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by HOD name, phone, department, or username..."
              className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Approval Types</option>
              {APPROVAL_MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Channel Filter */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Alert Channels</option>
              <option value="sms">SMS Enabled Only</option>
              <option value="whatsapp">WhatsApp Enabled Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Status</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Active Filter Clear Info */}
        {(searchTerm ||
          departmentFilter !== "all" ||
          moduleFilter !== "all" ||
          statusFilter !== "all" ||
          channelFilter !== "all") && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Showing <span className="font-bold text-slate-800">{filteredList.length}</span> of{" "}
              {hodList.length} configured HODs
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setDepartmentFilter("all");
                setModuleFilter("all");
                setStatusFilter("all");
                setChannelFilter("all");
              }}
              className="font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Responsive Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">Loading HOD Master settings...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-teal-100">
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No HOD Approvers Found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {searchTerm || departmentFilter !== "all"
                  ? "No approver matched your filter criteria."
                  : "Start by configuring the first HOD for approval alerts."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openForm()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
            >
              <Plus size={14} /> Add HOD Approver
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 w-12">S.No</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">HOD / Approver</th>
                    <th className="py-3 px-4">Phone / WhatsApp</th>
                    <th className="py-3 px-4">Approval Modules</th>
                    <th className="py-3 px-4 text-center">SMS Alert</th>
                    <th className="py-3 px-4 text-center">WhatsApp</th>
                    <th className="py-3 px-4 text-center">Level</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredList.map((hod, index) => {
                    return (
                      <tr key={hod.id || index} className="hover:bg-slate-50/80 transition-colors">
                        {/* S.No */}
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{index + 1}</td>

                        {/* Department */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-xs bg-slate-100 text-slate-800 border border-slate-200">
                            <Building2 size={12} className="text-teal-600" />
                            {hod.department}
                          </span>
                        </td>

                        {/* HOD / Approver */}
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              {hod.hod_name}
                            </div>
                            {hod.hod_email && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Mail size={11} /> {hod.hod_email}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Phone / WhatsApp */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <a
                              href={`tel:${hod.phone_number || hod.hod_phone}`}
                              className="font-bold text-slate-800 hover:text-teal-700 flex items-center gap-1 font-mono text-xs"
                            >
                              <Phone size={12} className="text-slate-400" />
                              {hod.phone_number || hod.hod_phone}
                            </a>
                            <span className="text-[10px] text-slate-400">Receives approval alert</span>
                          </div>
                        </td>

                        {/* Modules Checkboxes / Chips */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(hod.approval_types) && hod.approval_types.length > 0 ? (
                              hod.approval_types.map((mod) => {
                                const matchedMeta = APPROVAL_MODULES.find((m) => m.id === mod);
                                return (
                                  <span
                                    key={mod}
                                    className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                      matchedMeta?.color || "bg-slate-100 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    {mod}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">All Requests</span>
                            )}
                          </div>
                        </td>

                        {/* Send SMS Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleChannel(hod, "send_sms")}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                              hod.send_sms
                                ? "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
                                : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                            }`}
                            title="Click to toggle SMS"
                          >
                            <Smartphone size={11} />
                            <span>{hod.send_sms ? "ON" : "OFF"}</span>
                          </button>
                        </td>

                        {/* Send WhatsApp Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleChannel(hod, "send_whatsapp")}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                              hod.send_whatsapp
                                ? "bg-teal-100 text-teal-800 border border-teal-200 hover:bg-teal-200"
                                : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                            }`}
                            title="Click to toggle WhatsApp"
                          >
                            <MessageSquare size={11} />
                            <span>{hod.send_whatsapp ? "ON" : "OFF"}</span>
                          </button>
                        </td>

                        {/* Level */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-slate-100 text-slate-700 font-mono">
                            L{hod.level || 1}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              hod.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {hod.status === "Active" ? (
                              <CheckCircle2 size={10} className="text-emerald-500" />
                            ) : (
                              <XCircle size={10} className="text-rose-500" />
                            )}
                            {hod.status || "Active"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setTemplateModal(hod)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-700 transition cursor-pointer"
                              title="View WhatsApp Template"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTestSmsModal(hod)}
                              className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-500 hover:text-teal-700 transition cursor-pointer"
                              title="Test Alert to this HOD"
                            >
                              <Send size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openForm(hod)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                              title="Edit HOD"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(hod.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete HOD"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="lg:hidden p-3 space-y-3">
              {filteredList.map((hod, i) => (
                <div
                  key={hod.id || i}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                        <Building2 size={11} className="text-teal-600" />
                        {hod.department}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">{hod.hod_name}</h3>
                      <div className="text-xs font-mono font-bold text-slate-600 mt-0.5 flex items-center gap-1">
                        <Phone size={11} className="text-slate-400" />
                        {hod.phone_number || hod.hod_phone}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hod.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {hod.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-600 font-bold">
                        L{hod.level || 1}
                      </span>
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Approval Modules
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(hod.approval_types) &&
                        hod.approval_types.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-md text-[10px] font-bold"
                          >
                            {m}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Notification Channels & Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleChannel(hod, "send_sms")}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 cursor-pointer ${
                          hod.send_sms
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Smartphone size={10} /> SMS: {hod.send_sms ? "ON" : "OFF"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleChannel(hod, "send_whatsapp")}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 cursor-pointer ${
                          hod.send_whatsapp
                            ? "bg-teal-100 text-teal-800 border border-teal-200"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <MessageSquare size={10} /> WhatsApp: {hod.send_whatsapp ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTemplateModal(hod)}
                        className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        title="View Template"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestSmsModal(hod)}
                        className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-teal-100 hover:text-teal-800 transition"
                        title="Test"
                      >
                        <Send size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openForm(hod)}
                        className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        title="Edit"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(hod.id)}
                        className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* ADD / EDIT HOD MODAL                                     */}
      {/* ======================================================== */}
      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 md:p-6 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100">
              {/* Header */}
              <div className="shrink-0 bg-gradient-to-r from-slate-950 via-[#064445] to-teal-950 px-5 sm:px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck size={11} className="text-teal-400" />
                    {editingHod ? "Update Configuration" : "New Approver Mapping"}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white mt-1 tracking-tight">
                    {editingHod ? "Edit HOD Approver" : "Add HOD Approver"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 border border-slate-700/80 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form
                onSubmit={handleSubmit}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 text-xs custom-scrollbar overscroll-contain"
              >
                {/* 1. Department Selection */}
                <div>
                  <label className="mb-1 block font-bold text-slate-700">
                    Department / Business Unit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  >
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="Other">+ Enter Custom Department</option>
                  </select>

                  {form.department === "Other" && (
                    <input
                      type="text"
                      value={form.customDepartment}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, customDepartment: e.target.value }))
                      }
                      placeholder="Type custom department name..."
                      className="mt-2 h-10 w-full rounded-xl border border-teal-300 bg-teal-50/30 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      required
                    />
                  )}
                </div>

                {/* 2. HOD Name & Quick User Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      HOD / Approver Name <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-teal-700 font-bold">
                      Select existing employee or enter name
                    </span>
                  </div>

                  {systemUsers.length > 0 && (
                    <select
                      onChange={handleSelectUser}
                      defaultValue=""
                      className="mb-2 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-teal-500"
                    >
                      <option value="">-- Quick Select from System Users --</option>
                      {systemUsers.map((u, i) => (
                        <option key={i} value={u.name || u.username}>
                          {u.name || u.username} {u.department ? `(${u.department})` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    value={form.hod_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, hod_name: e.target.value }))}
                    placeholder="Enter HOD full name (e.g. Atul Baghmar, Deepak Sahu)"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>

                {/* 3. Phone Number & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Mobile Number (for SMS & WhatsApp) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={form.hod_phone}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, hod_phone: e.target.value }))
                        }
                        placeholder="+919876543210"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Enter with country code (e.g. +91XXXXXXXXXX)
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Email Address (Optional)</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={form.hod_email}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, hod_email: e.target.value }))
                        }
                        placeholder="hod@piramal.com"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Approval Modules Multi-select Checkboxes */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-slate-700">
                      Approval Modules to Notify <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Tick modules where SMS is sent
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {APPROVAL_MODULES.map((m) => {
                      const isChecked = form.approval_types.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleToggleModule(m.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isChecked
                              ? "bg-teal-50/80 border-teal-500 text-teal-950 font-bold ring-1 ring-teal-500/20"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                              isChecked
                                ? "bg-teal-600 border-teal-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className="text-xs">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Notification Channels Toggles */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Notification Channels (Kisko kisko SMS jayega)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* SMS */}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, send_sms: !prev.send_sms }))}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        form.send_sms
                          ? "bg-blue-50/80 border-blue-400 text-blue-950"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone size={15} className={form.send_sms ? "text-blue-600" : "text-slate-400"} />
                        <span className="font-bold text-xs">Send SMS</span>
                      </div>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${form.send_sms ? "bg-blue-200 text-blue-800" : "bg-slate-200 text-slate-500"}`}>
                        {form.send_sms ? "YES" : "NO"}
                      </span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, send_whatsapp: !prev.send_whatsapp }))
                      }
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        form.send_whatsapp
                          ? "bg-teal-50/80 border-teal-400 text-teal-950"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare
                          size={15}
                          className={form.send_whatsapp ? "text-teal-600" : "text-slate-400"}
                        />
                        <span className="font-bold text-xs">WhatsApp</span>
                      </div>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${form.send_whatsapp ? "bg-teal-200 text-teal-800" : "bg-slate-200 text-slate-500"}`}>
                        {form.send_whatsapp ? "YES" : "NO"}
                      </span>
                    </button>

                    {/* Email */}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, send_email: !prev.send_email }))}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        form.send_email
                          ? "bg-purple-50/80 border-purple-400 text-purple-950"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Mail size={15} className={form.send_email ? "text-purple-600" : "text-slate-400"} />
                        <span className="font-bold text-xs">Send Email</span>
                      </div>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${form.send_email ? "bg-purple-200 text-purple-800" : "bg-slate-200 text-slate-500"}`}>
                        {form.send_email ? "YES" : "NO"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 6. Hierarchy Level & Status */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Approval Level</label>
                    <select
                      value={form.level}
                      onChange={(e) => setForm((prev) => ({ ...prev, level: Number(e.target.value) }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                    >
                      <option value={1}>Level 1 - Direct HOD / Supervisor</option>
                      <option value={2}>Level 2 - Plant Head / Manager</option>
                      <option value={3}>Level 3 - HR / Executive Management</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                    >
                      <option value="Active">Active (Send Alerts)</option>
                      <option value="Inactive">Inactive (Paused)</option>
                    </select>
                  </div>
                </div>

                {/* 7. Notes */}
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Remarks / Notes</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes regarding this approver..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 resize-none"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {saving && <RefreshCw size={13} className="animate-spin" />}
                    <span>{editingHod ? "Update HOD" : "Save HOD"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL                                */}
      {/* ======================================================== */}
      {deleteConfirmId &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Remove HOD Approver?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This HOD will no longer receive automated SMS or WhatsApp notifications for approval.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* SQL SETUP CODE MODAL                                     */}
      {/* ======================================================== */}
      {showSqlModal &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-950 text-white shadow-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-2.5">
                  <Database size={18} className="text-teal-400" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Supabase SQL Setup for 'hod_master'
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Copy and run this SQL script in your Supabase project's SQL Editor.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-teal-300 space-y-2">
                <pre className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                  {SQL_SCHEMA_CODE}
                </pre>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  After running the script, click "Sync" to connect live!
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SQL_SCHEMA_CODE);
                      toast.success("SQL Script copied to clipboard!");
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <Copy size={13} />
                    <span>Copy SQL Script</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSqlModal(false);
                      fetchHodList();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                  >
                    Done & Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* TEST SMS / WHATSAPP ALERT MODAL                          */}
      {/* ======================================================== */}
      {testSmsModal &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Send size={16} className="text-teal-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Test Approval Alert to HOD
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTestSmsModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">HOD Name:</span>
                  <span className="font-bold text-slate-800">{testSmsModal.hod_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="font-bold text-teal-800">{testSmsModal.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Mobile Number:</span>
                  <span className="font-mono font-bold text-slate-900">{testSmsModal.hod_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Enabled Channels:</span>
                  <span className="font-bold text-slate-700">
                    {[
                      testSmsModal.send_sms ? "SMS" : null,
                      testSmsModal.send_whatsapp ? "WhatsApp" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "None"}
                  </span>
                </div>
              </div>

              <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200 text-xs text-teal-950 leading-relaxed font-mono">
                📢 *Piramal HRMS - Sample Approval Alert*<br />
                ID: LR-98214<br />
                Employee: Sample Employee<br />
                Duration: 15/10/2026 to 16/10/2026<br />
                Reason: Urgent Family Work<br />
                Please review and approve using the HRMS portal.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestSmsModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = (testSmsModal.hod_phone || "").replace(/[^0-9]/g, "");
                    const sampleText = encodeURIComponent(
                      `📢 *Piramal HRMS - Test Approval Alert*\n\nHello ${testSmsModal.hod_name},\nThis is a test notification confirming you are configured as the HOD Approver for ${testSmsModal.department}.\n\nHRMS Portal: ${window.location.origin}`
                    );
                    window.open(`https://wa.me/${cleanPhone}?text=${sampleText}`, "_blank");
                    toast.success(`Test alert launched for ${testSmsModal.hod_name}!`);
                    setTestSmsModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <MessageSquare size={13} />
                  <span>Send Test Alert</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* WHATSAPP TEMPLATE PREVIEW MODAL                          */}
      {/* ======================================================== */}
      {templateModal &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      WhatsApp Message Templates
                    </h3>
                    <p className="text-[11px] text-teal-200/70">
                      Approval alert templates for {templateModal.hod_name} ({templateModal.department})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                {/* Approver Details Chip */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Recipient Approver</span>
                    <p className="font-extrabold text-slate-900 text-sm">{templateModal.hod_name}</p>
                    <p className="font-mono text-slate-600 font-bold text-xs">{templateModal.phone_number || templateModal.hod_phone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-slate-400">Department</span>
                    <p className="font-extrabold text-teal-700">{templateModal.department}</p>
                  </div>
                </div>

                {/* Template 1: Advance Request Alert */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      1. New Advance Request Alert (Sent on Submission)
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      To: 9201958125, 8982944569, 9201959189
                    </span>
                  </div>
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 font-mono text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap select-all shadow-2xs">
{`🔔 *ADVANCE REQUEST ALERT*

Dear Neha Garg 👋😊,

📅✨A new advance request has been submitted:✨📅

👤 *Person Name:* $(Person Name)

📍 *From Location:* $(From Location)
📍 *To Location:* $(To Location)

🚗 *Travel Type:* $(Travel Type)

🗓️ *Start Date:* $(Start Date)
🗓️ *End Date:* $(End Date)

💰 *Advance:* ₹$(Advance)
🏢 *Compnay Name:* $(Compnay Name)

📝 *Reamakrs:* $(Reamakrs)

🔗 *LINK:* $(Appoved Link)

⚡📞Please review and take necessary action.

🙏🤝Best regards,
🏢 Piramal Petroleum Pvt. Ltd.`}
                  </div>
                </div>

                {/* Template 2: Advance Approval Confirmation */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      2. Approval / Rejection Confirmation (Sent on Process)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      To: 9201958125, 9321691120 + Requester
                    </span>
                  </div>
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 font-mono text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap select-all shadow-2xs">
{`🔔 *ADVANCE REQUEST APPROVAL CONFIRMATION*

Dear $(Person Name) 👋😊,

📅✨ Your advance request has been processed ✨📅

📌 *STATUS:* ✅ *$(Status)*

📍 *From Location:* $(From Location)
📍 *To Location:* $(To Location)

🚗 *Travel Type:* $(Travel Type)

🗓️ *Start Date:* $(Start Date)
🗓️ *End Date:* $(End Date)

💰 *Advance Amount:* ₹$(Advance)

📝 *Remarks:* $(Remarks1)

✅ *Approved By:* $(Approved by)

🙏 Wishing you a smooth journey!

🤝 Best regards,
🏢 Piramal Petroleum Pvt. Ltd.`}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Automated trigger active on Piramal HRMS
                </span>
                <button
                  type="button"
                  onClick={() => setTemplateModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HodMaster;
