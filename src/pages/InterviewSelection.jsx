import React, { useEffect, useState, useRef, useMemo } from "react";
import { 
    Search, 
    Clock, 
    Plus, 
    X, 
    CheckCircle, 
    CheckCircle2, 
    RefreshCw, 
    Sparkles, 
    User, 
    Building2, 
    Briefcase, 
    Phone, 
    Mail, 
    FileText, 
    Check, 
    AlertCircle, 
    Calendar, 
    ShieldCheck, 
    ChevronDown,
    ArrowRight,
    Users,
    XCircle,
    UserX,
    Award,
    IndianRupee
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { recordDataResponse } from "../services/supabaseService";

// ==========================================
// SEARCHABLE FILTER DROPDOWN POPOVER
// ==========================================
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
        <div className="relative" ref={dropdownRef}>
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
                    className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden animate-fadeIn"
                    style={{ zIndex: 9999 }}
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

const InterviewSelection = () => {
    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [tableLoading, setTableLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [indentOptions, setIndentOptions] = useState([]);
    const [fmsDataMap, setFmsDataMap] = useState({});
    const [actionFormData, setActionFormData] = useState({
        indentNumber: "",
        status: "Selected",
        finalizedSalary: "",
    });

    const [storeLoading, setStoreLoading] = useState(true);

    const fetchData = async () => {
        setStoreLoading(true);
        setTableLoading(true);
        try {
            const [candRes, fmsRes] = await Promise.all([
                supabase
                    .from("candidate_selection")
                    .select("*")
                    .order("id", { ascending: false }),
                supabase
                    .from("fms")
                    .select("position_status, indent_no, open_position_department, designation")
            ]);

            if (candRes.data) {
                const processedData = candRes.data.map((row) => {
                    const indentNo = row.indent_no || row.indent_number || (row.candidate_id && row.candidate_id.includes("_") ? row.candidate_id.split("_")[0] : (row.indent_and_name && row.indent_and_name.includes("_") ? row.indent_and_name.split("_")[0] : (row.id_name && row.id_name.includes("_") ? row.id_name.split("_")[0] : row.candidate_id || row.indent_and_name || "")));

                    return {
                        id: row.id,
                        displayId: row.indent_and_name || row.candidate_id || row.id_name || `ID-${row.id}`,
                        indentId: indentNo || row.indent_and_name || row.candidate_id || "",
                        indentNumber: indentNo || "",
                        department: row.open_position_department || "",
                        designation: row.designation || "",
                        candidateName: row.name_of_candidate || "",
                        contactNo: row.contact_no || "",
                        mail: row.mail_id || "",
                        trigger_AD: (row.stage3_planned || "").trim(),
                        statusMarker_AE: (row.stage3_actual || "").trim(),
                        stage1_status: row.stage1_status || "",
                        stage2_status: row.stage2_status || "",
                        stage3_status: row.stage3_status || "",
                        finalizedSalary: row.finalized_salary || "",
                        stage4_planned: row.stage4_planned || "",
                        stage4_actual: row.stage4_actual || "",
                        resumeUrl: row.resume_url || "",
                        rawRow: row
                    };
                });
                setCandidateData(processedData);
            }

            if (fmsRes.data) {
                const openRows = fmsRes.data.filter(
                    (r) => (r.position_status || "").toUpperCase() === "OPEN"
                );
                const options = openRows.map((r) => r.indent_no).filter(Boolean);
                const mapping = {};
                openRows.forEach((r) => {
                    if (r.indent_no) mapping[r.indent_no] = r.open_position_department || "";
                });
                setIndentOptions([...new Set(options)]);
                setFmsDataMap(mapping);
            }

        } catch (error) {
            console.error("Interview Selection Data Fetch Error:", error);
            toast.error("Failed to load data");
        } finally {
            setStoreLoading(false);
            setTableLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleActionClick = (candidate) => {
        setSelectedCandidate(candidate);
        setActionFormData({
            indentNumber: candidate.indentNumber || candidate.indentId || candidate.id || "",
            status: "Selected",
            finalizedSalary: candidate.finalizedSalary || "",
        });
        setShowActionModal(true);
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        const { status, finalizedSalary } = actionFormData;
        const candidate = selectedCandidate;

        if (!status) {
            toast.error("Please select a decision");
            return;
        }

        setActionSubmitting(true);
        try {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            const today = `${d}-${m}-${y}`;

            // If Selected -> Step 4 (Joining) planned date becomes today
            const nextPlanned = status === "Selected" ? today : "";

            const updates = {
                stage3_status: status,
                stage3_actual: today,
                finalized_salary: finalizedSalary || "",
                stage4_planned: nextPlanned,
                updated_at: new Date().toISOString()
            };

            // 1. Update candidate_selection table in Supabase
            const { error: updErr } = await supabase
                .from("candidate_selection")
                .update(updates)
                .eq("id", candidate.id);

            if (updErr) throw updErr;

            // 2. Submit to DATA RESPONSE audit table
            await recordDataResponse({
                uniqueId: candidate.displayId || `${candidate.id}`,
                stepCode: "CS-3",
                status: status,
                finalizedSalary: finalizedSalary || "",
                contactPersonName: candidate.candidateName || "",
                contactNo: candidate.contactNo || ""
            });

            // 3. Auto-transfer selected candidate to joining_fms table
            if (status === "Selected") {
                const indentOnly = candidate.indentNumber || candidate.indentId || "IND";
                const desigOnly = candidate.designation || "Position";
                const fullTimestamp = `${today} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                // Check if candidate already exists in joining_fms
                const { data: existingRecords } = await supabase
                    .from("joining_fms")
                    .select("id, employee_code")
                    .eq("candidate_name", candidate.candidateName || "")
                    .eq("indent_no", indentOnly);

                if (existingRecords && existingRecords.length > 0) {
                    // Update existing record rather than creating a duplicate
                    await supabase
                        .from("joining_fms")
                        .update({
                            finalized_salary: finalizedSalary || "",
                            salary: finalizedSalary || "",
                            designation: candidate.designation || "",
                            mobile_no: candidate.contactNo || "",
                            personal_email_id: candidate.mail || "",
                            resume_cv_upload: candidate.resumeUrl || "",
                            updated_at: new Date().toISOString()
                        })
                        .eq("id", existingRecords[0].id);
                } else {
                    // Calculate next employee code sequence based on max number
                    const { data: allEmpRows } = await supabase
                        .from("joining_fms")
                        .select("employee_code");
                    
                    let maxEmpNum = 58;
                    (allEmpRows || []).forEach(r => {
                        const m = (r.employee_code || "").match(/PPPL\/EI\/(\d+)/i);
                        if (m) {
                            const val = parseInt(m[1], 10);
                            if (val > maxEmpNum) maxEmpNum = val;
                        }
                    });

                    const employeeCode = `PPPL/EI/${maxEmpNum + 1}`;

                    const joiningPayload = {
                        employee_code: employeeCode,
                        candidate_name: candidate.candidateName || "",
                        finalized_salary: finalizedSalary || "",
                        salary: finalizedSalary || "",
                        timestamp: fullTimestamp,
                        designation: candidate.designation || "",
                        mobile_no: candidate.contactNo || "",
                        personal_email_id: candidate.mail || "",
                        resume_cv_upload: candidate.resumeUrl || "",
                        update_link: "Pending",
                        stage1_planned: null,
                        indent_no: indentOnly,
                        lookup_designation: desigOnly,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const { error: joinErr } = await supabase
                        .from("joining_fms")
                        .insert([joiningPayload]);

                    if (joinErr) {
                        console.warn("Could not auto-insert into joining_fms:", joinErr.message);
                    }
                }
            }

            toast.success(`Final Selection ${status} & transferred to Joining FMS successfully!`);
            setShowActionModal(false);
            fetchData();
        } catch (error) {
            console.error("Action error:", error);
            toast.error("Something went wrong");
        } finally {
            setActionSubmitting(false);
        }
    };

    // Calculate metrics
    const pendingCount = useMemo(() => {
        return candidateData.filter(item => {
            const hasAD = !!(item.trigger_AD && item.trigger_AD.toString().trim());
            const hasAE = !!(item.statusMarker_AE && item.statusMarker_AE.toString().trim());
            return hasAD && !hasAE;
        }).length;
    }, [candidateData]);

    const historyCount = useMemo(() => {
        return candidateData.filter(item => {
            const hasAD = !!(item.trigger_AD && item.trigger_AD.toString().trim());
            const hasAE = !!(item.statusMarker_AE && item.statusMarker_AE.toString().trim());
            return hasAD && hasAE;
        }).length;
    }, [candidateData]);

    const totalCount = candidateData.length;

    const filteredData = useMemo(() => {
        return candidateData.filter((item) => {
            const term = searchTerm.toLowerCase();

            const hasAD = !!(item.trigger_AD && item.trigger_AD.toString().trim());
            const hasAE = !!(item.statusMarker_AE && item.statusMarker_AE.toString().trim());

            const matchesTab = activeTab === "pending"
                ? (hasAD && !hasAE)
                : (hasAD && hasAE);

            const matchesSearch = (
                (item.candidateName || "").toLowerCase().includes(term) ||
                (String(item.id) || "").toLowerCase().includes(term) ||
                (item.indentNumber || "").toLowerCase().includes(term) ||
                (item.indentId || "").toLowerCase().includes(term) ||
                (item.designation || "").toLowerCase().includes(term) ||
                (item.department || "").toLowerCase().includes(term) ||
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
            {/* Header with Title and Quick Refresh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Award className="w-3 h-3 text-indigo-600" />
                            Recruitment Pipeline
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 border border-purple-200/60 px-2.5 py-0.5 rounded-full">
                            CS-3 Stage
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                        Final Selection
                    </h1>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Manage final interview decisions, finalized CTC / compensation, and approve candidates for onboarding.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchData}
                        disabled={tableLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${tableLoading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Top Stat Cards Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pending Selections */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-amber-200 transition-all">
                    <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Pending Decisions
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                {pendingCount}
                            </span>
                            <span className="text-xs font-medium text-slate-400">candidates</span>
                        </div>
                        <div className="text-[11px] font-semibold text-amber-600">
                            Awaiting CS-3 final decision
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

                {/* Completed Selections */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-emerald-200 transition-all">
                    <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Completed Selections
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                {historyCount}
                            </span>
                            <span className="text-xs font-medium text-slate-400">evaluated</span>
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600">
                            Approved & processed history
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Completed
                        </span>
                    </div>
                </div>

                {/* Total Pipeline Records */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-indigo-200 transition-all">
                    <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Total Records
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                {totalCount}
                            </span>
                            <span className="text-xs font-medium text-slate-400">total records</span>
                        </div>
                        <div className="text-[11px] font-semibold text-indigo-600">
                            Overall candidate pool
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 bg-indigo-100/80 border border-indigo-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            Pipeline Total
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
                            placeholder="Search by candidate name, ID, indent, department, post..."
                            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
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
                            label="Department"
                            allLabel="All Departments"
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
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            <span>Pending Selection</span>
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                activeTab === "pending"
                                    ? "bg-indigo-100 text-indigo-700"
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
                            <span>Selection History</span>
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
                                    ID
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Indent No
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600 min-w-[200px]">
                                    Candidate Name
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Department
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Designation
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Contact
                                </th>
                                {activeTab === "history" && (
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                        Finalized CTC
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {tableLoading ? (
                                <tr>
                                    <td colSpan={activeTab === "history" ? "8" : "7"} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-xs font-semibold text-slate-600">Loading candidate selection records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === "history" ? "8" : "7"} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Award className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700">No data found</p>
                                            <p className="text-xs text-slate-400 text-center">
                                                {activeTab === "pending"
                                                    ? "There are currently no candidates pending final selection in this stage."
                                                    : "No selection history records found matching your filters."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, index) => (
                                    <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            {activeTab === "pending" ? (
                                                <button
                                                    onClick={() => handleActionClick(item)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    <span>Take Action</span>
                                                </button>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                                    (item.stage3_status || "").toLowerCase() === "selected"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                                }`}>
                                                    {(item.stage3_status || "").toLowerCase() === "selected" ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                                    )}
                                                    <span>{item.stage3_status || item.statusMarker_AE || "Completed"}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-mono border border-slate-200">
                                                {item.id || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-mono border border-indigo-200/70">
                                                {item.indentNumber || item.indentId || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                    {(item.candidateName || "C").charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">{item.candidateName}</div>
                                                    {item.mail && (
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Mail className="w-3 h-3 text-slate-400" />
                                                            <span>{item.mail}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                                {item.department || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-800">
                                            {item.designation || "—"}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600 font-mono">
                                            {item.contactNo ? (
                                                <span className="inline-flex items-center gap-1 text-slate-700">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    {item.contactNo}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        {activeTab === "history" && (
                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-emerald-700">
                                                {item.finalizedSalary ? `₹${item.finalizedSalary} LPA` : "—"}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Take Action Modal */}
            {showActionModal && selectedCandidate && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-md border border-slate-100 animate-fadeIn">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4.5 flex items-center justify-between text-white border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md border border-white/10 shadow-inner">
                                    <Award className="w-5 h-5 text-indigo-300" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-wide leading-tight">Final Selection Decision</h3>
                                    <p className="text-xs text-indigo-200 font-medium mt-0.5">Submit final hiring & CTC status</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowActionModal(false)}
                                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleActionSubmit} className="p-6 space-y-4">
                            {/* Candidate Summary Card */}
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Candidate</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                            {selectedCandidate.indentNumber || selectedCandidate.indentId || selectedCandidate.id}
                                        </span>
                                        <span className="font-mono text-xs font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                            #{selectedCandidate.id}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-sm font-black text-slate-900">
                                    {selectedCandidate.candidateName}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-slate-700 font-medium border border-slate-200">
                                        {selectedCandidate.department}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium text-slate-700">
                                        {selectedCandidate.designation}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Indent Number</label>
                                <input
                                    type="text"
                                    value={actionFormData.indentNumber || selectedCandidate.indentNumber || selectedCandidate.indentId || selectedCandidate.id || ""}
                                    readOnly
                                    className="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl font-mono text-indigo-900 font-bold cursor-not-allowed"
                                />
                            </div>

                            {/* Selection Decision Buttons */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Selection Decision *</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {[
                                        {
                                            id: "Selected",
                                            label: "Selected",
                                            icon: CheckCircle2,
                                            activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20",
                                            inactiveBg: "bg-emerald-50/50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70"
                                        },
                                        {
                                            id: "Rejected",
                                            label: "Rejected",
                                            icon: UserX,
                                            activeBg: "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30 ring-2 ring-rose-500/20",
                                            inactiveBg: "bg-rose-50/50 text-rose-800 border-rose-200 hover:bg-rose-100/70"
                                        }
                                    ].map((btn) => {
                                        const isSelected = actionFormData.status === btn.id;
                                        const IconComp = btn.icon;
                                        return (
                                            <button
                                                key={btn.id}
                                                type="button"
                                                onClick={() => setActionFormData(p => ({ ...p, status: btn.id }))}
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

                            {/* Finalized Salary Input */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Finalized Salary (LPA)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. 8.5"
                                        value={actionFormData.finalizedSalary}
                                        onChange={(e) => setActionFormData(p => ({ ...p, finalizedSalary: e.target.value }))}
                                        className="w-full pl-8 pr-12 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none font-semibold text-slate-900"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-semibold">LPA</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowActionModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionSubmitting}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {actionSubmitting ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Submit Decision</span>
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

export default InterviewSelection;
