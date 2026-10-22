import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  X,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Layers,
  MapPin,
  Building2,
  Briefcase,
  LayoutList,
  LayoutGrid,
  Hash,
  Award,
  CheckCircle,
  FileText,
  DollarSign,
  Users,
  Timer,
  ExternalLink,
  ChevronDown,
  Check,
  Download,
  Phone,
  Mail,
  Eye,
  UserCheck,
  UserX,
  GraduationCap,
  Paperclip,
  Upload
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import useAuthStore from "../store/authStore";
import { supabase } from "../services/supabaseClient";
import { recordDataResponse } from "../services/supabaseService";

// ==========================================
// CONSTANTS & LOW EGRESS CONFIGURATION
// ==========================================
const CACHE_KEY = "hrms_candidate_selection_cache_v4";
const REF_CACHE_KEY = "hrms_candidate_reference_cache_v4";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// Selective column query for minimal egress
const CANDIDATE_SELECT_COLUMNS = [
  "id",
  "timestamp",
  "candidate_id",
  "open_position_department",
  "designation",
  "name_of_candidate",
  "contact_no",
  "mail_id",
  "age",
  "highest_qualification",
  "native_place",
  "current_working_location",
  "current_employment_status",
  "current_company",
  "current_designation",
  "tenure_with_current_company",
  "total_work_experience",
  "current_ctc",
  "expected_ctc",
  "notice_period",
  "interview_date_with_hr_spoc",
  "resume_url",
  "stage1_planned",
  "stage1_actual",
  "stage1_status",
  "stage1_time_delay",
  "stage2_planned",
  "stage2_actual",
  "stage2_status",
  "stage2_time_delay",
  "stage3_planned",
  "stage3_actual",
  "stage3_status",
  "finalized_salary",
  "stage3_time_delay",
  "stage4_planned",
  "stage4_actual",
  "stage4_status",
  "joining_date",
  "stage4_time_delay",
  "id_name",
  "lookup_designation",
  "indent_and_name",
  "entry_by",
  "created_at",
  "updated_at"
].join(",");

// Standard Date Formatter: DD-MM-YYYY
const formatDisplayDate = (val) => {
  if (!val) return "-";
  const str = String(val).trim();
  if (!str) return "-";

  // If already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    return str.split(" ")[0];
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split("T")[0].split(" ")[0].split("-");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  // Try Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return str;
};

// Current Date in DD-MM-YYYY
const getTodayFormatted = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
};

// Tomorrow Date (1 day after Timestamp) in DD-MM-YYYY
const getTomorrowFormatted = () => {
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  const d = String(tmrw.getDate()).padStart(2, "0");
  const m = String(tmrw.getMonth() + 1).padStart(2, "0");
  const y = tmrw.getFullYear();
  return `${d}-${m}-${y}`;
};

// Safely resolve Cloudinary document link to avoid browser 401 PDF errors
const getDisplayResumeUrl = (url) => {
  if (!url) return "";
  const str = String(url).trim();
  if (str.includes("res.cloudinary.com") && str.includes("/image/upload/") && str.toLowerCase().endsWith(".pdf")) {
    return str.replace(/\.pdf$/i, ".jpg");
  }
  return str;
};

