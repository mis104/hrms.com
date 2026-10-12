import React, { useEffect, useState, useMemo, useRef } from "react";
import { 
    Laptop, 
    Smartphone, 
    Mail, 
    CheckCircle2, 
    Clock, 
    Search, 
    X, 
    Filter, 
    RotateCcw, 
    ChevronDown, 
    Check, 
    RefreshCw, 
    Sparkles, 
    ShieldCheck, 
    ExternalLink, 
    Send, 
    Layers, 
    User, 
    Phone, 
    Briefcase, 
    FileText,
    Cpu,
    Radio,
    Edit3,
    Save
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase, recordDataResponse } from "../services/supabaseService";

// Custom Searchable Filter Dropdown Component
const FilterDropdown = ({ label, options, value, onChange, placeholder = "Select...", icon: Icon, count, allLabel = "All" }) => {
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
                            filteredOptions.map((opt) => {
                                const isSelected = value === opt;
                                return (
                                    <button
                                        key={opt}
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

const AssetAssignment = () => {
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
        assets: ["LAPTOP", "GMAIL", "ID CARD"],
        laptopDetails: "",
        mobileDetails: "",
        gmailId: ""
    });
    const [customAssetInput, setCustomAssetInput] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const assetOptions = ["LAPTOP", "MOBILE", "SIM", "GMAIL", "ID CARD", "KEYBOARD / MOUSE", "BAG", "BIKE / VEHICLE", "DESK / CABIN", "PPE / UNIFORM"];

    const fetchData = async () => {
        setTableLoading(true);
        try {
            const { data, error } = await supabase
                .from("joining_fms")
                .select("id, employee_code, candidate_name, finalized_salary, indent_no, designation, lookup_designation, joining_place, mobile_no, personal_email_id, laptop_brand_model, mobile_brand_sim, gmail_id, assets, stage5_planned, stage5_actual, stage5_status, stage5_update")
                .order("id", { ascending: false });

            if (error) throw error;

            const processed = (data || []).map(row => {
                const plan = (row.stage5_planned || "").trim();
                const act = (row.stage5_actual || "").trim();

                return {
                    id: row.id,
                    customId: row.id,
                    employeeCode: row.employee_code || "—",
                    candidateName: row.candidate_name || "",
                    finalizedSalary: row.finalized_salary || "",
                    indentNumber: row.indent_no || (row.id && row.id.includes("_") ? row.id.split("_")[0] : ""),
                    designation: row.designation || row.lookup_designation || "",
                    department: row.joining_place || row.designation || "",
                    contactNo: row.mobile_no || "",
                    email: row.personal_email_id || "",
                    laptopDetails: row.laptop_brand_model || "",
                    mobileDetails: row.mobile_brand_sim || "",
                    gmailId: row.gmail_id || "",
                    assetsAssigned: row.assets || "",
                    stage5_planned: plan,
                    stage5_actual: act,
                    stage5_status: row.stage5_status || "",
                    stage5_update: row.stage5_update || "",
                    isPending: !!plan && !act,
                    isHistory: !!plan && !!act,
                    rawRow: row
                };
            });

            setCandidateData(processed);
        } catch (error) {
            console.error("AssetAssignment Data Fetch Error:", error);
            toast.error("Failed to load asset records");
        } finally {
            setTableLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleActionClick = (candidate) => {
        setSelectedCandidate(candidate);
        let existingAssets = [];
        if (candidate.assetsAssigned && candidate.assetsAssigned !== "None" && candidate.assetsAssigned !== "-") {
            existingAssets = candidate.assetsAssigned.split(",").map(s => s.trim()).filter(Boolean);
        } else if (activeTab === "pending") {
            existingAssets = ["LAPTOP", "GMAIL", "ID CARD"];
        }

        setFormData({
            status: candidate.stage5_status || "Yes",
            assets: existingAssets,
            laptopDetails: candidate.laptopDetails || "",
            mobileDetails: candidate.mobileDetails || "",
            gmailId: candidate.gmailId || (candidate.candidateName ? `${candidate.candidateName.toLowerCase().replace(/\s+/g, '')}@piramalpetro.com` : "")
        });
        setCustomAssetInput("");
        setShowModal(true);
    };

    const handleAssetToggle = (asset) => {
        setFormData(prev => {
            const exists = prev.assets.includes(asset);
            return {
                ...prev,
                assets: exists ? prev.assets.filter(a => a !== asset) : [...prev.assets, asset]
            };
        });
    };

    const handleAddCustomAsset = (e) => {
        if (e) e.preventDefault();
        const val = customAssetInput.trim().toUpperCase();
        if (!val) return;
        if (!formData.assets.includes(val)) {
            setFormData(prev => ({ ...prev, assets: [...prev.assets, val] }));
        }
        setCustomAssetInput("");
    };

    const handleRemoveAsset = (assetToRemove) => {
        setFormData(prev => ({
            ...prev,
            assets: prev.assets.filter(a => a !== assetToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.status) {
            toast.error("Please select a status");
            return;
        }

        setSubmitting(true);
        try {
            const assetsJoined = formData.assets.length > 0 ? formData.assets.join(", ") : "None";
            const targetId = selectedCandidate.customId || selectedCandidate.employeeCode || selectedCandidate.candidateName;

            // 1. Direct update to joining_fms table
            const directUpdates = {
                assets: assetsJoined,
                laptop_brand_model: formData.laptopDetails,
                mobile_brand_sim: formData.mobileDetails,
                gmail_id: formData.gmailId,
                stage5_status: formData.status,
                updated_at: new Date().toISOString()
            };
            if (activeTab === "pending" || !selectedCandidate.stage5_actual) {
                const now = new Date();
                const d = String(now.getDate()).padStart(2, '0');
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const y = now.getFullYear();
                directUpdates.stage5_actual = `${d}-${m}-${y}`;
                directUpdates.stage5_update = 'DONE';
            }

            if (selectedCandidate.id) {
                await supabase.from("joining_fms").update(directUpdates).eq("id", selectedCandidate.id);
            }

            // 2. Also log to data_response
            await recordDataResponse({
                uniqueId: targetId,
                stepCode: "J-5",
                status: formData.status,
                laptopBrandModel: formData.laptopDetails,
                assets: assetsJoined,
                mobileBrandSim: formData.mobileDetails,
                gmailId: formData.gmailId,
                contactPersonName: selectedCandidate.candidateName,
                contactNo: selectedCandidate.contactNo
            });

            toast.success(activeTab === "history" ? "Asset allocation details updated successfully!" : "IT Assets & credentials assigned successfully!");
            setShowModal(false);
            fetchData();
        } catch (err) {
            console.error("Submit error:", err);
            toast.error("Failed to save asset details");
        } finally {
            setSubmitting(false);
        }
    };

    // Metrics
    const pendingCount = useMemo(() => candidateData.filter(i => i.isPending).length, [candidateData]);
    const historyCount = useMemo(() => candidateData.filter(i => i.isHistory).length, [candidateData]);
    const totalCount = candidateData.length;

    // Filtered Data
    const filteredData = useMemo(() => {
        return candidateData.filter((item) => {
            const term = searchTerm.toLowerCase();
            const matchesTab = activeTab === "pending" ? item.isPending : item.isHistory;

            const matchesSearch = (
                (item.candidateName || "").toLowerCase().includes(term) ||
                (item.employeeCode || "").toLowerCase().includes(term) ||
                (item.customId || "").toLowerCase().includes(term) ||
                (item.indentNumber || "").toLowerCase().includes(term) ||
                (item.designation || "").toLowerCase().includes(term) ||
                (item.laptopDetails || "").toLowerCase().includes(term) ||
                (item.gmailId || "").toLowerCase().includes(term)
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

    const hasActiveFilters = Boolean(searchTerm || deptFilter || desigFilter);

    const clearAllFilters = () => {
        setSearchTerm("");
        setDeptFilter("");
        setDesigFilter("");
    };

    return (
        <div className="space-y-6 page-content p-6 animate-fadeIn">
            {/* Header with Title and Quick Refresh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                            Joining Pipeline
                        </span>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                            Stage J-5 • IT & Hardware Handover
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
                        <span>IT Assets & Access Assignment</span>
                        <Sparkles className="w-5 h-5 text-teal-500 animate-pulse hidden sm:inline-block" />
                    </h1>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Assign laptops, corporate emails, mobile SIMs, and hardware access credentials to inductees.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchData}
                        disabled={tableLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${tableLoading ? "animate-spin text-teal-600" : "text-slate-500"}`} />
                        <span>Refresh Data</span>
                    </button>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Candidates Card */}
                <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-slate-700 before:to-slate-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total In Pipeline</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                                {tableLoading ? "..." : totalCount}
                            </h3>
                            <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                Inductees ready for asset deployment
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:scale-110 group-hover:bg-slate-200/70 transition-all shadow-2xs">
                            <Layers className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Pending Card */}
                <div 
                    onClick={() => setActiveTab("pending")}
                    className={`relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer group before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:to-orange-500 ${
                        activeTab === "pending"
                            ? "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-300 shadow-md ring-2 ring-amber-400/30"
                            : "bg-white border-slate-200/80 hover:border-amber-200 hover:shadow-md"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Assignment</p>
                            </div>
                            <h3 className="text-3xl font-black text-amber-900 mt-1 tracking-tight">
                                {tableLoading ? "..." : pendingCount}
                            </h3>
                            <p className="text-[11px] font-semibold text-amber-700/80 mt-1">
                                Awaiting laptop & hardware allocation
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-100 transition-all shadow-2xs">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* History Card */}
                <div 
                    onClick={() => setActiveTab("history")}
                    className={`relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer group before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-teal-500 before:to-emerald-500 ${
                        activeTab === "history"
                            ? "bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-white border-teal-300 shadow-md ring-2 ring-teal-400/30"
                            : "bg-white border-slate-200/80 hover:border-teal-200 hover:shadow-md"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-teal-500" />
                                <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Completed Assets</p>
                            </div>
                            <h3 className="text-3xl font-black text-teal-900 mt-1 tracking-tight">
                                {tableLoading ? "..." : historyCount}
                            </h3>
                            <p className="text-[11px] font-semibold text-teal-700/80 mt-1">
                                Fully onboarded & asset equipped
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 group-hover:scale-110 group-hover:bg-teal-100 transition-all shadow-2xs">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Tab Section */}
            <div className="relative z-30 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3.5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Tabs */}
                    <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start">
                        <button
                            type="button"
                            onClick={() => setActiveTab("pending")}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "pending"
                                    ? "bg-white text-slate-800 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Clock className={`w-3.5 h-3.5 ${activeTab === "pending" ? "text-amber-500" : "text-slate-400"}`} />
                            <span>Pending Allocation</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                activeTab === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-200/70 text-slate-600"
                            }`}>
                                {pendingCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("history")}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "history"
                                    ? "bg-white text-slate-800 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === "history" ? "text-teal-600" : "text-slate-400"}`} />
                            <span>Allocation History</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                activeTab === "history" ? "bg-teal-100 text-teal-800" : "bg-slate-200/70 text-slate-600"
                            }`}>
                                {historyCount}
                            </span>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by Employee Code, ID, Name, Assets, Gmail..."
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Row */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                        <Filter className="w-3 h-3 text-slate-400" />
                        Filters:
                    </span>

                    <FilterDropdown
                        label="Department / Place"
                        options={departments}
                        value={deptFilter}
                        onChange={setDeptFilter}
                        count={departments.length}
                        allLabel="All Locations"
                        icon={Briefcase}
                    />

                    <FilterDropdown
                        label="Designation"
                        options={designations}
                        value={desigFilter}
                        onChange={setDesigFilter}
                        count={designations.length}
                        allLabel="All Designations"
                        icon={Briefcase}
                    />

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 rounded-xl transition-all cursor-pointer ml-auto"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Filters</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Candidate Table Section */}
            <div className="relative z-10 bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-slate-200 border-b border-slate-800 text-[11px] uppercase font-bold tracking-wider">
                                <th className="py-3.5 px-4 text-center">Action</th>
                                <th className="py-3.5 px-4">Emp Code</th>
                                <th className="py-3.5 px-4">ID / Designation</th>
                                <th className="py-3.5 px-4">Candidate Name</th>
                                <th className="py-3.5 px-4">Salary</th>
                                <th className="py-3.5 px-4">Assigned Assets</th>
                                <th className="py-3.5 px-4">Laptop / SIM</th>
                                <th className="py-3.5 px-4">Gmail ID</th>
                                <th className="py-3.5 px-4">Stage 5 Plan</th>
                                <th className="py-3.5 px-4">Stage 5 Actual</th>
                                <th className="py-3.5 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableLoading ? (
                                <tr>
                                    <td colSpan={11} className="py-16 text-center text-slate-400">
                                        <div className="inline-flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center">
                                                <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
                                            </div>
                                            <span className="font-bold text-xs text-slate-600">Loading IT Asset records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-16 text-center text-slate-400">
                                        <div className="inline-flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Laptop className="w-6 h-6" />
                                            </div>
                                            <p className="font-bold text-slate-700 text-sm">No candidate records found</p>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                {activeTab === "pending"
                                                    ? "There are no candidates pending IT asset allocation right now."
                                                    : "No completed IT asset handovers match your current filter."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((candidate) => (
                                    <tr key={candidate.id} className="hover:bg-teal-50/30 transition-colors group">
                                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                            {activeTab === "pending" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleActionClick(candidate)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-teal-500/25 transition-all cursor-pointer active:scale-95"
                                                >
                                                    <Laptop className="w-3.5 h-3.5" />
                                                    <span>Assign Assets</span>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleActionClick(candidate)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs hover:shadow-slate-900/20"
                                                    title="Edit assets and hardware details"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 text-teal-300" />
                                                    <span>Edit / Update</span>
                                                </button>
                                            )}
                                        </td>

                                        {/* Employee Code */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className="font-extrabold text-teal-800 bg-teal-50/80 border border-teal-200/70 px-2.5 py-1 rounded-lg text-[11px] font-mono tracking-tight shadow-2xs">
                                                {candidate.employeeCode || "—"}
                                            </span>
                                        </td>

                                        {/* ID / Designation */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div>
                                                <span className="font-bold text-slate-800">{candidate.customId || "—"}</span>
                                                <div className="text-[11px] text-slate-400 font-medium">{candidate.designation}</div>
                                            </div>
                                        </td>

                                        {/* Candidate Name */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-xs uppercase shrink-0 shadow-2xs">
                                                    {(candidate.candidateName || "?").charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900">{candidate.candidateName}</span>
                                                    {candidate.contactNo && (
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium mt-0.5">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            {candidate.contactNo}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Finalized Salary */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className="font-extrabold text-slate-800 text-xs">
                                                {candidate.finalizedSalary ? `₹ ${candidate.finalizedSalary}` : "—"}
                                            </span>
                                        </td>

                                        {/* Assigned Assets */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {candidate.assetsAssigned ? (
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {candidate.assetsAssigned.split(",").map((a, i) => (
                                                        <span key={i} className="text-[10px] bg-slate-100/90 text-slate-700 border border-slate-200/80 px-2 py-0.5 rounded-md font-bold shadow-2xs">
                                                            {a.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">None</span>
                                            )}
                                        </td>

                                        {/* Laptop / SIM */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="text-xs space-y-0.5">
                                                {candidate.laptopDetails && (
                                                    <div className="text-slate-800 font-semibold flex items-center gap-1.5">
                                                        <Laptop className="w-3.5 h-3.5 text-teal-600" />
                                                        <span>{candidate.laptopDetails}</span>
                                                    </div>
                                                )}
                                                {candidate.mobileDetails && (
                                                    <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                                                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{candidate.mobileDetails}</span>
                                                    </div>
                                                )}
                                                {!candidate.laptopDetails && !candidate.mobileDetails && (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Gmail ID */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {candidate.gmailId ? (
                                                <span className="text-xs text-teal-700 font-semibold flex items-center gap-1 bg-teal-50/60 border border-teal-200/50 px-2 py-0.5 rounded-md">
                                                    <Mail className="w-3 h-3 text-teal-600" />
                                                    {candidate.gmailId}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">—</span>
                                            )}
                                        </td>

                                        {/* Planned Date */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className="font-bold text-slate-600 bg-slate-100/80 border border-slate-200/60 px-2 py-0.5 rounded-md text-[11px] font-mono">
                                                {candidate.stage5_planned || "—"}
                                            </span>
                                        </td>

                                        {/* Actual Date */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {candidate.stage5_actual ? (
                                                <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200/70 px-2 py-0.5 rounded-md text-[11px] font-mono">
                                                    {candidate.stage5_actual}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-[11px]">Pending</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                            {candidate.stage5_status ? (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    {candidate.stage5_status}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Asset Assignment Modal */}
            {showModal && selectedCandidate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-5 text-white flex items-center justify-between border-b border-slate-700/60 shrink-0">
                            <div>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Stage J-5 • {activeTab === "history" ? "Edit IT Allocation" : "IT & Hardware Allocation"}
                                </span>
                                <h3 className="text-lg font-black text-white mt-1 tracking-tight">
                                    {activeTab === "history" ? "Edit Assigned IT Assets & Access" : "Assign IT Assets & Access"}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 border border-slate-700/80 transition-all cursor-pointer shadow-sm"
                                title="Close"
                            >
                                <X className="w-5 h-5 stroke-[2.5]" />
                            </button>
                        </div>

                        {/* Candidate Summary Box */}
                        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-bold text-slate-800">{selectedCandidate.candidateName}</div>
                                    <div className="text-[11px] text-slate-500">{selectedCandidate.designation} • {selectedCandidate.department}</div>
                                </div>
                                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-lg">
                                    {selectedCandidate.employeeCode}
                                </span>
                            </div>
                        </div>

                        {/* Scrollable Form Body */}
                        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
                            {/* Hardware / Asset Checklist */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-slate-800 font-bold">
                                        Assigned Assets ({formData.assets.length}):
                                    </label>
                                    <span className="text-[11px] text-slate-400">Click chips or type custom below</span>
                                </div>

                                {/* Active Selected Assets Tags */}
                                {formData.assets.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                                        {formData.assets.map((asset) => (
                                            <span 
                                                key={asset}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-900 border border-teal-200 rounded-lg font-bold text-xs shadow-2xs animate-fadeIn"
                                            >
                                                <span>{asset}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAsset(asset)}
                                                    className="w-4 h-4 rounded-full hover:bg-teal-200 flex items-center justify-center text-teal-700 hover:text-teal-900 transition-colors cursor-pointer"
                                                    title="Remove asset"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Quick Asset Chips */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {assetOptions.map((asset) => {
                                        const checked = formData.assets.includes(asset);
                                        return (
                                            <button
                                                key={asset}
                                                type="button"
                                                onClick={() => handleAssetToggle(asset)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer select-none leading-normal ${
                                                    checked
                                                        ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                                }`}
                                            >
                                                {checked ? (
                                                    <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                                                ) : (
                                                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0"></span>
                                                )}
                                                <span>{asset}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom Asset Adder Input */}
                                <div className="flex items-center gap-2 pt-1.5">
                                    <input
                                        type="text"
                                        value={customAssetInput}
                                        onChange={(e) => setCustomAssetInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddCustomAsset();
                                            }
                                        }}
                                        placeholder="Type custom asset (e.g. HEADPHONE, ADAPTER, TOKEN)..."
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomAsset}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shrink-0"
                                    >
                                        + Add
                                    </button>
                                </div>
                            </div>

                            {/* Laptop Details */}
                            <div>
                                <label className="block text-slate-700 font-bold mb-1">
                                    Laptop Brand & Model / Asset Tag:
                                </label>
                                <div className="relative">
                                    <Laptop className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.laptopDetails}
                                        onChange={(e) => setFormData(prev => ({ ...prev, laptopDetails: e.target.value }))}
                                        placeholder="e.g. Dell Latitude 3420 (SR: PPPL-LP-042)"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Mobile / SIM Number */}
                            <div>
                                <label className="block text-slate-700 font-bold mb-1">
                                    Mobile Brand & SIM Number (If Any):
                                </label>
                                <div className="relative">
                                    <Smartphone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.mobileDetails}
                                        onChange={(e) => setFormData(prev => ({ ...prev, mobileDetails: e.target.value }))}
                                        placeholder="e.g. Samsung A14 / Airtel SIM 9876543210"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Corporate Gmail / Email ID */}
                            <div>
                                <label className="block text-slate-700 font-bold mb-1">
                                    Official Company Email / Gmail ID:
                                </label>
                                <div className="relative">
                                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={formData.gmailId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, gmailId: e.target.value }))}
                                        placeholder="e.g. name@piramalpetro.com"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-slate-700 font-bold mb-1">
                                    Asset Handover Status:
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 font-semibold"
                                >
                                    <option value="Yes">Yes (Completed & Assigned)</option>
                                    <option value="Done">Done</option>
                                    <option value="Partial">Partial Handover</option>
                                    <option value="Hold">On Hold</option>
                                </select>
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : activeTab === "history" ? (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            <span>Save & Update Assets</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Complete Handover</span>
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

export default AssetAssignment;
