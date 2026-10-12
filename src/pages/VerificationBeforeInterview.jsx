import React, { useEffect, useState, useRef, useMemo } from "react";
import { 
    Search, 
    Clock, 
    Plus, 
    X, 
    CheckCircle, 
    CheckCircle2, 
    RefreshCw, 
    Filter, 
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
    UserX
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

    const selectedDisplay =
        !value || value === "all" ? `${allLabel} ${count !== undefined ? `(${count})` : ""}` : value;

    return (
        <div 
            className={`relative min-w-[180px] ${isOpen ? "z-50" : "z-20"}`} 
            style={{ position: "relative", zIndex: isOpen ? 9999 : 1 }}
            ref={dropdownRef}
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-white border rounded-xl flex items-center justify-between gap-2 transition-all text-left cursor-pointer min-h-[38px] ${
                    isOpen
                        ? "bg-white ring-2 ring-blue-500/20 border-blue-500 shadow-xs"
                        : value && value !== "all"
                        ? "border-blue-300 bg-blue-50/50 text-blue-900 font-semibold shadow-xs"
                        : "border-slate-200 text-slate-700"
                }`}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1 py-0.5">
                    {Icon && (
                        <Icon
                            className={`w-4 h-4 shrink-0 ${
                                value && value !== "all" ? "text-blue-600" : "text-slate-400"
                            }`}
                        />
                    )}
                    <span className="truncate leading-normal block">{selectedDisplay}</span>
                </div>
                <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                />
            </button>

            {isOpen && (
                <div 
                    className="absolute left-0 right-0 sm:right-auto sm:min-w-[240px] top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 animate-fadeIn z-50 ring-1 ring-black/10"
                    style={{ position: "absolute", zIndex: 99999 }}
                >
                    {options.length > 5 && (
                        <div className="px-2.5 pb-2 mb-1 border-b border-slate-100">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={`Search ${label}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-56 overflow-y-auto px-1 space-y-0.5 custom-scrollbar">
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setIsOpen(false);
                                setSearchQuery("");
                            }}
                            className={`w-full px-3 py-2 text-xs text-left rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                !value || value === "all"
                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                    : "text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                            <span>{allLabel}</span>
                            {(!value || value === "all") && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>

                        {filteredOptions.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                    setSearchQuery("");
                                }}
                                className={`w-full px-3 py-2 text-xs text-left rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                    value === opt
                                        ? "bg-blue-50 text-blue-700 font-semibold"
                                        : "text-slate-700 hover:bg-slate-100"
                                }`}
                            >
                                <span className="truncate leading-normal">{opt}</span>
                                {value === opt && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
                            </button>
                        ))}

                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-3 text-xs text-center text-slate-400">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const VerificationBeforeInterview = () => {
    const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
    const getSubmitUrl = () => import.meta.env.VITE_SUBMIT_URL || FETCH_URL;

    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fileUploading, setFileUploading] = useState(false);
    const [indentOptions, setIndentOptions] = useState([]);
    const [fmsDataMap, setFmsDataMap] = useState({});
    const [activeTab, setActiveTab] = useState("pending");
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [actionFormData, setActionFormData] = useState({
        indentNumber: "",
        taskId: "",
        status: "Yes",
    });

    const [formData, setFormData] = useState({
        openPositionDepartment: "",
        designation: "",
        nameOfCandidate: "",
        contactNo: "",
        mailID: "",
        age: "",
        highestQualification: "",
        nativePlace: "",
        currentWorkingLocation: "",
        currentEmploymentStatus: "",
        currentCompany: "",
        currentDesignation: "",
        tenureWithCurrentCompany: "",
        totalWorkExperience: "",
        currentCTC: "",
        expectedCTC: "",
        noticePeriod: "",
        interviewDate: "",
        resumeUrl: "",
        indentNumber: "",
    });

    // Local State Replacement for Store
    const [candidateSelectionData, setCandidateSelectionData] = useState([]);
    const [globalFmsData, setGlobalFmsData] = useState([]);
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
                        trigger_Z: (row.stage2_planned || "").trim(),
                        statusMarker_AA: (row.stage2_actual || "").trim(),
                        statusMarker_W: row.stage2_actual || row.stage2_status || "",
                        stage1_status: row.stage1_status || "",
                        stage1_actual: row.stage1_actual || "",
                        stage2_status: row.stage2_status || "",
                        stage3_planned: row.stage3_planned || "",
                        stage3_actual: row.stage3_actual || "",
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
            console.error("Verification Data Fetch Error:", error);
            toast.error("Failed to load data");
        } finally {
            setStoreLoading(false);
            setTableLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const refreshData = fetchData;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "indentNumber") {
            setFormData((prev) => ({
                ...prev,
                indentNumber: value,
                openPositionDepartment: fmsDataMap[value] || prev.openPositionDepartment,
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileUploading(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = reader.result;
                const response = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
                    method: "POST",
                    body: new URLSearchParams({
                        action: "uploadFile",
                        base64Data: base64Data,
                        fileName: file.name,
                        mimeType: file.type,
                        folderId: "1tSoT0na5lGKAE82z0kDiDNU6ikkHJjA1OayGwV5CFq9tfc3BVrbLl3g-nkyKwHoYIMzTI2aI",
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    setFormData((prev) => ({ ...prev, resumeUrl: result.fileUrl }));
                    toast.success("Resume uploaded successfully!");
                } else {
                    toast.error("Upload failed: " + (result.error || "Unknown error"));
                }
                setFileUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("File upload error");
            setFileUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const newID = `${formData.indentNumber}_${formData.designation}`;
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            const rowData = [];
            rowData[0] = formData.indentNumber; // Column A (Indent Number)
            rowData[1] = newID;     // Column B (Combined ID: Indent_Designation)
            rowData[2] = formData.openPositionDepartment; // Column C
            rowData[3] = formData.designation; // Column D
            rowData[4] = formData.nameOfCandidate; // Column E
            rowData[5] = formData.contactNo; // Column F
            rowData[6] = formData.mailID; // Column G
            rowData[7] = formData.age; // Column H
            rowData[8] = formData.highestQualification; // Column I
            rowData[9] = formData.nativePlace; // Column J
            rowData[10] = formData.currentWorkingLocation; // Column K
            rowData[11] = formData.currentEmploymentStatus; // Column L
            rowData[12] = formData.currentCompany; // Column M
            rowData[13] = formData.currentDesignation; // Column N
            rowData[14] = formData.tenureWithCurrentCompany; // Column O
            rowData[15] = formData.totalWorkExperience; // Column P
            rowData[16] = formData.currentCTC; // Column Q
            rowData[17] = formData.expectedCTC; // Column R
            rowData[18] = formData.noticePeriod; // Column S
            rowData[19] = formData.interviewDate; // Column T
            rowData[20] = formData.resumeUrl; // Column U
            rowData[21] = timestamp; // Column V (Timestamp)

            console.log("Submitting Row Data to 'appsheet db':", rowData);

            const response = await fetch(getSubmitUrl(), {
                method: "POST",
                body: new URLSearchParams({
                    sheetName: "appsheet db",
                    action: "bulkInsert",
                    rowsData: JSON.stringify([rowData]),
                }),
            });

            const result = await response.json();
            console.log("Submission Result:", result);

            if (result.success) {
                toast.success("Verification data submitted successfully!");
                setShowModal(false);
                setFormData({
                    openPositionDepartment: "",
                    designation: "",
                    nameOfCandidate: "",
                    contactNo: "",
                    mailID: "",
                    age: "",
                    highestQualification: "",
                    nativePlace: "",
                    currentWorkingLocation: "",
                    currentEmploymentStatus: "",
                    currentCompany: "",
                    currentDesignation: "",
                    tenureWithCurrentCompany: "",
                    totalWorkExperience: "",
                    currentCTC: "",
                    expectedCTC: "",
                    noticePeriod: "",
                    interviewDate: "",
                    resumeUrl: "",
                    indentNumber: "",
                });
                refreshData();
            } else {
                toast.error("Submission failed: " + result.error);
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleActionClick = (candidate) => {
        setSelectedCandidate(candidate);
        setActionFormData({
            indentNumber: candidate.indentId || "",
            taskId: candidate.id || "",
            status: "Yes",
        });
        setShowActionModal(true);
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        const { status } = actionFormData;
        const candidate = selectedCandidate;

        if (!status) {
            toast.error("Please select a status");
            return;
        }

        setActionSubmitting(true);
        try {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            const today = `${d}-${m}-${y}`;

            // If Yes/Selected -> Step 3 (Final Selection) planned date becomes today
            const nextPlanned = (status === "Yes" || status === "Selected") ? today : "";

            const updates = {
                stage2_status: status === "Yes" ? "Selected" : status,
                stage2_actual: today,
                stage3_planned: nextPlanned,
                updated_at: new Date().toISOString()
            };

            // 1. Update candidate_selection table in Supabase
            const { error: updErr } = await supabase
                .from("candidate_selection")
                .update(updates)
                .eq("id", candidate.id);

            if (updErr) throw updErr;

            // 2. Submit to DATA RESPONSE table
            await recordDataResponse({
                uniqueId: candidate.displayId || `${candidate.id}`,
                stepCode: "CS-2",
                status: status === "Yes" ? "Selected" : status,
                contactPersonName: candidate.candidateName || "",
                contactNo: candidate.contactNo || ""
            });

            toast.success(`Verification ${status} submitted successfully!`);
            setShowActionModal(false);
            fetchData();
        } catch (error) {
            console.error("Action error:", error);
            toast.error("Something went wrong");
        } finally {
            setActionSubmitting(false);
        }
    };

    const pendingCount = candidateData.filter(item => {
        const hasZ = !!(item.trigger_Z && item.trigger_Z.toString().trim());
        const hasAA = !!(item.statusMarker_AA && item.statusMarker_AA.toString().trim());
        return hasZ && !hasAA;
    }).length;

    const historyCount = candidateData.filter(item => {
        const hasZ = !!(item.trigger_Z && item.trigger_Z.toString().trim());
        const hasAA = !!(item.statusMarker_AA && item.statusMarker_AA.toString().trim());
        return hasZ && hasAA;
    }).length;

    const filteredData = candidateData.filter((item) => {
        const term = searchTerm.toLowerCase();
        const hasZ = !!(item.trigger_Z && item.trigger_Z.toString().trim());
        const hasAA = !!(item.statusMarker_AA && item.statusMarker_AA.toString().trim());

        const matchesTab =
            activeTab === "pending"
                ? (hasZ && !hasAA)   // ✅ Z filled, AA empty
                : (hasZ && hasAA);   // ✅ Z filled, AA filled

        const matchesSearch = (
            (item.candidateName || "").toLowerCase().includes(term) ||
            (item.id || "").toLowerCase().includes(term) ||
            (item.designation || "").toLowerCase().includes(term) ||
            (item.department || "").toLowerCase().includes(term) ||
            (item.contactNo || "").toLowerCase().includes(term) ||
            (item.mail || "").toLowerCase().includes(term)
        );

        const matchesDept = !deptFilter || item.department === deptFilter;
        const matchesDesig = !desigFilter || item.designation === desigFilter;

        return matchesTab && matchesSearch && matchesDept && matchesDesig;
    });

    const departments = [...new Set(candidateData.map(item => item.department))].filter(Boolean).sort();
    const designations = [...new Set(candidateData.map(item => item.designation))].filter(Boolean).sort();

    return (
        <div className="space-y-6 page-content p-4 md:p-6 bg-slate-50/50 min-h-screen">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Recruitment Pipeline</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        Verification After Interview
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            CS-2 Stage
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Manage post-interview verification records and approve candidates for the next hiring steps.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchData}
                        disabled={tableLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${tableLoading ? "animate-spin text-blue-600" : ""}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Verification</span>
                    </button>
                </div>
            </div>

            {/* Enhanced KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: Pending Actions */}
                <div 
                    onClick={() => setActiveTab("pending")}
                    className={`relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-orange-500/5 border transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                        activeTab === "pending"
                            ? "border-amber-300 ring-2 ring-amber-500/20 bg-amber-50/30"
                            : "border-slate-200/80 hover:border-amber-300"
                    }`}
                >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-amber-400/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                    
                    <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="space-y-1.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Pending Actions
                            </span>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                    {pendingCount}
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400">candidates</span>
                            </div>
                            <p className="text-[11px] font-medium text-amber-700/90 pt-0.5">
                                Awaiting CS-2 decision
                            </p>
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
                </div>

                {/* Card 2: Completed Verifications */}
                <div 
                    onClick={() => setActiveTab("history")}
                    className={`relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/5 border transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                        activeTab === "history"
                            ? "border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/30"
                            : "border-slate-200/80 hover:border-emerald-300"
                    }`}
                >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                    
                    <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="space-y-1.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Completed Verifications
                            </span>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                    {historyCount}
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400">verified</span>
                            </div>
                            <p className="text-[11px] font-medium text-emerald-700/90 pt-0.5">
                                Approved candidate history
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2.5">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                Verified
                            </span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Total Pipeline Records */}
                <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-white to-indigo-500/5 border border-slate-200/80 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 group">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-blue-400/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                    
                    <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="space-y-1.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Total Records
                            </span>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                    {candidateData.length}
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400">total records</span>
                            </div>
                            <p className="text-[11px] font-medium text-blue-700/90 pt-0.5">
                                Overall verification pool
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2.5">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-800 bg-blue-100/80 border border-blue-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                                <ShieldCheck className="w-3 h-3 text-blue-600" />
                                Pipeline Total
                            </span>
                        </div>
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
                            placeholder="Search by candidate name, ID, department, post..."
                            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
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
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            <span>Pending Verification</span>
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                activeTab === "pending"
                                    ? "bg-blue-100 text-blue-700"
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
                            <span>Verification History</span>
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
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {tableLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-xs font-semibold text-slate-600">Loading candidate verification records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700">No data found</p>
                                            <p className="text-xs text-slate-400 text-center">
                                                {activeTab === "pending"
                                                    ? "There are currently no candidates pending verification in this stage."
                                                    : "No verification history records found matching your filters."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, index) => (
                                    <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            {activeTab === "pending" ? (
                                                <button
                                                    onClick={() => handleActionClick(item)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    <span>Take Action</span>
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>{item.statusMarker_W || "Verified"}</span>
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
                                                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {(item.candidateName || "C").charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">{item.candidateName}</div>
                                                    {item.mail && (
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add New Verification Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-4xl border border-slate-100 animate-fadeIn">
                        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-white/10 text-white backdrop-blur-xs">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold">Add New Verification</h3>
                                    <p className="text-xs text-slate-300">Submit new candidate record for post-interview verification</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Indent Number *</label>
                                    <select
                                        name="indentNumber"
                                        value={formData.indentNumber}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                        required
                                    >
                                        <option value="">Select Indent</option>
                                        {indentOptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Open Position Department *</label>
                                    <input
                                        type="text"
                                        name="openPositionDepartment"
                                        value={formData.openPositionDepartment}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Sales, HR, IT"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Designation *</label>
                                    <input
                                        type="text"
                                        name="designation"
                                        value={formData.designation}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Manager"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Name of Candidate *</label>
                                    <input
                                        type="text"
                                        name="nameOfCandidate"
                                        value={formData.nameOfCandidate}
                                        onChange={handleInputChange}
                                        placeholder="Full Name"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Contact No. *</label>
                                    <input
                                        type="text"
                                        name="contactNo"
                                        value={formData.contactNo}
                                        onChange={handleInputChange}
                                        placeholder="Phone Number"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Mail ID *</label>
                                    <input
                                        type="email"
                                        name="mailID"
                                        value={formData.mailID}
                                        onChange={handleInputChange}
                                        placeholder="name@email.com"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Age</label>
                                    <input
                                        type="number"
                                        name="age"
                                        value={formData.age}
                                        onChange={handleInputChange}
                                        placeholder="Age"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Highest Qualification</label>
                                    <input
                                        type="text"
                                        name="highestQualification"
                                        value={formData.highestQualification}
                                        onChange={handleInputChange}
                                        placeholder="Degree / Diploma"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Native Place</label>
                                    <input
                                        type="text"
                                        name="nativePlace"
                                        value={formData.nativePlace}
                                        onChange={handleInputChange}
                                        placeholder="City / State"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Current Working Location</label>
                                    <input
                                        type="text"
                                        name="currentWorkingLocation"
                                        value={formData.currentWorkingLocation}
                                        onChange={handleInputChange}
                                        placeholder="Location"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Current Employment Status</label>
                                    <select
                                        name="currentEmploymentStatus"
                                        value={formData.currentEmploymentStatus}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Employed">Employed</option>
                                        <option value="Unemployed">Unemployed</option>
                                        <option value="Freelance">Freelance</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Current Company</label>
                                    <input
                                        type="text"
                                        name="currentCompany"
                                        value={formData.currentCompany}
                                        onChange={handleInputChange}
                                        placeholder="Company Name"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Current Designation</label>
                                    <input
                                        type="text"
                                        name="currentDesignation"
                                        value={formData.currentDesignation}
                                        onChange={handleInputChange}
                                        placeholder="Designation"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Tenure with Current Company</label>
                                    <input
                                        type="text"
                                        name="tenureWithCurrentCompany"
                                        value={formData.tenureWithCurrentCompany}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 2 Years"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Total Work Experience</label>
                                    <input
                                        type="text"
                                        name="totalWorkExperience"
                                        value={formData.totalWorkExperience}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 5 Years"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Current CTC (LPA)</label>
                                    <input
                                        type="text"
                                        name="currentCTC"
                                        value={formData.currentCTC}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 4.5"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Expected CTC (LPA)</label>
                                    <input
                                        type="text"
                                        name="expectedCTC"
                                        value={formData.expectedCTC}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 6.0"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Notice Period</label>
                                    <input
                                        type="text"
                                        name="noticePeriod"
                                        value={formData.noticePeriod}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 30 Days / Immediate"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">Interview Date with HR SPOC</label>
                                    <input
                                        type="date"
                                        name="interviewDate"
                                        value={formData.interviewDate}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium text-slate-800"
                                    />
                                </div>

                                <div className="md:col-span-3 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <label className="block text-xs font-semibold text-slate-700">Candidate Resume / CV</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            onChange={handleFileUpload}
                                            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                        />
                                        {fileUploading && <Clock className="animate-spin text-blue-600 shrink-0" size={18} />}
                                        {formData.resumeUrl && <CheckCircle className="text-emerald-600 shrink-0" size={18} />}
                                    </div>
                                    {formData.resumeUrl && (
                                        <p className="text-[11px] text-emerald-600 font-medium">✓ Resume uploaded successfully</p>
                                    )}
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
                                    disabled={submitting || fileUploading}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Submit Verification</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Take Action Modal */}
            {showActionModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-md border border-slate-100 animate-fadeIn">
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4.5 flex items-center justify-between text-white border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md border border-white/10 shadow-inner">
                                    <Sparkles className="w-5 h-5 text-indigo-300" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-wide leading-tight">Verification Decision</h3>
                                    <p className="text-xs text-indigo-200 font-medium mt-0.5">Submit approval status for this candidate</p>
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
                                            {selectedCandidate?.indentNumber || selectedCandidate?.indentId || selectedCandidate?.id}
                                        </span>
                                        <span className="font-mono text-xs font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                            #{selectedCandidate?.id}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-sm font-black text-slate-900">
                                    {selectedCandidate?.candidateName}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-slate-700 font-medium border border-slate-200">
                                        {selectedCandidate?.department}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium text-slate-700">
                                        {selectedCandidate?.designation}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Indent Number</label>
                                <input
                                    type="text"
                                    value={actionFormData.indentNumber || selectedCandidate?.indentNumber || selectedCandidate?.indentId || selectedCandidate?.id || ""}
                                    readOnly
                                    className="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl font-mono text-indigo-900 font-bold cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Verification Status *</label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {[
                                        {
                                            id: "Yes",
                                            label: "Yes",
                                            icon: CheckCircle2,
                                            activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20",
                                            inactiveBg: "bg-emerald-50/50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70"
                                        },
                                        {
                                            id: "Hold",
                                            label: "Hold",
                                            icon: Clock,
                                            activeBg: "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30 ring-2 ring-amber-500/20",
                                            inactiveBg: "bg-amber-50/50 text-amber-800 border-amber-200 hover:bg-amber-100/70"
                                        },
                                        {
                                            id: "No",
                                            label: "No",
                                            icon: XCircle,
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
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
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

export default VerificationBeforeInterview;