// Current Timestamp in DD-MM-YYYY HH:mm:ss
const getNowTimestampFormatted = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${d}-${m}-${y} ${hh}:${mm}:${ss}`;
};

// ==========================================
// SEARCHABLE POPOVER DROPDOWN (FILTER BAR)
// ==========================================
const CustomDropdown = ({
  icon: Icon,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select option",
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
    value === "all" || !value ? `${allLabel} ${count !== undefined ? `(${count})` : ""}` : value;

  return (
    <div
      className="relative w-full"
      style={{ position: "relative", zIndex: isOpen ? 9999 : 1 }}
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-white border rounded-xl flex items-center justify-between gap-2 transition-all text-left cursor-pointer ${
          isOpen
            ? "bg-white ring-2 ring-indigo-500/20 border-indigo-500 shadow-sm"
            : value && value !== "all"
            ? "border-indigo-300 bg-indigo-50/40 text-indigo-900 font-medium"
            : "border-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && (
            <Icon
              className={`w-4 h-4 shrink-0 ${
                value && value !== "all" ? "text-indigo-600" : "text-slate-400"
              }`}
            />
          )}
          <span className="truncate">{selectedDisplay}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 animate-fadeIn min-w-[200px]"
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
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto px-1 space-y-0.5 custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setIsOpen(false);
                setSearchQuery("");
              }}
              className={`w-full px-3 py-2 text-xs text-left rounded-xl flex items-center justify-between transition-colors ${
                !value || value === "all"
                  ? "bg-indigo-50/80 text-indigo-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100/70"
              }`}
            >
              <span>{allLabel}</span>
              {(!value || value === "all") && <Check className="w-3.5 h-3.5 text-indigo-600" />}
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
                className={`w-full px-3 py-2 text-xs text-left rounded-xl flex items-center justify-between transition-colors ${
                  value === opt
                    ? "bg-indigo-50/80 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-100/70"
                }`}
              >
                <span className="truncate">{opt}</span>
                {value === opt && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
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

// ==========================================
// SEARCHABLE POPOVER DROPDOWN FOR MODAL FORMS
// ==========================================
const ModalSearchableDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select Indent",
  searchPlaceholder = "Search Indent...",
  icon: Icon
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

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "object" && opt !== null) {
        return {
          value: opt.value ?? opt.indent_no ?? "",
          label: opt.label ?? opt.indent_no ?? "",
          sublabel: opt.sublabel ?? (opt.post ? `${opt.post}${opt.department ? ` (${opt.department})` : ""}` : "")
        };
      }
      return { value: String(opt), label: String(opt), sublabel: "" };
    });
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  const selectedItem = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedItem
    ? selectedItem.sublabel
      ? `${selectedItem.label} - ${selectedItem.sublabel}`
      : selectedItem.label
    : placeholder;

  return (
    <div
      className="relative w-full"
      style={{ position: "relative", zIndex: isOpen ? 9999 : 1 }}
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-3.5 py-2 text-xs bg-white border rounded-xl flex items-center justify-between gap-2 transition-all text-left cursor-pointer ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
            : value
            ? "border-slate-300 text-slate-800 font-medium"
            : "border-slate-200 text-slate-400"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 py-0.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          <span className="truncate leading-normal block">{displayLabel}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-700 py-2 animate-fadeIn min-w-[280px] max-w-full ring-1 ring-black/10 overflow-hidden"
          style={{ position: "absolute", zIndex: 99999 }}
        >
          {/* Internal Search Input */}
          <div className="px-2.5 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto px-1 space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-center text-slate-400">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full px-3 py-2 text-xs text-left rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    value === opt.value
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-slate-500 dark:text-slate-400 ml-1.5 text-[11px]">
                        - {opt.sublabel}
                      </span>
                    )}
                  </div>
                  {value === opt.value && (
                    <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: CANDIDATE SHORTLISTED
// ==========================================
const CandidateSortlisted = () => {
  const { user } = useAuthStore();
  const userName =
    user?.user_metadata?.full_name ||
    user?.Name ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Admin";

  // Data states
  const [candidates, setCandidates] = useState([]);
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openIndents, setOpenIndents] = useState([]);
  const [loadingIndents, setLoadingIndents] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [desigFilter, setDesigFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pending"); // "pending", "shortlisted", "rejected", "reference", "all"
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Candidate Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Reference Edit / Add Modal state
  const [showRefModal, setShowRefModal] = useState(false);
  const [editingRefId, setEditingRefId] = useState(null);
  const [refFormData, setRefFormData] = useState({
    date: getTodayFormatted(),
    candidateName: "",
    refPersonName: "",
    number: ""
  });
  const [refSubmitting, setRefSubmitting] = useState(false);

  // Action form state (Single-click shortlist/reject)
  const [actionFormData, setActionFormData] = useState({
    status: "Selected",
    remarks: "",
    interviewDate: getTodayFormatted()
  });

  // Candidate Create/Edit Form State matching EXACT screenshot
  const initialFormData = {
    indentNumber: "",
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
    interviewDateWithHrSpoc: getTodayFormatted(),
    entryBy: userName || "Admin",
    candidateStatus: "",
    references: [], // Array of { refPersonName: "", number: "" }
    resumeUrl: "",
    resumeFileName: ""
  };

  const [formData, setFormData] = useState(initialFormData);
  const [uploadingResume, setUploadingResume] = useState(false);

  // ==========================================
  // FETCH CANDIDATE SELECTION DATA (LOW EGRESS)
  // ==========================================
  const loadCandidateData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data)) {
              setCandidates(data);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn("Error reading cache", e);
          }
        }
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("candidate_selection")
        .select(CANDIDATE_SELECT_COLUMNS)
        .order("id", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((row) => ({
        ...row,
        formatted_timestamp: formatDisplayDate(row.timestamp),
        formatted_interview_date: formatDisplayDate(row.interview_date_with_hr_spoc),
        formatted_planned: formatDisplayDate(row.stage1_planned),
        formatted_actual: formatDisplayDate(row.stage1_actual)
      }));

      setCandidates(formatted);
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: formatted, timestamp: Date.now() })
      );
    } catch (err) {
      console.error("Error loading candidate selection data:", err);
      toast.error("Failed to load candidate selection data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================
  // FETCH REFERENCE TABLE DATA
  // ==========================================
  const loadReferenceData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(REF_CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data)) {
              setReferences(data);
              return;
            }
          } catch (e) {
            console.warn("Error reading reference cache", e);
          }
        }
      }

      const { data, error } = await supabase
        .from("reference")
        .select("id, date, candidate_name, ref_person_name, number, created_at")
        .order("id", { ascending: false });

      if (!error && data) {
        setReferences(data);
        sessionStorage.setItem(
          REF_CACHE_KEY,
          JSON.stringify({ data, timestamp: Date.now() })
        );
      }
    } catch (err) {
      console.warn("Reference table fetch:", err);
    }
  };

  // ==========================================
  // FETCH OPEN INDENTS FOR DROPDOWN (LOW EGRESS)
  // ==========================================
  const loadOpenIndents = async () => {
    try {
      setLoadingIndents(true);
      const { data, error } = await supabase
        .from("fms")
        .select("indent_no, post, department")
        .eq("position_status", "OPEN")
        .order("indent_no", { ascending: true });

      if (error) throw error;

      const map = new Map();
      (data || []).forEach((row) => {
        if (row.indent_no && !map.has(row.indent_no)) {
          map.set(row.indent_no, {
            indent_no: row.indent_no,
            post: row.post || "",
            department: row.department || ""
          });
        }
      });
      setOpenIndents(Array.from(map.values()));
    } catch (err) {
      console.error("Error loading open indents from FMS:", err);
    } finally {
      setLoadingIndents(false);
    }
  };

  useEffect(() => {
    loadCandidateData();
    loadReferenceData();
    loadOpenIndents();
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadCandidateData(true);
    loadReferenceData(true);
    loadOpenIndents();
    toast.success("Syncing latest candidates & references...", { duration: 1500 });
  };

  // Auto populate Department & Designation when Indent is selected
  const handleIndentChange = (indentNo) => {
    const selected = openIndents.find((i) => i.indent_no === indentNo);
    setFormData((prev) => ({
      ...prev,
      indentNumber: indentNo,
      openPositionDepartment: selected ? selected.department : prev.openPositionDepartment,
      designation: selected ? selected.post : prev.designation
    }));
  };

  // Reference dynamic row handlers inside candidate modal
  const handleAddReference = () => {
    setFormData((prev) => ({
      ...prev,
      references: [...prev.references, { refPersonName: "", number: "" }]
    }));
  };

  const handleRemoveReference = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      references: prev.references.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleReferenceChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.references];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, references: updated };
    });
  };

  // Standalone Reference Modal Handlers (Edit / Add in Reference Tab)
  const handleOpenRefModal = (refItem = null) => {
    if (refItem) {
      setEditingRefId(refItem.id);
      setRefFormData({
        date: refItem.date || getTodayFormatted(),
        candidateName: refItem.candidate_name || "",
        refPersonName: refItem.ref_person_name || "",
        number: refItem.number || ""
      });
    } else {
      setEditingRefId(null);
      setRefFormData({
        date: getTodayFormatted(),
        candidateName: "",
        refPersonName: "",
        number: ""
      });
    }
    setShowRefModal(true);
  };

  const handleSaveReferenceModal = async (e) => {
    e.preventDefault();
    if (!refFormData.candidateName.trim()) {
      toast.error("Candidate Name is required");
      return;
    }

    setRefSubmitting(true);
    try {
      const payload = {
        date: refFormData.date || getTodayFormatted(),
        candidate_name: refFormData.candidateName,
        ref_person_name: refFormData.refPersonName,
        number: refFormData.number,
        updated_at: new Date().toISOString()
      };

      if (editingRefId) {
        const { error } = await supabase
          .from("reference")
          .update(payload)
          .eq("id", editingRefId);

        if (error) throw error;
        toast.success("Reference updated successfully!");
      } else {
        const { error } = await supabase
          .from("reference")
          .insert([payload]);

        if (error) throw error;
        toast.success("Reference added successfully!");
      }

      sessionStorage.removeItem(REF_CACHE_KEY);
      setShowRefModal(false);
      loadReferenceData(true);
    } catch (err) {
      console.error("Save reference error:", err);
      toast.error("Failed to save reference: " + err.message);
    } finally {
      setRefSubmitting(false);
    }
  };

  const handleDeleteReference = async (refItem) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the reference for ${refItem.candidate_name || "this candidate"}?`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("reference")
        .delete()
        .eq("id", refItem.id);

      if (error) throw error;

      setReferences((prev) => prev.filter((r) => r.id !== refItem.id));
      sessionStorage.removeItem(REF_CACHE_KEY);
      toast.success("Reference deleted successfully");
    } catch (err) {
      console.error("Delete reference error:", err);
      toast.error("Failed to delete reference");
    }
  };

  const uploadFileToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dhbtn1ecx";
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "hrms_unsigned";
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
  };

  // Direct Cloudinary File upload handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    const toastId = toast.loading(`Uploading ${file.name} to Cloudinary...`);

    try {
      const url = await uploadFileToCloudinary(file);
      if (url) {
        setFormData((prev) => ({
          ...prev,
          resumeUrl: url,
          resumeFileName: file.name
        }));
        toast.success(`Resume uploaded to Cloudinary successfully!`, { id: toastId });
      } else {
        toast.error("Upload failed", { id: toastId });
      }
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      toast.error(`Upload failed: ${err.message || "Error"}`, { id: toastId });
    } finally {
      setUploadingResume(false);
      if (e.target) e.target.value = "";
    }
  };

  // ==========================================
  // STATS & FILTERED DATA
  // ==========================================
  const stats = useMemo(() => {
    const total = candidates.length;
    let pending = 0;
    let shortlisted = 0;
    let rejected = 0;

    candidates.forEach((c) => {
      const p1 = (c.stage1_planned || "").trim();
      const a1 = (c.stage1_actual || "").trim();
      const st = (c.stage1_status || "").trim().toLowerCase();

      const isPending = (p1 !== "" && a1 === "") || (!a1 && (st === "pending" || !st || st === "good canidate" || st === "good candidate"));
      const isShortlisted = !isPending && (st === "selected" || st === "shortlisted" || st === "good canidate" || st === "good candidate");
      const isRejected = !isPending && (st === "rejected" || st === "reject");

      if (isPending) {
        pending++;
      } else if (isShortlisted) {
        shortlisted++;
      } else if (isRejected) {
        rejected++;
      } else {
        pending++;
      }
    });

    return { total, pending, shortlisted, rejected, referencesCount: references.length };
  }, [candidates, references]);

  // Distinct Filter Options
  const departmentOptions = useMemo(() => {
    const set = new Set(candidates.map((c) => c.open_position_department).filter(Boolean));
    return Array.from(set).sort();
  }, [candidates]);

  const designationOptions = useMemo(() => {
    const set = new Set(candidates.map((c) => c.designation).filter(Boolean));
    return Array.from(set).sort();
  }, [candidates]);

  const statusOptions = useMemo(() => {
    const set = new Set(candidates.map((c) => c.stage1_status).filter(Boolean));
    return Array.from(set).sort();
  }, [candidates]);

  // Main Filter Logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((item) => {
      // 1. Tab Filtering
      const p1 = (item.stage1_planned || "").trim();
      const a1 = (item.stage1_actual || "").trim();
      const st = (item.stage1_status || "").trim().toLowerCase();

      const isPending = (p1 !== "" && a1 === "") || (!a1 && (st === "pending" || !st || st === "good canidate" || st === "good candidate"));
      const isShortlisted = !isPending && (st === "selected" || st === "shortlisted" || st === "good canidate" || st === "good candidate");
      const isRejected = !isPending && (st === "rejected" || st === "reject");

      if (activeTab === "pending") {
        if (!isPending) return false;
      } else if (activeTab === "shortlisted") {
        if (!isShortlisted) return false;
      } else if (activeTab === "rejected") {
        if (!isRejected) return false;
      }

      // 2. Department Filter
      if (deptFilter !== "all" && item.open_position_department !== deptFilter) {
        return false;
      }

      // 3. Designation Filter
      if (desigFilter !== "all" && item.designation !== desigFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== "all" && item.stage1_status !== statusFilter) {
        return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (item.name_of_candidate || "").toLowerCase().includes(query);
        const matchesContact = (item.contact_no || "").toLowerCase().includes(query);
        const matchesMail = (item.mail_id || "").toLowerCase().includes(query);
        const matchesDesig = (item.designation || "").toLowerCase().includes(query);
        const matchesDept = (item.open_position_department || "").toLowerCase().includes(query);
        const matchesCompany = (item.current_company || "").toLowerCase().includes(query);
        const matchesIndent = (item.candidate_id || "").toLowerCase().includes(query);

        if (
          !matchesName &&
          !matchesContact &&
          !matchesMail &&
          !matchesDesig &&
          !matchesDept &&
          !matchesCompany &&
          !matchesIndent
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const aIndent = String(a.candidate_id || a.id_name || a.indent_and_name || "").trim();
      const bIndent = String(b.candidate_id || b.id_name || b.indent_and_name || "").trim();
      return bIndent.localeCompare(aIndent, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [candidates, activeTab, deptFilter, desigFilter, statusFilter, searchQuery]);

  // Filtered References
  const filteredReferences = useMemo(() => {
    if (!searchQuery.trim()) return references;
    const query = searchQuery.toLowerCase();
    return references.filter(
      (r) =>
        (r.candidate_name || "").toLowerCase().includes(query) ||
        (r.ref_person_name || "").toLowerCase().includes(query) ||
        (r.number || "").toString().toLowerCase().includes(query)
    );
  }, [references, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage) || 1;
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCandidates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCandidates, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deptFilter, desigFilter, statusFilter, activeTab, itemsPerPage]);

  // ==========================================
  // EXPORT TO EXCEL
  // ==========================================
  const exportToExcel = () => {
    try {
      if (activeTab === "reference") {
        if (filteredReferences.length === 0) {
          toast.error("No references to export");
          return;
        }
        const exportData = filteredReferences.map((r, idx) => ({
          "Sr No": idx + 1,
          "Date": r.date || "",
          "Candidate Name": r.candidate_name || "",
          "Reference Person Name": r.ref_person_name || "",
          "Contact Number": r.number || ""
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "References");
        XLSX.writeFile(workbook, `Candidate_References_${getTodayFormatted()}.xlsx`);
        toast.success(`Exported ${exportData.length} reference records to Excel!`);
        return;
      }

      if (filteredCandidates.length === 0) {
        toast.error("No data available to export");
        return;
      }

      const exportData = filteredCandidates.map((c, index) => ({
        "Sr No": index + 1,
        "Timestamp": c.timestamp || "",
        "Candidate ID / Indent": c.candidate_id || "",
        "Department": c.open_position_department || "",
        "Designation": c.designation || "",
        "Candidate Name": c.name_of_candidate || "",
        "Contact No": c.contact_no || "",
        "Email ID": c.mail_id || "",
        "Age": c.age || "",
        "Highest Qualification": c.highest_qualification || "",
        "Native Place": c.native_place || "",
        "Current Location": c.current_working_location || "",
        "Employment Status": c.current_employment_status || "",
        "Current Company": c.current_company || "",
        "Current Designation": c.current_designation || "",
        "Tenure (Years)": c.tenure_with_current_company || "",
        "Total Experience": c.total_work_experience || "",
        "Current CTC (LPA)": c.current_ctc || "",
        "Expected CTC (LPA)": c.expected_ctc || "",
        "Notice Period": c.notice_period || "",
        "Interview Date (HR SPOC)": c.interview_date_with_hr_spoc || "",
        "Resume URL": c.resume_url || "",
        "Stage 1 Planned": c.stage1_planned || "",
        "Stage 1 Actual": c.stage1_actual || "",
        "Stage 1 Status": c.stage1_status || "",
        "Stage 1 Delay": c.stage1_time_delay || "",
        "Finalized Salary": c.finalized_salary || "",
        "Joining Date": c.joining_date || "",
        "Entry By": c.entry_by || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates_Shortlisted");

      const dateStr = getTodayFormatted();
      XLSX.writeFile(workbook, `Candidates_Shortlisted_${dateStr}.xlsx`);
      toast.success(`Exported ${exportData.length} records to Excel!`);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel file");
    }
  };

  // ==========================================
  // ACTION MODAL (Shortlist / Select / Reject)
  // ==========================================
  const handleOpenActionModal = (candidate) => {
    setSelectedCandidate(candidate);
    const existingStatus = candidate.stage1_status || "";
    const validStatus = ["selected", "rejected", "hold"].includes(existingStatus.toLowerCase())
      ? (existingStatus.charAt(0).toUpperCase() + existingStatus.slice(1).toLowerCase())
      : "Selected";

    setActionFormData({
      status: validStatus,
      remarks: candidate.stage1_remarks || "",
      interviewDate: candidate.stage1_actual || getTodayFormatted()
    });
    setShowActionModal(true);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setSubmitting(true);
    try {
      const today = getTodayFormatted();
      const nextPlanned = actionFormData.status === "Selected" ? today : "";

      const updates = {
        stage1_status: actionFormData.status,
        stage1_actual: today,
        stage2_planned: nextPlanned,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("candidate_selection")
        .update(updates)
        .eq("id", selectedCandidate.id);

      if (error) throw error;

      // Safely sync remarks directly to candidate_selection if remarks/stage1_remarks column is present
      if (actionFormData.remarks) {
        try {
          await supabase
            .from("candidate_selection")
            .update({ stage1_remarks: actionFormData.remarks })
            .eq("id", selectedCandidate.id);
        } catch (_) {}
      }

      // Record evaluation notes & remarks to data_response table
      await recordDataResponse({
        uniqueId: selectedCandidate.indent_and_name || selectedCandidate.candidate_id || selectedCandidate.id_name || `${selectedCandidate.id}`,
        stepCode: "CS-1",
        status: actionFormData.status,
        customerSays: actionFormData.remarks || "",
        contactPersonName: selectedCandidate.name_of_candidate || "",
        contactNo: selectedCandidate.contact_no || ""
      });

      // Optimistic update
      setCandidates((prev) =>
        prev.map((item) =>
          item.id === selectedCandidate.id
            ? { ...item, ...updates, stage1_remarks: actionFormData.remarks || "", formatted_actual: today }
            : item
        )
      );

      sessionStorage.removeItem(CACHE_KEY);
      toast.success(`Candidate marked as ${actionFormData.status} and remarks saved!`);
      setShowActionModal(false);
      setSelectedCandidate(null);
    } catch (err) {
      console.error("Error updating candidate action:", err);
      toast.error("Failed to update candidate status");
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // ADD / EDIT CANDIDATE SUBMIT
  // ==========================================
  const handleOpenAddModal = (candidateToEdit = null) => {
    if (candidateToEdit) {
      setEditingId(candidateToEdit.id);
      const indentOnly = (candidateToEdit.candidate_id || "").split("_")[0];
      setFormData({
        indentNumber: indentOnly || "",
        openPositionDepartment: candidateToEdit.open_position_department || "",
        designation: candidateToEdit.designation || "",
        nameOfCandidate: candidateToEdit.name_of_candidate || "",
        contactNo: candidateToEdit.contact_no || "",
        mailID: candidateToEdit.mail_id || "",
        age: candidateToEdit.age || "",
        highestQualification: candidateToEdit.highestQualification || candidateToEdit.highest_qualification || "",
        nativePlace: candidateToEdit.native_place || "",
        currentWorkingLocation: candidateToEdit.current_working_location || "",
        currentEmploymentStatus: candidateToEdit.current_employment_status || "",
        currentCompany: candidateToEdit.current_company || "",
        currentDesignation: candidateToEdit.current_designation || "",
        tenureWithCurrentCompany: candidateToEdit.tenure_with_current_company || "",
        totalWorkExperience: candidateToEdit.total_work_experience || "",
        currentCTC: candidateToEdit.current_ctc || "",
        expectedCTC: candidateToEdit.expected_ctc || "",
        noticePeriod: candidateToEdit.notice_period || "",
        interviewDateWithHrSpoc: candidateToEdit.interview_date_with_hr_spoc || getTodayFormatted(),
        entryBy: candidateToEdit.entry_by || userName || "Admin",
        candidateStatus: candidateToEdit.stage1_status || "",
        references: [],
        resumeUrl: candidateToEdit.resume_url || "",
        resumeFileName: candidateToEdit.resume_url ? "Existing CV Attached" : ""
      });
    } else {
      setEditingId(null);
      setFormData({
        ...initialFormData,
        entryBy: userName || "Admin"
      });
    }
    setShowAddModal(true);
  };

  const handleSaveCandidate = async (e) => {
    e.preventDefault();

    if (!formData.nameOfCandidate.trim()) {
      toast.error("Candidate Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const today = getTodayFormatted();
      const timestamp = getNowTimestampFormatted();
      const generatedId = formData.indentNumber
        ? `${formData.indentNumber}_${formData.designation || "Position"}`
        : `CS_${Date.now()}`;
      const indentAndName = formData.indentNumber
        ? `${formData.indentNumber}_${formData.nameOfCandidate}`
        : formData.nameOfCandidate;

      const payload = {
        candidate_id: generatedId,
        open_position_department: formData.openPositionDepartment || "",
        designation: formData.designation || "",
        name_of_candidate: formData.nameOfCandidate || "",
        contact_no: formData.contactNo || "",
        mail_id: formData.mailID || "",
        age: formData.age || "",
        highest_qualification: formData.highestQualification || "",
        native_place: formData.nativePlace || "",
        current_working_location: formData.currentWorkingLocation || "",
        current_employment_status: formData.currentEmploymentStatus || "",
        current_company: formData.currentCompany || "",
        current_designation: formData.currentDesignation || "",
        tenure_with_current_company: formData.tenureWithCurrentCompany || "",
        total_work_experience: formData.totalWorkExperience || "",
        current_ctc: formData.currentCTC || "",
        expected_ctc: formData.expectedCTC || "",
        notice_period: formData.noticePeriod || "",
        interview_date_with_hr_spoc: formData.interviewDateWithHrSpoc || today,
        resume_url: formData.resumeUrl || "",
        stage1_status: formData.candidateStatus || "Pending",
        id_name: indentAndName,
        lookup_designation: formData.designation || "",
        indent_and_name: indentAndName,
        entry_by: formData.entryBy || userName || "Admin",
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from("candidate_selection")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Candidate updated successfully!");
      } else {
        payload.timestamp = timestamp;
        payload.stage1_planned = getTomorrowFormatted();
        payload.stage1_actual = "";
        payload.stage1_status = formData.candidateStatus || "Pending";

        const { error } = await supabase
          .from("candidate_selection")
          .insert([payload]);

        if (error) throw error;
        toast.success("Candidate shortlisted successfully!");
      }

      // Save references if any
      const validReferences = (formData.references || []).filter(
        (r) => r.refPersonName?.trim() || r.number?.trim()
      );

      if (validReferences.length > 0) {
        const refRows = validReferences.map((r) => ({
          date: today,
          candidate_name: formData.nameOfCandidate,
          ref_person_name: r.refPersonName || "",
          number: r.number || ""
        }));

        try {
          const { error: refError } = await supabase
            .from("reference")
            .insert(refRows);

          if (!refError) {
            sessionStorage.removeItem(REF_CACHE_KEY);
            loadReferenceData(true);
          }
        } catch (refErr) {
          console.warn("Reference insert error:", refErr);
        }
      }

      sessionStorage.removeItem(CACHE_KEY);
      setShowAddModal(false);
      loadCandidateData(true);
    } catch (err) {
      console.error("Error saving candidate:", err);
      toast.error("Failed to save candidate: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCandidate = async (candidate) => {
    if (!window.confirm(`Are you sure you want to delete ${candidate.name_of_candidate || "this candidate"}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("candidate_selection")
        .delete()
        .eq("id", candidate.id);

      if (error) throw error;

      setCandidates((prev) => prev.filter((item) => item.id !== candidate.id));
      sessionStorage.removeItem(CACHE_KEY);
      toast.success("Candidate record removed");
    } catch (err) {
      console.error("Delete candidate error:", err);
      toast.error("Failed to delete candidate");
    }
  };

  // Helper for Status Badge Styling
  const getStatusBadge = (status) => {
    const st = (status || "").trim().toLowerCase();
    if (st === "selected" || st === "shortlisted" || st === "good canidate") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {status || "Selected"}
        </span>
      );
    }
    if (st === "rejected" || st === "reject") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <UserX className="w-3.5 h-3.5 text-rose-600" />
          {status || "Rejected"}
        </span>
      );
    }
    if (st === "hold" || st === "average") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          {status || "Hold"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Clock className="w-3.5 h-3.5 text-indigo-600" />
        {status || "Pending"}
      </span>
    );
  };

  const isCandidatePending = (c) => {
    if (!c) return false;
    if (activeTab === "pending") return true;
    const p1 = (c.stage1_planned || "").trim();
    const a1 = (c.stage1_actual || "").trim();
    const st = (c.stage1_status || "").trim().toLowerCase();
    return (
      (p1 !== "" && a1 === "") ||
      (!a1 && (st === "pending" || !st || st === "good canidate" || st === "good candidate")) ||
      !c.stage1_status ||
      st === "pending"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-3 sm:p-6 space-y-5 animate-fadeIn">
      {/* ==========================================
          HEADER CARD / HERO BANNER
      ========================================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-7 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-cyan-300 text-xs font-medium border border-white/10">
              <Users className="w-3.5 h-3.5" />
              <span>Talent Acquisition & Candidate Screening</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              CANDIDATE SHORTLISTED
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Screen, evaluate, and shortlist talent directly linked to live open indents with dynamic reference support.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition-all cursor-pointer disabled:opacity-50"
              title="Sync fresh data from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
              <span>{refreshing ? "Syncing..." : "Sync"}</span>
            </button>

            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all cursor-pointer"
              title="Download Excel Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => handleOpenAddModal(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-500/30 border border-blue-400/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Candidate</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          STATS CARDS (ENHANCED)
      ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4.5">
        {/* Total Candidates Card */}
        <div 
          onClick={() => setActiveTab("all")}
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-lg ${
            activeTab === "all"
              ? "bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-white border-indigo-300 shadow-md ring-2 ring-indigo-400/20"
              : "bg-white border-slate-200/80 hover:border-indigo-200 shadow-xs"
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none -mr-4 -mt-4 group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600 transition-colors">Total Sourced</span>
            <div className={`p-2.5 rounded-xl border transition-all duration-300 group-hover:scale-110 ${
              activeTab === "all" 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/30" 
                : "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white"
            }`}>
              <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 relative z-10">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.total}</span>
            <span className="text-[11px] font-semibold text-slate-400">candidates</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Complete talent pool</span>
          </div>
        </div>

        {/* Pending Review Card */}
        <div 
          onClick={() => setActiveTab("pending")}
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-lg ${
            activeTab === "pending"
              ? "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white border-amber-300 shadow-md ring-2 ring-amber-400/20"
              : "bg-white border-slate-200/80 hover:border-amber-200 shadow-xs"
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none -mr-4 -mt-4 group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
            </div>
            <div className={`p-2.5 rounded-xl border transition-all duration-300 group-hover:scale-110 ${
              activeTab === "pending" 
                ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30" 
                : "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500 group-hover:text-white"
            }`}>
              <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 relative z-10">
            <span className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">{stats.pending}</span>
            <span className="text-[11px] font-semibold text-amber-600/80">in queue</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-amber-700/80">
            <span>Awaiting interview schedule</span>
          </div>
        </div>

        {/* Shortlisted / Selected Card */}
        <div 
          onClick={() => setActiveTab("shortlisted")}
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-lg ${
            activeTab === "shortlisted"
              ? "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white border-emerald-300 shadow-md ring-2 ring-emerald-400/20"
              : "bg-white border-slate-200/80 hover:border-emerald-200 shadow-xs"
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mr-4 -mt-4 group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">Shortlisted / Selected</span>
            <div className={`p-2.5 rounded-xl border transition-all duration-300 group-hover:scale-110 ${
              activeTab === "shortlisted" 
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/30" 
                : "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white"
            }`}>
              <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 relative z-10">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{stats.shortlisted}</span>
            <span className="text-[11px] font-semibold text-emerald-600/80">advanced</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-emerald-700/80">
            <span>Progressed to next rounds</span>
          </div>
        </div>

        {/* Rejected Card */}
        <div 
          onClick={() => setActiveTab("rejected")}
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-lg ${
            activeTab === "rejected"
              ? "bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-white border-rose-300 shadow-md ring-2 ring-rose-400/20"
              : "bg-white border-slate-200/80 hover:border-rose-200 shadow-xs"
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none -mr-4 -mt-4 group-hover:bg-rose-500/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-700">Rejected</span>
            <div className={`p-2.5 rounded-xl border transition-all duration-300 group-hover:scale-110 ${
              activeTab === "rejected" 
                ? "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/30" 
                : "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white"
            }`}>
              <UserX className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 relative z-10">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">{stats.rejected}</span>
            <span className="text-[11px] font-semibold text-rose-500/80">archived</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-rose-600/80">
            <span>Archived applications</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          TABS & FILTERS CONTAINER
      ========================================== */}
      <div className="relative z-30 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        {/* Top bar: Quick Status Tabs & View Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Candidates</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                {stats.pending}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("shortlisted")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "shortlisted"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Shortlisted / Selected</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {stats.shortlisted}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("rejected")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "rejected"
                  ? "bg-white text-rose-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-rose-500" />
              <span>Rejected</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800">
                {stats.rejected}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("reference")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "reference"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Reference</span>
              {references.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                  {references.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>All Candidates</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800">
                {stats.total}
              </span>
            </button>
          </div>

          {/* View Mode Toggle */}
          {activeTab !== "reference" && (
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Showing {filteredCandidates.length} of {candidates.length}
              </span>
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Table View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar: Search & Dynamic Dropdown Filters */}
        <div className="relative z-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === "reference"
                  ? "Search candidate name, reference person, number..."
                  : "Search candidate, phone, email, post..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter (only in candidate tabs) */}
          {activeTab !== "reference" ? (
            <>
              <CustomDropdown
                icon={Building2}
                label="Department"
                value={deptFilter}
                onChange={setDeptFilter}
                options={departmentOptions}
                allLabel="All Departments"
              />

              <CustomDropdown
                icon={Briefcase}
                label="Designation"
                value={desigFilter}
                onChange={setDesigFilter}
                options={designationOptions}
                allLabel="All Posts"
              />

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <CustomDropdown
                    icon={CheckCircle}
                    label="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    allLabel="All Statuses"
                  />
                </div>
                {(deptFilter !== "all" || desigFilter !== "all" || statusFilter !== "all" || searchQuery) && (
                  <button
                    onClick={() => {
                      setDeptFilter("all");
                      setDesigFilter("all");
                      setStatusFilter("all");
                      setSearchQuery("");
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Reset all filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="col-span-1 sm:col-span-3 flex justify-end">
              <button
                onClick={() => handleOpenRefModal(null)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Reference</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          CONTENT SECTION: CANDIDATE TABLE / CARDS / REFERENCE TAB
      ========================================== */}
      {activeTab === "reference" ? (
        /* REFERENCE TAB TABLE WITH EDIT & DELETE */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm">Candidate Reference Pool</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300">
                Total {filteredReferences.length} References
              </span>
              <button
                onClick={() => handleOpenRefModal(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Reference</span>
              </button>
            </div>
          </div>

          {filteredReferences.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <p className="font-semibold text-sm">No References Found</p>
              <p className="text-xs">Add references when shortlisting new candidates or click Add Reference above</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-270px)] custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Reference Person Name</th>
                    <th className="py-3 px-4">Contact Number</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReferences.map((ref, idx) => (
                    <tr key={ref.id || idx} className="hover:bg-indigo-50/40 transition-colors group">
                      <td className="py-3 px-4 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                          {formatDisplayDate(ref.date)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{ref.candidate_name || "-"}</td>
                      <td className="py-3 px-4 text-indigo-700 font-semibold">{ref.ref_person_name || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {ref.number ? (
                          <a
                            href={`tel:${ref.number}`}
                            className="inline-flex items-center gap-1.5 text-slate-800 hover:text-indigo-600 font-semibold"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ref.number}</span>
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRefModal(ref)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Reference"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReference(ref)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Reference"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Candidate Pool...</p>
          <p className="text-xs text-slate-400">Fetching records from Supabase</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-slate-800">No Candidates Found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No candidates matched your search criteria. Try modifying your filters or add a new candidate.
          </p>
          <button
            onClick={() => handleOpenAddModal(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Shortlist New Candidate</span>
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW WITH STICKY HEADER */
        <div className="relative z-10 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-270px)] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
                <tr>
                  <th className="py-3 px-3.5 text-center w-12">#</th>
                  <th className="py-3 px-3.5">Timestamp</th>
                  <th className="py-3 px-3.5">Candidate Details</th>
                  <th className="py-3 px-3.5">Position / Dept</th>
                  <th className="py-3 px-3.5">Current Exp & Org</th>
                  <th className="py-3 px-3.5">CTC (Curr / Exp)</th>
                  <th className="py-3 px-3.5">Interview Date</th>
                  <th className="py-3 px-3.5 text-center">Resume</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Quick Action</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedCandidates.map((c, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  const isPending = isCandidatePending(c);

                  return (
                    <tr
                      key={c.id || index}
                      className="hover:bg-indigo-50/40 transition-colors group"
                    >
                      {/* Sr No */}
                      <td className="py-3 px-3.5 text-center font-semibold text-slate-400">
                        {globalIndex}
                      </td>

                      {/* Timestamp with highlight pill */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                          {c.formatted_timestamp || "-"}
                        </span>
                        {(c.candidate_id || c.indent_and_name || c.id_name) && (
                          <div className="mt-1">
                            <span className="inline-block font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                              {c.candidate_id || c.indent_and_name || c.id_name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Candidate Name & Contact */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                            {(c.name_of_candidate || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {c.name_of_candidate || "Unnamed"}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              {c.contact_no && (
                                <a
                                  href={`tel:${c.contact_no}`}
                                  className="hover:text-indigo-600 flex items-center gap-0.5"
                                  title="Call"
                                >
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{c.contact_no}</span>
                                </a>
                              )}
                              {c.mail_id && (
                                <a
                                  href={`mailto:${c.mail_id}`}
                                  className="hover:text-indigo-600 flex items-center gap-0.5"
                                  title="Send Email"
                                >
                                  <Mail className="w-3 h-3 text-slate-400" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Position / Dept */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800 text-xs">
                          {c.designation || "-"}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{c.open_position_department || "-"}</span>
                        </div>
                      </td>

                      {/* Current Exp & Org */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-slate-800 text-xs truncate max-w-[140px]">
                          {c.current_company || "-"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Exp: <span className="font-semibold text-slate-700">{c.total_work_experience || "0"}</span> yrs
                        </div>
                      </td>

                      {/* CTC */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-800">
                          {c.current_ctc ? `₹${c.current_ctc} L` : "-"} /{" "}
                          <span className="text-emerald-600">
                            {c.expected_ctc ? `₹${c.expected_ctc} L` : "-"}
                          </span>
                        </div>
                        {c.notice_period && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            NP: {c.notice_period}
                          </div>
                        )}
                      </td>

                      {/* Interview Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-700 font-medium">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          {c.formatted_interview_date || "-"}
                        </span>
                      </td>

                      {/* Resume Link */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {c.resume_url ? (
                          <a
                            href={getDisplayResumeUrl(c.resume_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors"
                            title="View Resume / CV"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>CV</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs italic">N/A</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(c.stage1_status)}
                      </td>

                      {/* Quick Action Button */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {isPending ? (
                          <button
                            onClick={() => handleOpenActionModal(c)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                            title="Screen / Shortlist candidate"
                          >
                            Action
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs font-mono">-</span>
                        )}
                      </td>

                      {/* Action Menu */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedCandidate(c);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Profile Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAddModal(c)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Candidate"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedCandidates.map((c, index) => (
            <div
              key={c.id || index}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {(c.name_of_candidate || "C").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {c.name_of_candidate || "Unnamed"}
                    </h3>
                    <p className="text-xs text-indigo-600 font-medium">
                      {c.designation || "Position"}
                    </p>
                    {(c.candidate_id || c.indent_and_name || c.id_name) && (
                      <span className="inline-block mt-0.5 font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                        {c.candidate_id || c.indent_and_name || c.id_name}
                      </span>
                    )}
                  </div>
                </div>
                <div>{getStatusBadge(c.stage1_status)}</div>
              </div>

              {/* Department & Exp */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {c.open_position_department || "General"}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {c.total_work_experience ? `${c.total_work_experience} yrs exp` : "Fresher"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Company: {c.current_company || "-"}</span>
                  <span>NP: {c.notice_period || "-"}</span>
                </div>
              </div>

              {/* CTC & Interview Date */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-400">Current / Expected CTC</div>
                  <div className="font-bold text-slate-800">
                    {c.current_ctc ? `₹${c.current_ctc}L` : "-"} /{" "}
                    <span className="text-emerald-600">{c.expected_ctc ? `₹${c.expected_ctc}L` : "-"}</span>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] text-slate-400">Interview</div>
                  <div className="font-semibold text-slate-700">
                    {c.formatted_interview_date || "-"}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {c.resume_url && (
                    <a
                      href={getDisplayResumeUrl(c.resume_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1 border border-indigo-200"
                    >
                      <FileText className="w-3 h-3" />
                      <span>CV</span>
                    </a>
                  )}
                  {c.contact_no && (
                    <a
                      href={`tel:${c.contact_no}`}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {isCandidatePending(c) && (
                    <button
                      onClick={() => handleOpenActionModal(c)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                    >
                      Action
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenAddModal(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCandidate(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          PAGINATION CONTROLS
      ========================================== */}
      {activeTab !== "reference" && filteredCandidates.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries per page</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EDIT / ADD REFERENCE
      ========================================== */}
      {showRefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  {editingRefId ? "Edit Reference Details" : "Add New Reference"}
                </h3>
                <p className="text-xs text-indigo-200 font-medium mt-0.5">Supabase Reference Master Pool</p>
              </div>
              <button
                onClick={() => setShowRefModal(false)}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReferenceModal} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Date (DD-MM-YYYY)</label>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={refFormData.date}
                  onChange={(e) =>
                    setRefFormData((p) => ({ ...p, date: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Candidate Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Candidate Full Name"
                  value={refFormData.candidateName}
                  onChange={(e) =>
                    setRefFormData((p) => ({ ...p, candidateName: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Reference Person Name</label>
                <input
                  type="text"
                  placeholder="Reference Person Name"
                  value={refFormData.refPersonName}
                  onChange={(e) =>
                    setRefFormData((p) => ({ ...p, refPersonName: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Contact Number</label>
                <input
                  type="text"
                  placeholder="10-digit mobile number"
                  value={refFormData.number}
                  onChange={(e) =>
                    setRefFormData((p) => ({ ...p, number: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRefModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {refSubmitting ? "Saving..." : editingRefId ? "Update Reference" : "Save Reference"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: SHORTLIST / SELECT / REJECT ACTION
      ========================================== */}
      {showActionModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">Candidate Evaluation</h3>
                <p className="text-xs text-indigo-200 font-medium mt-0.5">
                  {selectedCandidate.name_of_candidate} {selectedCandidate.designation ? `(${selectedCandidate.designation})` : ""}
                </p>
              </div>
              <button
                onClick={() => setShowActionModal(false)}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Selection Decision</label>
                <div className="grid grid-cols-3 gap-2.5">
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
                    },
                    {
                      id: "Hold",
                      label: "Hold",
                      icon: Clock,
                      activeBg: "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30 ring-2 ring-amber-500/20",
                      inactiveBg: "bg-amber-50/50 text-amber-800 border-amber-200 hover:bg-amber-100/70"
                    }
                  ].map((btn) => {
                    const isSelected = (actionFormData.status || "").toLowerCase() === btn.id.toLowerCase();
                    const IconComponent = btn.icon;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setActionFormData((p) => ({ ...p, status: btn.id }))}
                        className={`py-2.5 px-3 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs ${
                          isSelected ? btn.activeBg : btn.inactiveBg
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isSelected ? "text-white" : ""}`} />
                        <span>{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>



              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Remarks / Evaluation Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter notes about interview, candidate fit, CTC alignment..."
                  value={actionFormData.remarks}
                  onChange={(e) =>
                    setActionFormData((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: SHORTLIST NEW CANDIDATE
      ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Candidate" : "Shortlist New Candidate"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSaveCandidate}
              className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm custom-scrollbar bg-white"
            >
              {/* Row 1: Indent Number (SEARCHABLE POPOVER DROPDOWN), Open position department, Designation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ position: "relative", zIndex: 100 }}>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Indent Number</label>
                  <ModalSearchableDropdown
                    value={formData.indentNumber}
                    onChange={(val) => handleIndentChange(val)}
                    options={openIndents.map((ind) => ({
                      value: ind.indent_no,
                      label: ind.indent_no,
                      sublabel: ind.post ? `${ind.post}${ind.department ? ` (${ind.department})` : ""}` : ""
                    }))}
                    placeholder="Select Indent"
                    searchPlaceholder="Search Indent..."
                    icon={Hash}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Open position department</label>
                  <input
                    type="text"
                    value={formData.openPositionDepartment}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, openPositionDepartment: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, designation: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Row 2: Name of candidate, Contact No., Mail ID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ position: "relative", zIndex: 90 }}>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Name of candidate *</label>
                  <input
                    type="text"
                    required
                    value={formData.nameOfCandidate}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, nameOfCandidate: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Contact No.</label>
                  <input
                    type="text"
                    value={formData.contactNo}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, contactNo: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Mail ID</label>
                  <input
                    type="email"
                    value={formData.mailID}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, mailID: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Row 3: Age, Highest Qualification, Current Working Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ position: "relative", zIndex: 80 }}>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Age</label>
                  <input
                    type="text"
                    value={formData.age}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, age: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Highest Qualification</label>
                  <input
                    type="text"
                    value={formData.highestQualification}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, highestQualification: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Current Working Location</label>
                  <input
                    type="text"
                    value={formData.currentWorkingLocation}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, currentWorkingLocation: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Row 4: Current Employment Status, Current Company, Tenure with current company */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ position: "relative", zIndex: 70 }}>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Current Employment Status</label>
                  <ModalSearchableDropdown
                    value={formData.currentEmploymentStatus}
                    onChange={(val) =>
                      setFormData((p) => ({ ...p, currentEmploymentStatus: val }))
                    }
                    options={[
                      { value: "Employed", label: "Employed" },
                      { value: "Unemployed", label: "Unemployed" },
                      { value: "Serving Notice Period", label: "Serving Notice Period" },
                      { value: "Freelancer", label: "Freelancer" }
                    ]}
                    placeholder="Select Status"
                    searchPlaceholder="Search Status..."
                    icon={Briefcase}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Current Company</label>
                  <input
                    type="text"
                    value={formData.currentCompany}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, currentCompany: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Tenure with current company</label>
                  <input
                    type="text"
                    value={formData.tenureWithCurrentCompany}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, tenureWithCurrentCompany: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Row 5: Total Work Experience, Current CTC (LPA), Expected (LPA) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ position: "relative", zIndex: 60 }}>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Total Work Experience</label>
                  <input
                    type="text"
                    value={formData.totalWorkExperience}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, totalWorkExperience: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Current CTC (LPA)</label>
                  <input
                    type="text"
                    value={formData.currentCTC}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, currentCTC: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Expected (LPA)</label>
                  <input
                    type="text"
                    value={formData.expectedCTC}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, expectedCTC: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Row 6: Notice Period, Interview Date with HR SPOC, Entry by */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ position: "relative", zIndex: 50 }}>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Notice Period</label>
                  <input
                    type="text"
                    value={formData.noticePeriod}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, noticePeriod: e.target.value }))
                    }
                    placeholder=""
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Interview Date with HR SPOC</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="dd-mm-yyyy"
                      value={formData.interviewDateWithHrSpoc}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, interviewDateWithHrSpoc: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800 pr-9"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Entry by</label>
                  <input
                    type="text"
                    value={formData.entryBy}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, entryBy: e.target.value }))
                    }
                    placeholder="Admin"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Row 7: Candidate Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ position: "relative", zIndex: 40 }}>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Candidate Status</label>
                  <ModalSearchableDropdown
                    value={formData.candidateStatus}
                    onChange={(val) =>
                      setFormData((p) => ({ ...p, candidateStatus: val }))
                    }
                    options={[
                      { value: "Good Canidate", label: "Good Canidate" },
                      { value: "Selected", label: "Selected" },
                      { value: "Average", label: "Average" },
                      { value: "Hold", label: "Hold" },
                      { value: "Rejected", label: "Rejected" }
                    ]}
                    placeholder="Select Status"
                    searchPlaceholder="Search Status..."
                    icon={CheckCircle}
                  />
                </div>
              </div>

              {/* ==========================================
                  REFERENCES SECTION (DYNAMIC ADD/REMOVE)
              ========================================== */}
              <div className="pt-3 border-t border-slate-100 space-y-3" style={{ position: "relative", zIndex: 30 }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">References</span>
                  <button
                    type="button"
                    onClick={handleAddReference}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Reference</span>
                  </button>
                </div>

                {formData.references.map((refItem, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center p-3 rounded-xl bg-slate-50 border border-slate-200 relative group animate-fadeIn"
                  >
                    <div className="space-y-1">
                      <label className="font-medium text-slate-600 text-xs">Person Name</label>
                      <input
                        type="text"
                        value={refItem.refPersonName}
                        onChange={(e) =>
                          handleReferenceChange(idx, "refPersonName", e.target.value)
                        }
                        placeholder="Reference Person Name"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1 relative pr-8">
                      <label className="font-medium text-slate-600 text-xs">Number</label>
                      <input
                        type="text"
                        value={refItem.number}
                        onChange={(e) =>
                          handleReferenceChange(idx, "number", e.target.value)
                        }
                        placeholder="Contact Number"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveReference(idx)}
                        className="absolute right-0 top-6 p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove reference"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ==========================================
                  RESUME / CV SECTION
              ========================================== */}
              <div className="pt-3 border-t border-slate-100 space-y-2" style={{ position: "relative", zIndex: 20 }}>
                <label className="font-bold text-slate-900 text-sm block">Resume / CV</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs ${uploadingResume ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    {uploadingResume ? (
                      <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingResume ? "Uploading to Cloudinary..." : "Choose File"}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      disabled={uploadingResume}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium truncate max-w-xs">
                      {formData.resumeFileName || "No file chosen"}
                    </span>
                    {formData.resumeUrl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Cloudinary
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 shrink-0" style={{ position: "relative", zIndex: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting || uploadingResume}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingResume}
                  className="px-6 py-2.5 rounded-xl bg-[#0b63b6] hover:bg-[#095094] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadingResume ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading CV...
                    </>
                  ) : submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Candidate"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: VIEW FULL CANDIDATE PROFILE DETAILS
      ========================================== */}
      {showDetailModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-base shadow-lg shadow-indigo-500/30 border border-white/20">
                  {(selectedCandidate.name_of_candidate || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {selectedCandidate.name_of_candidate || "Candidate Details"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <p className="text-xs text-indigo-200 font-medium">
                      {selectedCandidate.designation || "N/A"} {selectedCandidate.open_position_department ? `• ${selectedCandidate.open_position_department}` : ""}
                    </p>
                    {(selectedCandidate.candidate_id || selectedCandidate.indent_and_name || selectedCandidate.id_name) && (
                      <span className="font-mono text-[10px] font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                        {selectedCandidate.candidate_id || selectedCandidate.indent_and_name || selectedCandidate.id_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Contact No</span>
                  <span className="font-bold text-slate-800">{selectedCandidate.contact_no || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Email ID</span>
                  <span className="font-bold text-slate-800">{selectedCandidate.mail_id || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Highest Qualification</span>
                  <span className="font-bold text-slate-800">{selectedCandidate.highest_qualification || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Working Location</span>
                  <span className="font-bold text-slate-800">{selectedCandidate.current_working_location || "-"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Company</span>
                  <span className="font-bold text-slate-800">{selectedCandidate.current_company || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Work Experience</span>
                  <span className="font-bold text-slate-800">{selectedCandidate.total_work_experience || "0"} years</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Current CTC</span>
                  <span className="font-bold text-slate-800">₹{selectedCandidate.current_ctc || "0"} LPA</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Expected CTC</span>
                  <span className="font-bold text-emerald-600">₹{selectedCandidate.expected_ctc || "0"} LPA</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div>
                  <span className="text-indigo-900 font-bold block">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedCandidate.stage1_status)}</div>
                </div>
                {selectedCandidate.resume_url && (
                  <a
                    href={getDisplayResumeUrl(selectedCandidate.resume_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View CV</span>
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateSortlisted;
