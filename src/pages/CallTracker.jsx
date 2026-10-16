import React, { useState, useEffect } from "react";
import { 
  Search, X, Plus, Edit, Trash2, Calendar, User, Filter, RefreshCw, 
  ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, 
  Sparkles, Layers, ArrowUpDown, ChevronDown, Check, UserCheck, PhoneCall, Building2, MapPin,
  LayoutList, LayoutGrid, MessageSquare, Briefcase, Tag, Compass, Phone, FileText, Download, ExternalLink
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../services/supabaseClient";

const CallTracker = () => {
  const isSubmittingRef = React.useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entryByFilter, setEntryByFilter] = useState("all");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState("all");
  const [interviewDateFilter, setInterviewDateFilter] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [displayData, setDisplayData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'
  const [statusStats, setStatusStats] = useState({ all: 0, scheduled: 0, done: 0, pending: 0, reschedule: 0, hold: 0 });

  const recordsPerPage = 50;

  useEffect(() => {
    fetchUsers();
    fetchStatusStats();
  }, []);

  const isExcludedEntryBy = (name) => {
    const n = (name || "").toLowerCase().trim();
    return n.includes("apurva") || n.includes("bhavna");
  };

  const fetchUsers = async () => {
    try {
      sessionStorage.removeItem('hrms_entry_by_cache');
      sessionStorage.removeItem('hrms_entry_by_cache_v2');

      const { data: ctData } = await supabase
        .from('calling_tracking')
        .select('entry_by')
        .not('entry_by', 'is', null)
        .neq('entry_by', '')
        .not('entry_by', 'ilike', '%apurva%')
        .not('entry_by', 'ilike', '%bhavna%')
        .limit(300);

      const { data: mdData } = await supabase
        .from('master_dropdowns')
        .select('entry_by')
        .not('entry_by', 'is', null)
        .neq('entry_by', '')
        .not('entry_by', 'ilike', '%apurva%')
        .not('entry_by', 'ilike', '%bhavna%');

      const ctList = (ctData || []).map((r) => (r.entry_by || "").trim()).filter(Boolean);
      const mdList = (mdData || []).map((r) => (r.entry_by || "").trim()).filter(Boolean);

      const uniqueEntryBy = Array.from(new Set([...ctList, ...mdList]))
        .map((n) => (n || "").trim())
        .filter((name) => Boolean(name) && !isExcludedEntryBy(name))
        .sort((a, b) => a.localeCompare(b));

      setUsers(uniqueEntryBy);
    } catch (err) {
      console.error("Failed to fetch entry_by users", err);
    }
  };

  const fetchStatusStats = async () => {
    try {
      const { data, error } = await supabase
        .from('calling_tracking')
        .select('interview_status');

      if (!error && data) {
        const stats = { all: data.length, scheduled: 0, done: 0, pending: 0, reschedule: 0, hold: 0 };
        data.forEach(item => {
          const st = (item.interview_status || "").trim();
          if (st === "Interview Schedule") stats.scheduled++;
          else if (st === "Done") stats.done++;
          else if (st === "Pending" || !st) stats.pending++;
          else if (st === "Reschedule") stats.reschedule++;
          else if (st === "Hold") stats.hold++;
        });
        setStatusStats(stats);
      }
    } catch (e) {
      console.error("Failed to fetch status stats", e);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineInterviewItem, setInlineInterviewItem] = useState(null);
  const [inlineInterviewStatus, setInlineInterviewStatus] = useState("");
  const [inlineInterviewDate, setInlineInterviewDate] = useState("");

  const [formData, setFormData] = useState({
    entryBy: "",
    applicantName: "",
    contactNo: "",
    role: "",
    portalUsed: "",
    location: "",
    stage: "",
    notes: "",
    feedback: "",
    status: "",
    interviewStatus: "Pending",
    interviewDate: "",
    attachment: null,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const resetForm = () => {
    setFormData({
      entryBy: "",
      applicantName: "",
      contactNo: "",
      role: "",
      portalUsed: "",
      location: "",
      stage: "",
      notes: "",
      feedback: "",
      status: "",
      interviewStatus: "Pending",
      interviewDate: "",
      attachment: null,
    });
  };

  const uploadFileLink = async (file) => {
    if (!file) return "";
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: uploadFormData,
      });
      const data = await response.json();
      if (data.secure_url) {
        return data.secure_url;
      }
      throw new Error(data.error?.message || "Cloudinary upload failed");
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      toast.error("File upload failed: " + error.message);
      return "";
    }
  };

  const parseTimestamp = (ts) => {
    if (!ts) return null;
    let d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
    const datePart = ts.split(" ")[0];
    const parts = datePart.split("/");
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10) - 1;
      const p2 = parseInt(parts[2], 10);
      if (p0 > 1000) d = new Date(p0, p1, p2);
      else d = new Date(p2, p1, p0);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const formatDateDisplay = (ts) => {
    if (!ts) return "-";
    const d = parseTimestamp(ts);
    if (!d) return ts;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name) => {
    const gradients = [
      "from-indigo-500 to-purple-600",
      "from-blue-500 to-cyan-600",
      "from-emerald-500 to-teal-600",
      "from-violet-500 to-fuchsia-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-pink-600"
    ];
    if (!name) return gradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return gradients[hash % gradients.length];
  };

  const loadData = async (isBackground = false) => {
    const isBg = isBackground === true;
    if (!isBg) setTableLoading(true);

    try {
      const from = (currentPage - 1) * recordsPerPage;
      const to = from + recordsPerPage - 1;

      let query = supabase
        .from('calling_tracking')
        .select('id, task_id, entry_by, applicant_name, contact_no, role, portal_used, location, stage, notes, feedback, status, interview_status, interview_date, attachment_url, created_at, timestamp', { count: 'exact' });

      // 1. Interview Status Filter
      if (interviewStatusFilter !== "all") {
        query = query.eq('interview_status', interviewStatusFilter);
      }

      // 2. Interview Date Filter
      if (interviewDateFilter) {
        query = query.eq('interview_date', interviewDateFilter);
      }

      // 3. Entry By Filter
      if (entryByFilter && entryByFilter !== 'all') {
        query = query.eq('entry_by', entryByFilter);
      }

      // 4. Search Term
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`applicant_name.ilike.%${term}%,task_id.ilike.%${term}%,contact_no.ilike.%${term}%,role.ilike.%${term}%,location.ilike.%${term}%`);
      }

      // 5. Date Filter (created_at)
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', startOfDay);
      } else if (dateFilter === 'yesterday') {
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', startOfYesterday).lt('created_at', endOfYesterday);
      } else if (dateFilter === 'monthly') {
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
        query = query.gte('created_at', oneMonthAgo);
      } else if (dateFilter === 'custom' && fromDate && toDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      // Sort and Paginate
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      const rows = data || [];
      const processed = rows.map((row, idx) => ({
        id: row.id || idx,
        dbId: row.id,
        timestamp: row.timestamp || (row.created_at ? formatDateDisplay(row.created_at) : ''),
        taskId: row.task_id || '',
        entryBy: row.entry_by || '',
        applicantName: row.applicant_name || '',
        contactName: row.contact_no || '',
        role: row.role || '',
        portalUsed: row.portal_used || '',
        location: row.location || '',
        stage: row.stage || '',
        notes: row.notes || '',
        feedback: row.feedback || '',
        status: row.status || '',
        interviewStatus: row.interview_status || '',
        interviewDate: row.interview_date || '',
        attachmentUrl: row.attachment_url || '',
      }));

      setDisplayData(processed);
      setTotalRecords(count || 0);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Failed to load data");
      setDisplayData([]);
    } finally {
      if (!isBg) setTableLoading(false);
    }
  };

  // Debounced Search and Fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [currentPage, dateFilter, fromDate, toDate, entryByFilter, interviewStatusFilter, interviewDateFilter, searchTerm]);

  const handleInlineInterviewSubmit = async () => {
    if (!inlineInterviewItem) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('calling_tracking')
        .update({
          interview_status: inlineInterviewStatus,
          interview_date: inlineInterviewDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', inlineInterviewItem.dbId || inlineInterviewItem.id);

      if (error) throw error;

      toast.success("Interview status updated!");
      setInlineInterviewItem(null);
      loadData(true);
      fetchStatusStats();
    } catch (err) {
      console.error("Status update error:", err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      let attachmentUrl = editingId !== null ? (displayData.find(d => d.id === editingId || d.dbId === editingId)?.attachmentUrl || "") : "";

      if (formData.attachment) {
        toast.loading("Uploading attachment...", { id: "upload" });
        attachmentUrl = await uploadFileLink(formData.attachment);
        toast.dismiss("upload");
      }

      if (editingId) {
        const { error } = await supabase
          .from('calling_tracking')
          .update({
            entry_by: formData.entryBy,
            applicant_name: formData.applicantName,
            contact_no: formData.contactNo,
            role: formData.role,
            portal_used: formData.portalUsed,
            location: formData.location,
            stage: formData.stage,
            notes: formData.notes,
            feedback: formData.feedback,
            status: formData.status,
            interview_status: formData.interviewStatus,
            interview_date: formData.interviewDate,
            attachment_url: attachmentUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Call task updated successfully!");
      } else {
        const now = new Date();
        const timestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        const nextTaskNum = totalRecords + 1;
        const newTaskId = `TI/${nextTaskNum}`;

        const { error } = await supabase.from('calling_tracking').insert([{
          timestamp,
          task_id: newTaskId,
          entry_by: formData.entryBy,
          applicant_name: formData.applicantName,
          contact_no: formData.contactNo,
          role: formData.role,
          portal_used: formData.portalUsed,
          location: formData.location,
          stage: formData.stage,
          notes: formData.notes,
          feedback: formData.feedback,
          status: formData.status,
          interview_status: formData.interviewStatus || 'Pending',
          interview_date: formData.interviewDate || '',
          attachment_url: attachmentUrl
        }]);

        if (error) throw error;
        toast.success("Call task added successfully!");
      }

      setShowModal(false);
      resetForm();
      setEditingId(null);
      loadData(true);
      fetchStatusStats();
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("Submit failed: " + error.message);
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleEdit = (item) => {
    setFormData({
      entryBy: item.entryBy || "",
      applicantName: item.applicantName || "",
      contactNo: item.contactName || "",
      role: item.role || "",
      portalUsed: item.portalUsed || "",
      location: item.location || "",
      stage: item.stage || "",
      notes: item.notes || "",
      feedback: item.feedback || "",
      status: item.status || "",
      interviewStatus: item.interviewStatus || "",
      interviewDate: item.interviewDate || "",
      attachment: null,
    });
    setEditingId(item.dbId || item.id);
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Are you sure you want to delete this call record?")) return;

    setTableLoading(true);
    try {
      const { error } = await supabase
        .from('calling_tracking')
        .delete()
        .eq('id', item.dbId || item.id);

      if (error) throw error;

      toast.success("Call record deleted successfully");
      loadData();
      fetchStatusStats();
    } catch (err) {
      console.error("Delete Error:", err);
      toast.error(err.message || "Failed to delete");
    } finally {
      setTableLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setDateFilter("all");
    setEntryByFilter("all");
    setInterviewStatusFilter("all");
    setInterviewDateFilter("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const isFilterActive = searchTerm || dateFilter !== "all" || entryByFilter !== "all" || interviewStatusFilter !== "all" || interviewDateFilter || fromDate || toDate;

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Done":
        return {
          pill: "bg-emerald-500/10 text-emerald-700 border-emerald-200/80 hover:bg-emerald-500/20",
          dot: "bg-emerald-500",
          icon: <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
        };
      case "Interview Schedule":
        return {
          pill: "bg-blue-500/10 text-blue-700 border-blue-200/80 hover:bg-blue-500/20",
          dot: "bg-blue-500",
          icon: <Calendar size={12} className="text-blue-600 shrink-0" />
        };
      case "Pending":
        return {
          pill: "bg-amber-500/10 text-amber-700 border-amber-200/80 hover:bg-amber-500/20",
          dot: "bg-amber-500",
          icon: <Clock size={12} className="text-amber-600 shrink-0" />
        };
      case "Reschedule":
        return {
          pill: "bg-purple-500/10 text-purple-700 border-purple-200/80 hover:bg-purple-500/20",
          dot: "bg-purple-500",
          icon: <RefreshCw size={12} className="text-purple-600 shrink-0" />
        };
      case "Hold":
        return {
          pill: "bg-rose-500/10 text-rose-700 border-rose-200/80 hover:bg-rose-500/20",
          dot: "bg-rose-500",
          icon: <AlertCircle size={12} className="text-rose-600 shrink-0" />
        };
      default:
        return {
          pill: "bg-slate-500/10 text-slate-700 border-slate-200/80 hover:bg-slate-500/20",
          dot: "bg-slate-400",
          icon: null
        };
    }
  };

  const quickStatusTabs = [
    { label: "All Candidates", value: "all", count: statusStats.all, dot: "bg-slate-500" },
    { label: "Scheduled", value: "Interview Schedule", count: statusStats.scheduled, dot: "bg-blue-500" },
    { label: "Pending", value: "Pending", count: statusStats.pending, dot: "bg-amber-500" },
    { label: "Done", value: "Done", count: statusStats.done, dot: "bg-emerald-500" },
    { label: "Reschedule", value: "Reschedule", count: statusStats.reschedule, dot: "bg-purple-500" },
    { label: "Hold", value: "Hold", count: statusStats.hold, dot: "bg-rose-500" },
  ];

  return (
    <div className="p-3 sm:p-5 space-y-3 bg-[#f8fafc] min-h-screen text-xs antialiased text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation & Actions Top Bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-xs shadow-teal-500/20">
              <PhoneCall size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Call Tracker Pipeline</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  {totalRecords} Total Calls
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Live recruitment calling logs & candidate outreach</p>
            </div>
          </div>

          {/* Action Buttons & View Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table List View"
              >
                <LayoutList size={13} />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => {
                loadData();
                fetchStatusStats();
              }}
              disabled={tableLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={12} className={tableLoading ? "animate-spin text-teal-600" : "text-slate-500"} />
              <span>{tableLoading ? "Syncing..." : "Sync"}</span>
            </button>

            {/* Add Task Button */}
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shadow-teal-600/20 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Call Task</span>
            </button>
          </div>
        </div>

        {/* Segmented Status Pill Bar */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto">
          {quickStatusTabs.map((tab) => {
            const isActive = interviewStatusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setInterviewStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-white text-slate-900 border-slate-300 shadow-2xs font-bold ring-1 ring-slate-900/5"
                    : "bg-transparent border-transparent text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${tab.dot}`}></span>
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? "bg-slate-100 text-slate-800 font-bold" : "bg-slate-200/60 text-slate-600"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Advanced Filter Toolbar */}
        <div className="p-3 bg-white border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 items-center">
            
            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, role..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Entry By Dropdown */}
            <div>
              <select
                value={entryByFilter}
                onChange={(e) => {
                  setEntryByFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none cursor-pointer font-medium"
              >
                <option value="all">Entry By: All</option>
                {users.map((user, idx) => (
                  <option key={idx} value={user}>
                    Entry By: {user}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none cursor-pointer"
              >
                <option value="all">Created: All Time</option>
                <option value="today">Created: Today</option>
                <option value="yesterday">Created: Yesterday</option>
                <option value="monthly">Created: Last 30 Days</option>
                <option value="custom">Created: Custom Range</option>
              </select>
            </div>

            {/* Specific Interview Date Filter */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={interviewDateFilter}
                onChange={(e) => {
                  setInterviewDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none cursor-pointer"
                title="Filter by Scheduled Interview Date"
              />
              {interviewDateFilter && (
                <button
                  onClick={() => setInterviewDateFilter("")}
                  className="absolute right-7 text-slate-400 hover:text-slate-600"
                  title="Clear date"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Reset / Stats Bar */}
            <div>
              {isFilterActive ? (
                <button
                  onClick={clearAllFilters}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <X size={12} />
                  <span>Reset All Filters</span>
                </button>
              ) : (
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-slate-500 text-[11px]">
                  <span>Viewing</span>
                  <span className="font-bold text-slate-800 font-mono">{totalRecords} records</span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Date Range Row */}
          {dateFilter === "custom" && (
            <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2.5 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500">From Date:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <span className="text-[11px] font-semibold text-slate-500">To Date:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* VIEW 1: MODERN SAAS DATA TABLE */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Clean Subtle Header */}
              <thead className="bg-slate-50/90 text-slate-500 sticky top-0 z-20 border-b border-slate-200/80 backdrop-blur-xs">
                <tr className="text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">Candidate</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[160px]">Role & Location</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Interview Stage</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[150px]">Sourcing Channel</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Entry By</th>
                  <th className="py-3 px-4 min-w-[140px]">Feedback & Notes</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[100px]">Attachment</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[90px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-normal">
                {tableLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-semibold text-xs text-slate-600">Loading call records...</p>
                      </div>
                    </td>
                  </tr>
                ) : displayData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <AlertCircle size={20} />
                        </div>
                        <p className="font-bold text-sm text-slate-700">No calling records found</p>
                        <p className="text-xs text-slate-400">Try changing keywords or clearing active filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayData.map((item, idx) => {
                    const badge = getStatusBadge(item.interviewStatus);
                    const gradient = getAvatarGradient(item.applicantName);
                    const initials = getInitials(item.applicantName);

                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Candidate Name & Contact */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-[11px] shadow-2xs shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs hover:text-teal-700 transition-colors">
                                  {item.applicantName || "Unnamed"}
                                </span>
                                {item.taskId && (
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                    {item.taskId}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                <Phone size={10} className="text-slate-400" />
                                <span className="font-mono">{item.contactName || "No contact"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Location */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div>
                            <span className="font-semibold text-slate-800 text-xs capitalize block">
                              {item.role || "Not Specified"}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <MapPin size={10} className="text-slate-400 shrink-0" />
                              <span className="capitalize">{item.location || "Plant"}</span>
                            </div>
                          </div>
                        </td>

                        {/* Interview Status & Scheduled Date */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                setInlineInterviewItem(item);
                                setInlineInterviewStatus(item.interviewStatus || "Pending");
                                setInlineInterviewDate(item.interviewDate || "");
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${badge.pill}`}
                              title="Click to update status"
                            >
                              {badge.icon}
                              <span>{item.interviewStatus || "Pending"}</span>
                              <ChevronDown size={11} className="opacity-60" />
                            </button>
                            {item.interviewDate && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                <Calendar size={10} className="text-slate-400" />
                                <span>{formatDateDisplay(item.interviewDate)}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Sourcing Channel & Stage */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                              <Tag size={10} className="text-slate-400" />
                              <span className="max-w-[120px] truncate">{item.portalUsed || "Direct"}</span>
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1 capitalize">
                              Stage: <span className="font-medium text-slate-700">{item.stage || "Initial"}</span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Recruiter & Added Date */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-1 text-xs font-medium text-slate-800">
                              <User size={11} className="text-slate-400" />
                              <span>{item.entryBy || "-"}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              {formatDateDisplay(item.timestamp)}
                            </span>
                          </div>
                        </td>

                        {/* Notes / Feedback Preview */}
                        <td className="py-2.5 px-4">
                          <div className="max-w-[160px]">
                            {item.feedback || item.notes ? (
                              <p className="text-[11px] text-slate-600 truncate" title={item.feedback || item.notes}>
                                {item.feedback || item.notes}
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-300 italic">No notes</span>
                            )}
                          </div>
                        </td>

                        {/* Attachment Column */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {item.attachmentUrl ? (
                            <a
                              href={item.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 rounded-md text-[11px] font-semibold transition-colors"
                            >
                              <FileText size={11} />
                              <span>View Doc</span>
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[11px]">No file</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-2.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* VIEW 2: MODERN SAAS CANDIDATE CARDS GRID */
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
            {tableLoading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold text-xs text-slate-600">Loading candidate cards...</p>
              </div>
            ) : displayData.length === 0 ? (
              <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <AlertCircle size={24} />
                <p className="font-bold text-sm text-slate-700">No call records found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {displayData.map((item) => {
                  const badge = getStatusBadge(item.interviewStatus);
                  const gradient = getAvatarGradient(item.applicantName);
                  const initials = getInitials(item.applicantName);

                  return (
                    <div 
                      key={item.id} 
                      className="bg-white rounded-xl border border-slate-200/90 hover:border-teal-300 hover:shadow-sm transition-all p-3.5 flex flex-col justify-between space-y-3"
                    >
                      {/* Card Top */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-xs">
                                {item.applicantName || "Unnamed"}
                              </h3>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                                <Phone size={10} className="text-slate-400" />
                                <span>{item.contactName || "-"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Task ID chip */}
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.taskId || "-"}
                          </span>
                        </div>

                        {/* Role & Details */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Role:</span>
                            <span className="font-bold text-slate-800 capitalize">{item.role || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Source:</span>
                            <span className="font-medium text-slate-700 truncate max-w-[140px]">{item.portalUsed || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Entry By:</span>
                            <span className="font-medium text-slate-700">{item.entryBy || "-"}</span>
                          </div>
                          {item.attachmentUrl && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Document:</span>
                              <a
                                href={item.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:text-teal-700 font-bold inline-flex items-center gap-1 text-[11px]"
                              >
                                <ExternalLink size={10} /> View Attachment
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Status & Actions */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setInlineInterviewItem(item);
                            setInlineInterviewStatus(item.interviewStatus || "Pending");
                            setInlineInterviewDate(item.interviewDate || "");
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${badge.pill}`}
                        >
                          {badge.icon}
                          <span>{item.interviewStatus || "Pending"}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Unified Bottom Pagination Toolbar */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-bold">{totalRecords > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0}</span> to{" "}
            <span className="text-slate-900 font-bold">{Math.min(currentPage * recordsPerPage, totalRecords)}</span> of{" "}
            <span className="text-slate-900 font-bold">{totalRecords}</span> records
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || tableLoading}
              className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <ChevronLeft size={13} />
              <span>Prev</span>
            </button>
            <span className="text-xs font-bold px-2.5 text-slate-800 font-mono">
              {currentPage} / {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0 || tableLoading}
              className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Modern Add / Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <PhoneCall size={14} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">{editingId ? "Edit Call Task" : "Add New Call Task"}</h2>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Entry By</label>
                  <select
                    name="entryBy"
                    value={formData.entryBy}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    required
                  >
                    <option value="">Select Entry By</option>
                    {users.map((user, idx) => (
                      <option key={idx} value={user}>
                        {user}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Applicant Name</label>
                  <input
                    name="applicantName"
                    value={formData.applicantName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="Candidate full name..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number</label>
                  <input
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="Mobile / phone..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Role</label>
                  <input
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="Designation / Role..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Portal / Sourcing Channel</label>
                  <input
                    name="portalUsed"
                    value={formData.portalUsed}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="Portal / Reference..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="Plant / Office..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Calling Stage</label>
                  <input
                    name="stage"
                    value={formData.stage}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="e.g. Call Connected, Round 1..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">System Status</label>
                  <input
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="Open / Closed..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Interview Status</label>
                  <select
                    name="interviewStatus"
                    value={formData.interviewStatus}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Interview Schedule">Interview Schedule</option>
                    <option value="Reschedule">Reschedule</option>
                    <option value="Done">Done</option>
                    <option value="Hold">Hold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Interview Date</label>
                  <input
                    type="date"
                    name="interviewDate"
                    value={formData.interviewDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none h-16"
                  placeholder="Candidate background, expectations..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Calling Feedback</label>
                <textarea
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none h-16"
                  placeholder="Recruiter comments, feedback..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attachment (Resume / Doc)</label>
                <input
                  type="file"
                  name="attachment"
                  onChange={handleFileChange}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-xs font-bold shadow-xs disabled:opacity-60 cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? (editingId ? "Updating..." : "Saving...") : (editingId ? "Update Call Task" : "Add Call Task")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Inline Quick Status Modal */}
      {inlineInterviewItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 relative border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <CheckCircle2 size={13} />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Update Interview Status</h3>
            </div>
            <button
              onClick={() => setInlineInterviewItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X size={15} />
            </button>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={inlineInterviewStatus}
                  onChange={(e) => setInlineInterviewStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Interview Schedule">Interview Schedule</option>
                  <option value="Hold">Hold</option>
                  <option value="Reschedule">Reschedule</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              {["Done", "Interview Schedule", "Reschedule"].includes(inlineInterviewStatus) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Interview Date</label>
                  <input
                    type="date"
                    value={inlineInterviewDate}
                    onChange={(e) => setInlineInterviewDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setInlineInterviewItem(null)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleInlineInterviewSubmit}
                className="px-4 py-1.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-xs font-bold flex items-center gap-1 shadow-xs disabled:opacity-60 cursor-pointer"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  "Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallTracker;
