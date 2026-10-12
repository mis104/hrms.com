import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  Clock,
  CheckCircle,
  Plus,
  X,
  RefreshCw,
  Download,
  Filter,
  Users,
  Phone,
  Building2,
  Briefcase,
  Layers,
  ChevronDown,
  Check,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { supabase } from "../services/supabaseClient";
import { recordDataResponse } from "../services/supabaseService";

// Low Egress Cache
const CACHE_KEY = "hrms_job_agencies_fms_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_JOB_CONSULTANCIES = [
  "Talent Consultancy",
  "Zenix Consultancy",
  "SS Consultancy",
  "CG Security Placement",
  "Cafyo Consultancy",
  "Find Da",
  "ANM Consultancy",
  "Laxmi Consultancy",
  "Alok ( Freelencer )",
  "Sonalam Consultancy",
  "Direct Placement Service"
];

const getCurrentFormattedTimestamp = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${d}-${m}-${y} ${hh}:${mm}`;
};

const FilterDropdown = ({ label, value, onChange, options = [], icon: Icon, allLabel = "All" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    return options.filter((opt) => String(opt).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [options, searchQuery]);

  const selectedDisplay = !value || value === "all" ? label : value;

  return (
    <div className="relative flex-1 min-w-[140px] sm:min-w-[160px]" style={{ position: "relative", zIndex: isOpen ? 9999 : 20 }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-xs rounded-xl border flex items-center justify-between gap-2 transition-all bg-white cursor-pointer ${
          isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm" : value && value !== "all" ? "border-indigo-300 bg-indigo-50/40 text-indigo-900 font-semibold" : "border-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className={`w-4 h-4 shrink-0 ${value && value !== "all" ? "text-indigo-600" : "text-slate-400"}`} />}
          <span className="truncate">{selectedDisplay}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-700 py-2 animate-fadeIn min-w-[200px] ring-1 ring-black/10 overflow-hidden" style={{ position: "absolute", zIndex: 99999 }}>
          {options.length > 5 && (
            <div className="px-2.5 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${label}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto px-1 space-y-0.5 custom-scrollbar">
            <button
              type="button"
              onClick={() => { onChange("all"); setIsOpen(false); setSearchQuery(""); }}
              className={`w-full px-3 py-2 text-xs text-left rounded-xl flex items-center justify-between transition-colors cursor-pointer ${!value || value === "all" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700 hover:bg-slate-100"}`}
            >
              <span>{allLabel}</span>
              {(!value || value === "all") && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
            </button>

            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setIsOpen(false); setSearchQuery(""); }}
                className={`w-full px-3 py-2 text-xs text-left rounded-xl flex items-center justify-between transition-colors cursor-pointer ${value === opt ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <span className="truncate">{opt}</span>
                {value === opt && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CallingForJobAgencies = () => {
  const [fmsRecords, setFmsRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [viewMode, setViewMode] = useState("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [postFilter, setPostFilter] = useState("all");

  const [consultancyList, setConsultancyList] = useState(DEFAULT_JOB_CONSULTANCIES);
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    agencyStatus: "Yes",
    jobConsultancyNames: [],
    consultancyContacts: {},
  });

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
            setFmsRecords(parsed.data);
            setLoading(false);
            return;
          }
        }
      }

      const { data, error } = await supabase.from("fms").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const records = data || [];
      setFmsRecords(records);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: records }));
    } catch (err) {
      console.error("Error loading FMS records:", err);
      toast.error("Failed to load records: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const { pendingData, historyData, departments, posts, kpiStats } = useMemo(() => {
    const pending = [];
    const history = [];
    let pendingCount = 0;

    fmsRecords.forEach((item) => {
      const p2 = (item.stage2_planned || "").toString().trim();
      const a2 = (item.stage2_actual || "").toString().trim();
      const isPending = p2 !== "" && a2 === "";
      const isDone = a2 !== "";

      if (isPending) pendingCount++;

      const recordObj = { ...item, isPending, isDone };
      if (isPending) {
        pending.push(recordObj);
      } else if (isDone || item.position_status !== "CLOSED") {
        history.push(recordObj);
      }
    });

    const depts = Array.from(new Set(fmsRecords.map((r) => r.department).filter(Boolean))).sort();
    const postOptions = Array.from(new Set(fmsRecords.map((r) => r.post).filter(Boolean))).sort();

    return {
      pendingData: pending,
      historyData: history,
      departments: depts,
      posts: postOptions,
      kpiStats: {
        total: fmsRecords.length,
        pending: pendingCount,
        completed: history.length,
      },
    };
  }, [fmsRecords]);

  const currentList = activeTab === "pending" ? pendingData : historyData;

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return currentList.filter((item) => {
      const matchSearch =
        !term ||
        (item.indent_no || "").toLowerCase().includes(term) ||
        (item.post || "").toLowerCase().includes(term) ||
        (item.person_name || "").toLowerCase().includes(term) ||
        (item.department || "").toLowerCase().includes(term) ||
        (item.job_consultancy || "").toLowerCase().includes(term);

      const matchDept = deptFilter === "all" || item.department === deptFilter;
      const matchPost = postFilter === "all" || item.post === postFilter;

      return matchSearch && matchDept && matchPost;
    }).sort((a, b) => {
      const aIndent = String(a.indent_no || "").trim();
      const bIndent = String(b.indent_no || "").trim();
      return bIndent.localeCompare(aIndent, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [currentList, searchTerm, deptFilter, postFilter]);

  const handleOpenModal = (indent) => {
    setSelectedIndent(indent);
    const existingConsultancies = (indent.job_consultancy || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const contactPersons = (indent.contact_person_name || "").split(",").map((p) => p.trim());
    const contactNumbers = (indent.contact_no || "").split(",").map((n) => n.trim());

    const contactsObj = {};
    existingConsultancies.forEach((name, idx) => {
      contactsObj[name] = {
        contactPerson: contactPersons[idx] || "",
        contactNumber: contactNumbers[idx] || "",
      };
    });

    setFormData({
      agencyStatus: indent.stage2_status || "Yes",
      jobConsultancyNames: existingConsultancies,
      consultancyContacts: contactsObj,
    });

    setShowModal(true);
  };

  const handleConsultancyToggle = (agencyName) => {
    setFormData((prev) => {
      const isSelected = prev.jobConsultancyNames.includes(agencyName);
      const updatedNames = isSelected
        ? prev.jobConsultancyNames.filter((n) => n !== agencyName)
        : [...prev.jobConsultancyNames, agencyName];

      const updatedContacts = { ...prev.consultancyContacts };
      if (isSelected) {
        delete updatedContacts[agencyName];
      } else {
        updatedContacts[agencyName] = { contactPerson: "", contactNumber: "" };
      }

      return {
        ...prev,
        jobConsultancyNames: updatedNames,
        consultancyContacts: updatedContacts,
      };
    });
  };

  const handleContactFieldChange = (agencyName, field, value) => {
    setFormData((prev) => ({
      ...prev,
      consultancyContacts: {
        ...prev.consultancyContacts,
        [agencyName]: {
          ...prev.consultancyContacts[agencyName],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIndent) return;

    if (formData.jobConsultancyNames.length === 0) {
      toast.error("Please select at least one Job Consultancy!");
      return;
    }

    try {
      setSubmitting(true);
      const timestamp = getCurrentFormattedTimestamp();
      const consultanciesStr = formData.jobConsultancyNames.join(", ");
      const contactPersonsStr = formData.jobConsultancyNames
        .map((name) => formData.consultancyContacts[name]?.contactPerson || "")
        .join(", ");
      const contactNosStr = formData.jobConsultancyNames
        .map((name) => formData.consultancyContacts[name]?.contactNumber || "")
        .join(", ");

      const updates = {
        stage2_actual: timestamp,
        stage2_status: formData.agencyStatus,
        job_consultancy: consultanciesStr,
        contact_person_name: contactPersonsStr,
        contact_no: contactNosStr,
        updated_at: new Date().toISOString(),
      };

      await recordDataResponse({
        uniqueId: selectedIndent.indent_no,
        stepCode: "PO-2",
        status: formData.agencyStatus,
        jobConsultancy: consultanciesStr,
        contactPersonName: contactPersonsStr,
        contactNo: contactNosStr,
        timestamp,
      });

      const { error } = await supabase
        .from("fms")
        .update(updates)
        .eq("indent_no", selectedIndent.indent_no);

      if (error) throw error;

      toast.success("Job agency calling task updated successfully!");
      setShowModal(false);
      loadData(true);
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-6 space-y-6">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
              <span>Step PO-2 • Recruitment FMS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Calling For Jobs Agencies / Consultancy
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Track agency outreaches and record consultancy SPOC contact info with live Supabase database synchronization.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => loadData(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-xs font-medium text-slate-300">Total Indents</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">{kpiStats.total}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-xs font-medium text-amber-300">PO-2 Pending Calling</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{kpiStats.pending}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-xs font-medium text-emerald-300">Completed (History)</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{kpiStats.completed}</div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pending" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Calling ({pendingData.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>History ({historyData.length})</span>
            </button>
          </div>

          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Indent, Post, Agency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterDropdown label="All Departments" value={deptFilter} onChange={setDeptFilter} options={departments} icon={Building2} />
            <FilterDropdown label="All Posts" value={postFilter} onChange={setPostFilter} options={posts} icon={Briefcase} />
          </div>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Loading Indents...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Indents Found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 text-center">Action</th>
                  <th className="py-3 px-4">Indent No.</th>
                  <th className="py-3 px-4">Indenter Name</th>
                  <th className="py-3 px-4">Post</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Positions</th>
                  <th className="py-3 px-4">Consultancies</th>
                  <th className="py-3 px-4">Contact Persons</th>
                  <th className="py-3 px-4">Contact Numbers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredData.map((indent) => (
                  <tr key={indent.id || indent.indent_no} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenModal(indent)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{activeTab === "pending" ? "Update Agency" : "Edit Details"}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-800 border border-slate-200">
                        {indent.indent_no}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{indent.person_name || indent.indenter_name || "-"}</td>
                    <td className="py-3 px-4 font-bold text-indigo-700">{indent.post || "-"}</td>
                    <td className="py-3 px-4">{indent.department || "-"}</td>
                    <td className="py-3 px-4 font-bold">{indent.number_of_post || indent.positions_num || "1"}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{indent.job_consultancy || "-"}</td>
                    <td className="py-3 px-4">{indent.contact_person_name || "-"}</td>
                    <td className="py-3 px-4">{indent.contact_no || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && selectedIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white">Update Job Agency Calling (PO-2)</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm custom-scrollbar bg-white">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400 block text-[10px]">Indent No</span><span className="font-bold">{selectedIndent.indent_no}</span></div>
                <div><span className="text-slate-400 block text-[10px]">Post</span><span className="font-bold">{selectedIndent.post}</span></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs">Job Agency Status:</label>
                  <select
                    value={formData.agencyStatus}
                    onChange={(e) => setFormData((p) => ({ ...p, agencyStatus: e.target.value }))}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-700"
                  >
                    <option value="Yes">Yes (Done)</option>
                    <option value="No">No</option>
                    <option value="Hold">Hold</option>
                  </select>
                </div>

                <label className="font-semibold text-slate-700 text-xs block">Select Consultancies</label>
                <div className="space-y-2 max-h-56 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200 custom-scrollbar">
                  {consultancyList.map((agencyName) => {
                    const isChecked = formData.jobConsultancyNames.includes(agencyName);
                    return (
                      <div key={agencyName} className={`p-2.5 rounded-xl border ${isChecked ? "bg-indigo-50/70 border-indigo-200" : "border-slate-100"}`}>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input type="checkbox" checked={isChecked} onChange={() => handleConsultancyToggle(agencyName)} className="rounded text-indigo-600" />
                          <span>{agencyName}</span>
                        </label>
                        {isChecked && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-100">
                            <input
                              type="text"
                              placeholder="Contact Person Name"
                              value={formData.consultancyContacts[agencyName]?.contactPerson || ""}
                              onChange={(e) => handleContactFieldChange(agencyName, "contactPerson", e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Contact Number"
                              value={formData.consultancyContacts[agencyName]?.contactNumber || ""}
                              onChange={(e) => handleContactFieldChange(agencyName, "contactNumber", e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{submitting ? "Submitting..." : "Submit"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallingForJobAgencies;
