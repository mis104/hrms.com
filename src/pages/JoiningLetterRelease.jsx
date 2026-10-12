import React, { useEffect, useState, useRef, useMemo } from "react";
import { 
    Search, 
    Clock, 
    X, 
    CheckCircle2, 
    RefreshCw, 
    Sparkles, 
    Building2, 
    Briefcase, 
    Mail, 
    FileText, 
    Check, 
    ShieldCheck, 
    ChevronDown, 
    XCircle, 
    UserX, 
    Send, 
    Upload, 
    FileCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { recordDataResponse } from "../services/supabaseService";

// Helper for Cloudinary preview
const getDisplayResumeUrl = (url) => {
    if (!url) return "";
    if (url.includes("/image/upload/") && url.toLowerCase().endsWith(".pdf")) {
        return url.replace(/\.pdf$/i, ".jpg");
    }
    return url;
};

// Searchable Filter Dropdown
const FilterDropdown = ({
    icon: Icon,
    label,
    value,
    onChange,
    options = [],
    allLabel = "All",
    count
}) => {
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
        return options.filter((opt) =>
            String(opt).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [options, searchQuery]);

    const activeLabel = value || allLabel;

    return (
        <div className={`relative ${isOpen ? 'z-50' : 'z-20'}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setSearchQuery("");
                }}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    value
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
            >
                {Icon && <Icon className={`w-3.5 h-3.5 ${value ? "text-indigo-600" : "text-slate-400"}`} />}
                <span className="truncate max-w-[140px]">{activeLabel}</span>
                {typeof count === "number" && !value && (
                    <span className="text-[10px] text-slate-400 font-normal">({count})</span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 ml-0.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
            </button>

            {isOpen && (
                <div 
                    className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn z-50"
                >
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Search ${label}...`}
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto p-1 text-xs custom-scrollbar">
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                !value ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            <span>{allLabel}</span>
                            {!value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </button>

                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-center text-slate-400 text-[11px]">
                                No matches found
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = value === opt;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                            isSelected ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const JoiningLetterRelease = () => {
    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [tableLoading, setTableLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");
    const [showModal, setShowModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [formData, setFormData] = useState({
        status: "Yes",
        attachmentUrl: ""
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setTableLoading(true);
        try {
            const { data, error } = await supabase
                .from("joining_fms")
                .select("id, employee_code, candidate_name, finalized_salary, indent_no, designation, lookup_designation, joining_place, mobile_no, personal_email_id, letter_attachment, stage2_planned, stage2_actual, stage2_status, stage2_time_delay")
                .order("id", { ascending: false });

            if (error) throw error;

            const processed = (data || []).map(row => {
                const plan = (row.stage2_planned || "").trim();
                const act = (row.stage2_actual || "").trim();

                return {
                    id: row.id,
                    customId: row.id,
                    employeeCode: row.employee_code || "—",
                    candidateName: row.candidate_name || "",
                    finalizedSalary: row.finalized_salary || "",
                    indentNumber: row.indent_no || "",
                    designation: row.designation || row.lookup_designation || "",
                    department: row.joining_place || row.designation || "",
                    contactNo: row.mobile_no || "",
                    email: row.personal_email_id || "",
                    letterAttachment: row.letter_attachment || "",
                    stage2_planned: plan,
                    stage2_actual: act,
                    stage2_status: row.stage2_status || "",
                    stage2_time_delay: row.stage2_time_delay || "",
                    isPending: !!plan && !act,
                    isHistory: !!plan && !!act,
                    rawRow: row
                };
            });

            setCandidateData(processed);
        } catch (error) {
            console.error("JoiningLetterRelease Data Fetch Error:", error);
            toast.error("Failed to load joining records");
        } finally {
            setTableLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleActionClick = (candidate) => {
        setSelectedCandidate(candidate);
        setFormData({
            status: "Yes",
            attachmentUrl: candidate.letterAttachment || ""
        });
        setShowModal(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading(`Uploading ${file.name}...`);
        try {
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dhbtn1ecx";
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "hrms_unsigned";

            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            uploadFormData.append("upload_preset", uploadPreset);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: "POST",
                body: uploadFormData
            });
            const data = await res.json();
            if (data.secure_url) {
                setFormData(p => ({ ...p, attachmentUrl: data.secure_url }));
                toast.success("Joining Letter uploaded successfully!", { id: toastId });
            } else {
                console.error("Cloudinary upload failed:", data);
                throw new Error(data.error?.message || "Upload failed");
            }
        } catch (err) {
            console.error("Cloudinary upload error:", err);
            toast.error(`Upload failed: ${err.message || 'Please try again'}`, { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.status) {
            toast.error("Please select a status");
            return;
        }

        setSubmitting(true);
        try {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            const today = `${d}-${m}-${y}`;

            const nextPlanned = formData.status === "Yes" ? today : "";

            // 1. Update joining_fms in Supabase
            const { error: updErr } = await supabase
                .from("joining_fms")
                .update({
                    stage2_actual: today,
                    stage2_status: formData.status,
                    letter_attachment: formData.attachmentUrl || "",
                    stage3_planned: nextPlanned,
                    updated_at: new Date().toISOString()
                })
                .eq("id", selectedCandidate.id);

            if (updErr) throw updErr;

            // 2. Submit to DATA RESPONSE audit log
            await recordDataResponse({
                uniqueId: selectedCandidate.indentNumber || `${selectedCandidate.id}`,
                stepCode: "J-2",
                status: formData.status,
                attachment: formData.attachmentUrl || "",
                contactPersonName: selectedCandidate.candidateName || "",
                contactNo: selectedCandidate.contactNo || ""
            });

            toast.success("Joining Letter Release status submitted!");
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit decision");
        } finally {
            setSubmitting(false);
        }
    };

    // Metrics
    const pendingCount = useMemo(() => {
        return candidateData.filter(i => i.isPending).length;
    }, [candidateData]);

    const historyCount = useMemo(() => {
        return candidateData.filter(i => i.isHistory).length;
    }, [candidateData]);

    const totalCount = candidateData.length;

    const filteredData = useMemo(() => {
        return candidateData.filter((item) => {
            const matchesTab = activeTab === "pending" ? item.isPending : item.isHistory;

            const term = searchTerm.toLowerCase();
            const matchesSearch = (
                (item.candidateName || "").toLowerCase().includes(term) ||
                (String(item.id) || "").toLowerCase().includes(term) ||
                (item.employeeCode || "").toLowerCase().includes(term) ||
                (item.indentNumber || "").toLowerCase().includes(term) ||
                (item.designation || "").toLowerCase().includes(term) ||
                (item.contactNo || "").toLowerCase().includes(term)
            );

            const matchesDept = !deptFilter || item.department === deptFilter;
            const matchesDesig = !desigFilter || item.designation === desigFilter;

            return matchesTab && matchesSearch && matchesDept && matchesDesig;
        });
    }, [candidateData, searchTerm, activeTab, deptFilter, desigFilter]);

    const departments = useMemo(() => {
        return [...new Set(candidateData.map(item => item.department))].filter(Boolean).sort();
    }, [candidateData]);

    const designations = useMemo(() => {
        return [...new Set(candidateData.map(item => item.designation))].filter(Boolean).sort();
    }, [candidateData]);

    return (
        <div className="space-y-6 page-content p-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Send className="w-3 h-3 text-purple-600" />
                            HR-Joining FMS
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                            J-2 Stage
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                        Joining Letter Release
                    </h1>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Issue, upload and track signed appointment letters & formal offer releases for onboarded staff.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchData}
                        disabled={tableLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${tableLoading ? "animate-spin text-purple-600" : "text-slate-500"}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Top Stat Cards Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pending */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-amber-200 transition-all">
                    <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Pending Letters
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                {pendingCount}
                            </span>
                            <span className="text-xs font-medium text-slate-400">candidates</span>
                        </div>
                        <div className="text-[11px] font-semibold text-amber-600">
                            Awaiting J-2 appointment letter release
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Action Required
                        </span>
                    </div>
                </div>

                {/* Completed */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-purple-200 transition-all">
                    <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Released Letters
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                {historyCount}
                            </span>
                            <span className="text-xs font-medium text-slate-400">issued</span>
                        </div>
                        <div className="text-[11px] font-semibold text-purple-600">
                            Letters issued & sent to J-3
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-800 bg-purple-100/80 border border-purple-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Check className="w-3 h-3 text-purple-600" />
                            Completed
                        </span>
                    </div>
                </div>

                {/* Total */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-blue-200 transition-all">
                    <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Total Joining Records
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                {totalCount}
                            </span>
                            <span className="text-xs font-medium text-slate-400">records</span>
                        </div>
                        <div className="text-[11px] font-semibold text-blue-600">
                            Joining FMS pipeline pool
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-800 bg-blue-100/80 border border-blue-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                            Joining FMS
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 relative z-30" style={{ position: "relative", zIndex: 30 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by candidate name, Emp code, indent, designation..."
                            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <FilterDropdown
                            icon={Building2}
                            label="Department / Place"
                            allLabel="All Locations"
                            value={deptFilter}
                            onChange={(val) => setDeptFilter(val)}
                            options={departments}
                            count={departments.length}
                        />

                        <FilterDropdown
                            icon={Briefcase}
                            label="Post"
                            allLabel="All Posts"
                            value={desigFilter}
                            onChange={(val) => setDesigFilter(val)}
                            options={designations}
                            count={designations.length}
                        />

                        {(searchTerm || deptFilter || desigFilter) && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setDeptFilter("");
                                    setDesigFilter("");
                                }}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold rounded-xl border border-rose-200/60 transition-colors cursor-pointer"
                                title="Clear Filters"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Table Container with Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden relative z-10" style={{ position: "relative", zIndex: 10 }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 px-6 pt-4 gap-3 bg-white">
                    <nav className="flex space-x-2">
                        <button
                            onClick={() => setActiveTab("pending")}
                            className={`pb-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                                activeTab === "pending"
                                    ? "border-purple-600 text-purple-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            <span>Pending Letters</span>
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                activeTab === "pending"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}>
                                {pendingCount}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("history")}
                            className={`pb-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                                activeTab === "history"
                                    ? "border-emerald-600 text-emerald-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Letter History</span>
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                activeTab === "history"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}>
                                {historyCount}
                            </span>
                        </button>
                    </nav>

                    <div className="text-xs font-semibold text-slate-500 pb-3 sm:pb-0">
                        Showing <span className="text-slate-900 font-bold">{filteredData.length}</span> candidates
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/80 text-slate-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    {activeTab === "pending" ? "Action" : "Completed At"}
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Emp Code
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Indent No / ID
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600 min-w-[200px]">
                                    Candidate Name
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Designation
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Finalized Salary
                                </th>
                                <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Letter Attachment
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {tableLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-xs font-semibold text-slate-600">Loading J-2 joining letter records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                <FileCheck className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700">No records found</p>
                                            <p className="text-xs text-slate-400 text-center">
                                                {activeTab === "pending"
                                                    ? "There are currently no candidates pending joining letter release."
                                                    : "No history records found matching your filters."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, index) => (
                                    <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            {activeTab === "pending" ? (
                                                <button
                                                    onClick={() => handleActionClick(item)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                    <span>Release Letter</span>
                                                </button>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                                    (item.stage2_status || "").toLowerCase() === "yes"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                                }`}>
                                                    {(item.stage2_status || "").toLowerCase() === "yes" ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                                    )}
                                                    <span>{item.stage2_status || "Released"}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-mono border border-slate-200">
                                                {item.employeeCode}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-mono border border-indigo-200/70">
                                                {item.indentNumber || item.customId || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                    {(item.candidateName || "C").charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">{item.candidateName}</div>
                                                    {item.email && (
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Mail className="w-3 h-3 text-slate-400" />
                                                            <span>{item.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-800">
                                            {item.designation || "—"}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-emerald-700">
                                            {item.finalizedSalary ? `₹${item.finalizedSalary}` : "—"}
                                        </td>
                                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                            {item.letterAttachment ? (
                                                <a
                                                    href={getDisplayResumeUrl(item.letterAttachment)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold border border-purple-200"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    <span>View Letter</span>
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 text-xs font-mono">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Release Letter Modal */}
            {showModal && selectedCandidate && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-md border border-slate-100 animate-fadeIn">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 px-6 py-4.5 flex items-center justify-between text-white border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md border border-white/10 shadow-inner">
                                    <Send className="w-5 h-5 text-purple-300" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-wide leading-tight">J-2 Letter Release</h3>
                                    <p className="text-xs text-purple-200 font-medium mt-0.5">Issue Appointment / Joining Letter</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Candidate Summary Card */}
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Candidate</span>
                                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                        {selectedCandidate.employeeCode}
                                    </span>
                                </div>
                                <div className="text-sm font-black text-slate-900">
                                    {selectedCandidate.candidateName}
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                    <span className="font-medium">{selectedCandidate.designation}</span>
                                    <span className="font-bold text-emerald-700">Salary: ₹{selectedCandidate.finalizedSalary || "N/A"}</span>
                                </div>
                            </div>

                            {/* Letter Attachment Upload */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Joining Letter Attachment</label>
                                <div className="flex items-center gap-2">
                                    <label className={`inline-flex items-center gap-2 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        {uploading ? (
                                            <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Upload className="w-3.5 h-3.5" />
                                        )}
                                        <span>{uploading ? "Uploading..." : "Upload Letter"}</span>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,image/*"
                                            disabled={uploading}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Or paste document URL..."
                                        value={formData.attachmentUrl}
                                        onChange={(e) => setFormData(p => ({ ...p, attachmentUrl: e.target.value }))}
                                        className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                {formData.attachmentUrl && (
                                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Letter attached successfully</span>
                                    </div>
                                )}
                            </div>

                            {/* Decision Buttons */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Release Status *</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {[
                                        {
                                            id: "Yes",
                                            label: "Released (Yes)",
                                            icon: CheckCircle2,
                                            activeBg: "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/30 ring-2 ring-purple-500/20",
                                            inactiveBg: "bg-purple-50/50 text-purple-800 border-purple-200 hover:bg-purple-100/70"
                                        },
                                        {
                                            id: "No",
                                            label: "Hold / Delay (No)",
                                            icon: UserX,
                                            activeBg: "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30 ring-2 ring-rose-500/20",
                                            inactiveBg: "bg-rose-50/50 text-rose-800 border-rose-200 hover:bg-rose-100/70"
                                        }
                                    ].map((btn) => {
                                        const isSelected = formData.status === btn.id;
                                        const IconComp = btn.icon;
                                        return (
                                            <button
                                                key={btn.id}
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, status: btn.id }))}
                                                className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                    isSelected ? btn.activeBg : btn.inactiveBg
                                                }`}
                                            >
                                                <IconComp className={`w-4 h-4 ${isSelected ? "text-white" : ""}`} />
                                                <span>{btn.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || uploading}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Submit Release</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JoiningLetterRelease;
