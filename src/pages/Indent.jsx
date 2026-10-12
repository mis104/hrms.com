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
  Download
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import useAuthStore from "../store/authStore";
import { supabase } from "../services/supabaseClient";

// Custom Sleek Dropdown Component
const CustomDropdown = ({
  icon: Icon,
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  allLabel = "All",
  count
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close on outside click
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
      opt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const selectedDisplay =
    value === "all" || !value ? `${allLabel} ${count !== undefined ? `(${count})` : ""}` : value;

  return (
    <div className={`relative w-full ${isOpen ? "z-50" : "z-20"}`} ref={dropdownRef}>
      {/* Trigger Button */}
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

      {/* Modern Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-fadeIn min-w-[200px]">
          {/* Internal Search if options > 6 */}
          {options.length > 6 && (
            <div className="px-2.5 pb-2 mb-1 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${label}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto px-1 scrollbar-thin space-y-0.5">
            {/* "All" Option */}
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setIsOpen(false);
                setSearchQuery("");
              }}
              className={`w-full px-3 py-2 text-xs flex items-center justify-between rounded-xl transition-all cursor-pointer text-left ${
                value === "all" || !value
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
              }`}
            >
              <span>
                {allLabel} {count !== undefined ? `(${count})` : ""}
              </span>
              {(value === "all" || !value) && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
            </button>

            {/* Filtered Options */}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                No matching {label.toLowerCase()}
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
                      setSearchQuery("");
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between rounded-xl transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
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

const Indent = () => {
  const user = useAuthStore((state) => state.user);

  // States
  const [indentData, setIndentData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // 'ALL', 'OPEN', 'CLOSED', 'HOLD'
  const [deptFilter, setDeptFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [postFilter, setPostFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Dropdown lists
  const [departments, setDepartments] = useState([]);
  const [indenterNames, setIndenterNames] = useState([]);
  const [timings, setTimings] = useState([]);
  const [postsList, setPostsList] = useState([]);
  const [locationsList, setLocationsList] = useState([
    "Shankar Nagar",
    "Plant",
    "Shyam Plaza",
    "Home",
    "Roma Industries",
    "VBA"
  ]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingIndent, setEditingIndent] = useState(null);

  // Multi-post form state
  const initialPost = {
    post: "",
    gender: "Any",
    priority: "Medium",
    department: "",
    prefer: "Experience",
    numberOfPost: "1",
    salary: "",
    officeTiming: "",
    typeOfWeek: "Week off",
    residence: "Up-down",
    indenterName: "",
    qualifications: "",
    location: "Plant",
  };

  const [posts, setPosts] = useState([{ ...initialPost }]);
  const [formData, setFormData] = useState({
    completionDate: "",
  });

  // Helper: Format current timestamp as DD-MM-YYYY HH:mm:ss
  const getCurrentFormattedTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  // Helper: Calculate Planned Date (1 day after Indent Raise Timestamp)
  const addOneDayToTimestamp = (timestampStr) => {
    if (!timestampStr) return "";
    try {
      const clean = String(timestampStr).trim();
      const match = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const timeParts = clean.split(" ")[1] || "18:00";
        const date = new Date(year, month, day);
        date.setDate(date.getDate() + 1);
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const y = date.getFullYear();
        return `${d}-${m}-${y} ${timeParts}`.trim();
      }
    } catch (_) {}
    return "";
  };

  // Helper: Format date input (YYYY-MM-DD) to DD-MM-YYYY
  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
      const [y, m, d] = dateStr.split("-");
      return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
    }
    return dateStr;
  };

  // Helper: Format DD-MM-YYYY to YYYY-MM-DD for HTML date inputs
  const formatDateToYYYYMMDD = (dateStr) => {
    if (!dateStr) return "";
    const clean = dateStr.trim();
    if (clean.includes("-")) {
      const parts = clean.split("-");
      if (parts[0].length === 2 && parts[2]?.length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
      if (parts[0].length === 4) return clean;
    } else if (clean.includes("/")) {
      const parts = clean.split("/");
      if (parts.length === 3) {
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);
        const p3 = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        if (p2 > 12) {
          return `${p3}-${String(p1).padStart(2, "0")}-${String(p2).padStart(2, "0")}`;
        }
        return `${p3}-${String(p2).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
      }
    }
    return "";
  };

  // Egress Optimization: Selected Columns only (avoids fetching heavy blobs/attachments)
  const INDENT_SELECT_COLUMNS =
    "id, position_status, location, timestamp, indent_no, person_name, post, salary, office_timing, types_of_weekly_off, residence, gender, department, prefer, number_of_post, completion_date, required_qualifications, priority";

  // Helper to update local cache
  const updateLocalIndentCache = (records) => {
    try {
      sessionStorage.setItem("hrms_indent_cache", JSON.stringify(records));
      sessionStorage.setItem("hrms_indent_cache_time", String(Date.now()));
    } catch (_) {}
  };

  // Helper to populate dropdowns from records
  const updateDropdownsFromRecords = (records) => {
    const depts = Array.from(
      new Set(records.map((r) => (r.department || "").trim()).filter(Boolean))
    ).sort();
    const pList = Array.from(
      new Set(records.map((r) => (r.post || "").trim()).filter(Boolean))
    ).sort();
    const locList = Array.from(
      new Set(
        [
          ...locationsList,
          ...records.map((r) => (r.location || "").trim()).filter(Boolean),
        ].filter(Boolean)
      )
    ).sort();
    const indList = Array.from(
      new Set(
        records.map((r) => (r.person_name || "").trim()).filter(Boolean)
      )
    ).sort();
    const timeList = Array.from(
      new Set(
        records.map((r) => (r.office_timing || "").trim()).filter(Boolean)
      )
    ).sort();

    setDepartments(depts);
    setPostsList(pList);
    setLocationsList(locList);
    if (indList.length > 0) setIndenterNames(indList);
    if (timeList.length > 0) setTimings(timeList);
  };

  // Fetch all Indents with Low-Egress Caching (SWR)
  const fetchData = async (forceRefresh = false) => {
    // 1. Check local session cache if not forcing refresh
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem("hrms_indent_cache");
        const cacheTime = sessionStorage.getItem("hrms_indent_cache_time");
        if (cached && cacheTime && Date.now() - parseInt(cacheTime, 10) < 5 * 60 * 1000) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIndentData(parsed);
            updateDropdownsFromRecords(parsed);
            return;
          }
        }
      } catch (_) {}
    }

    setTableLoading(true);
    try {
      // Egress Optimization: Select only required columns
      const { data, error } = await supabase
        .from("fms")
        .select(INDENT_SELECT_COLUMNS)
        .order("id", { ascending: false });

      if (error) throw error;

      let records = data || [];

      // Filter by role if restricted
      const isRecruiter = user?.Admin?.trim().toLowerCase() === "recruiter";
      const userLocation = user?.Location?.trim().toLowerCase() || "";
      const isRestrictedPlantRecruiter = isRecruiter && userLocation === "plant";

      if (isRestrictedPlantRecruiter) {
        records = records.filter(
          (item) => (item.location || "").toLowerCase() === "plant"
        );
      }

      setIndentData(records);
      updateLocalIndentCache(records);
      updateDropdownsFromRecords(records);

      // Low egress dropdown cache
      fetchMasterDropdowns();
    } catch (err) {
      console.error("Failed to fetch indent records from Supabase:", err);
      toast.error("Failed to load indents from database");
    } finally {
      setTableLoading(false);
    }
  };

  const fetchMasterDropdowns = async () => {
    try {
      // Check cached dropdowns first to prevent repeat queries
      const cached = sessionStorage.getItem("hrms_indent_dropdowns_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.indenter) && parsed.indenter.length > 0) {
            setIndenterNames((prev) => Array.from(new Set([...prev, ...parsed.indenter])).sort());
            setDepartments((prev) => Array.from(new Set([...prev, ...parsed.dept])).sort());
            setTimings((prev) => Array.from(new Set([...prev, ...parsed.timing])).sort());
            return;
          }
        } catch (_) {}
      }

      const { data } = await supabase
        .from("master_dropdowns")
        .select("person_name, indenter_name, entry_by, department, office_timing, timing")
        .limit(100);

      if (data && data.length > 0) {
        const mdIndenter = Array.from(
          new Set(data.map((d) => (d.person_name || d.indenter_name || d.entry_by || "").trim()).filter(Boolean))
        );
        const mdDept = Array.from(
          new Set(data.map((d) => (d.department || "").trim()).filter(Boolean))
        );
        const mdTiming = Array.from(
          new Set(data.map((d) => (d.office_timing || d.timing || "").trim()).filter(Boolean))
        );

        sessionStorage.setItem(
          "hrms_indent_dropdowns_cache",
          JSON.stringify({ indenter: mdIndenter, dept: mdDept, timing: mdTiming })
        );

        if (mdIndenter.length > 0) {
          setIndenterNames((prev) => Array.from(new Set([...prev, ...mdIndenter])).sort());
        }
        if (mdDept.length > 0) {
          setDepartments((prev) => Array.from(new Set([...prev, ...mdDept])).sort());
        }
        if (mdTiming.length > 0) {
          setTimings((prev) => Array.from(new Set([...prev, ...mdTiming])).sort());
        }
      }
    } catch (_) {
      // optional fallback
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = indentData.length;
    const open = indentData.filter(
      (r) => (r.position_status || "").toUpperCase() === "OPEN"
    ).length;
    const closed = indentData.filter(
      (r) => (r.position_status || "").toUpperCase() === "CLOSED"
    ).length;
    const hold = indentData.filter(
      (r) => (r.position_status || "").toUpperCase() === "HOLD"
    ).length;
    return { total, open, closed, hold };
  }, [indentData]);

  // Filtered Indents
  const filteredData = useMemo(() => {
    return indentData.filter((item) => {
      // Tab filter
      const statusUpper = (item.position_status || "OPEN").toUpperCase();
      if (activeTab === "OPEN" && statusUpper !== "OPEN") return false;
      if (activeTab === "CLOSED" && statusUpper !== "CLOSED") return false;
      if (activeTab === "HOLD" && statusUpper !== "HOLD") return false;

      // Dropdown filters
      if (deptFilter !== "all" && item.department !== deptFilter) return false;
      if (locationFilter !== "all" && item.location !== locationFilter) return false;
      if (postFilter !== "all" && item.post !== postFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchFound =
          (item.indent_no || "").toLowerCase().includes(query) ||
          (item.person_name || "").toLowerCase().includes(query) ||
          (item.post || "").toLowerCase().includes(query) ||
          (item.department || "").toLowerCase().includes(query) ||
          (item.location || "").toLowerCase().includes(query) ||
          (item.salary || "").toLowerCase().includes(query) ||
          (item.timestamp || "").toLowerCase().includes(query) ||
          (item.required_qualifications || "").toLowerCase().includes(query);
        if (!matchFound) return false;
      }

      return true;
    }).sort((a, b) => {
      const aIndent = String(a.indent_no || "").trim();
      const bIndent = String(b.indent_no || "").trim();
      return bIndent.localeCompare(aIndent, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [indentData, activeTab, deptFilter, locationFilter, postFilter, searchTerm]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  // Form Handlers
  const handlePostInputChange = (index, e) => {
    const { name, value } = e.target;
    const updated = [...posts];
    updated[index] = { ...updated[index], [name]: value };
    setPosts(updated);
  };

  const handleCommonInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addPostField = () => {
    setPosts([...posts, { ...initialPost }]);
  };

  const removePostField = (index) => {
    if (posts.length > 1) {
      setPosts(posts.filter((_, i) => i !== index));
    }
  };

  // Generate Next Indent No
  const generateNextIndentNo = () => {
    try {
      const numbers = indentData
        .map((r) => {
          const match = (r.indent_no || "").match(/\d+/);
          return match ? parseInt(match[0], 10) : null;
        })
        .filter((n) => n !== null && !isNaN(n));

      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNum = maxNum + 1;
      return `IN-${String(nextNum).padStart(2, "0")}`;
    } catch (_) {
      return `IN-${Date.now().toString().slice(-4)}`;
    }
  };

  const handleEdit = (item) => {
    setEditingIndent(item);
    setPosts([
      {
        post: item.post || "",
        gender: item.gender || "Any",
        priority: item.priority || "Medium",
        department: item.department || "",
        prefer: item.prefer || "Experience",
        numberOfPost: item.number_of_post || "1",
        salary: item.salary || "",
        officeTiming: item.office_timing || "",
        typeOfWeek: item.types_of_weekly_off || "Week off",
        residence: item.residence || "Up-down",
        indenterName: item.person_name || "",
        qualifications: item.required_qualifications || "",
        location: item.location || "Plant",
      },
    ]);
    setFormData({
      completionDate: formatDateToYYYYMMDD(item.completion_date),
    });
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete indent ${item.indent_no || item.post}?`)) {
      return;
    }

    try {
      setTableLoading(true);
      const { error } = await supabase
        .from("fms")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast.success(`Indent ${item.indent_no} deleted successfully!`);
      setIndentData((prev) => {
        const updated = prev.filter((r) => r.id !== item.id);
        updateLocalIndentCache(updated);
        return updated;
      });
    } catch (err) {
      console.error("Delete indent error:", err);
      toast.error("Failed to delete indent: " + err.message);
    } finally {
      setTableLoading(false);
    }
  };

  const handleCancelModal = () => {
    setEditingIndent(null);
    setPosts([{ ...initialPost }]);
    setFormData({ completionDate: "" });
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.completionDate) {
      toast.error("Please select a Completion Date");
      return;
    }

    // Validate each post
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (!p.post || !p.department || !p.indenterName) {
        toast.error(`Please fill Post Title, Department & Indenter for Entry #${i + 1}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const formattedCompletionDate = formatDateToDDMMYYYY(formData.completionDate);
      const timestamp = getCurrentFormattedTimestamp();

      if (editingIndent) {
        // Edit existing single indent
        const p = posts[0];
        const updatePayload = {
          person_name: p.indenterName || "",
          post: p.post || "",
          salary: p.salary || "",
          office_timing: p.officeTiming || "",
          types_of_weekly_off: p.typeOfWeek || "",
          residence: p.residence || "",
          gender: p.gender || "",
          department: p.department || "",
          prefer: p.prefer || "",
          number_of_post: p.numberOfPost || "1",
          completion_date: formattedCompletionDate,
          required_qualifications: p.qualifications || "",
          location: p.location || "",
          priority: p.priority || "",
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("fms")
          .update(updatePayload)
          .eq("id", editingIndent.id)
          .select(INDENT_SELECT_COLUMNS);

        if (error) throw error;

        const updatedRow = data && data[0] ? data[0] : { ...editingIndent, ...updatePayload };

        setIndentData((prev) => {
          const updated = prev.map((r) => (r.id === editingIndent.id ? { ...r, ...updatedRow } : r));
          updateLocalIndentCache(updated);
          updateDropdownsFromRecords(updated);
          return updated;
        });

        toast.success(`Indent ${editingIndent.indent_no} updated successfully!`);
        handleCancelModal();
      } else {
        // Create one or multiple new indents
        let currentNextNoBase = generateNextIndentNo();
        let baseNum = parseInt((currentNextNoBase.match(/\d+/) || [0])[0], 10);

        const rowsToInsert = posts.map((p, idx) => {
          const indentNo = `IN-${String(baseNum + idx).padStart(2, "0")}`;
          return {
            position_status: "OPEN",
            location: p.location || "Plant",
            timestamp: timestamp,
            indent_no: indentNo,
            person_name: p.indenterName || "",
            post: p.post || "",
            salary: p.salary || "",
            office_timing: p.officeTiming || "",
            types_of_weekly_off: p.typeOfWeek || "",
            residence: p.residence || "",
            gender: p.gender || "",
            department: p.department || "",
            prefer: p.prefer || "",
            number_of_post: p.numberOfPost || "1",
            completion_date: formattedCompletionDate,
            required_qualifications: p.qualifications || "",
            priority: p.priority || "Medium",
            stage1_planned: timestamp,
            stage2_planned: addOneDayToTimestamp(timestamp),
            stage1_status: "Pending",
            stage2_status: "Pending",
            stage3_status: "Pending",
            closer_status: "",
          };
        });

        const { data, error } = await supabase
          .from("fms")
          .insert(rowsToInsert)
          .select(INDENT_SELECT_COLUMNS);

        if (error) throw error;

        const newlyInserted = data || rowsToInsert;

        setIndentData((prev) => {
          const updated = [...newlyInserted, ...prev];
          updateLocalIndentCache(updated);
          updateDropdownsFromRecords(updated);
          return updated;
        });

        toast.success(`Successfully created ${posts.length} indent(s)!`);
        handleCancelModal();
      }
    } catch (err) {
      console.error("Submit indent error:", err);
      toast.error("Failed to save indent: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  // Export Full / Filtered Indents Report to Excel (.xlsx)
  const handleExportToExcel = () => {
    try {
      const dataToExport = filteredData.length > 0 ? filteredData : indentData;
      if (dataToExport.length === 0) {
        toast.error("No indent data available to export");
        return;
      }

      const formattedRows = dataToExport.map((item, index) => ({
        "S.No": index + 1,
        "Position Status": item.position_status || "OPEN",
        "Timestamp": item.timestamp || "",
        "Indent No": item.indent_no || "",
        "Location": item.location || "",
        "Person Name (Indenter)": item.person_name || "",
        "Post": item.post || "",
        "Department": item.department || "",
        "Number Of Post": item.number_of_post || "1",
        "Salary": item.salary || "",
        "Office Timing": item.office_timing || "",
        "Types of Weekly Off": item.types_of_weekly_off || "",
        "Residence": item.residence || "",
        "Gender": item.gender || "",
        "Prefer": item.prefer || "",
        "Completion Date": item.completion_date || "",
        "Required Qualifications": item.required_qualifications || "",
        "Priority": item.priority || "",
        "Selected Candidate Name": item.selected_candidate_name || "",
        "Finalized Salary": item.finalized_salary || "",
        "Indent Close Status": item.indent_close_status || "",
        "Closer Status": item.closer_status || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedRows);

      // Auto-size columns
      const colWidths = [
        { wch: 6 },  // S.No
        { wch: 16 }, // Status
        { wch: 20 }, // Timestamp
        { wch: 12 }, // Indent No
        { wch: 15 }, // Location
        { wch: 22 }, // Person Name
        { wch: 26 }, // Post
        { wch: 18 }, // Department
        { wch: 14 }, // Number of post
        { wch: 16 }, // Salary
        { wch: 15 }, // Office Timing
        { wch: 15 }, // Weekly Off
        { wch: 14 }, // Residence
        { wch: 10 }, // Gender
        { wch: 14 }, // Prefer
        { wch: 16 }, // Completion Date
        { wch: 30 }, // Qualifications
        { wch: 12 }, // Priority
        { wch: 24 }, // Selected Candidate
        { wch: 16 }, // Finalized Salary
        { wch: 20 }, // Indent Close Status
        { wch: 14 }, // Closer Status
      ];
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Indent_Report");

      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Indent_Report_${today}.xlsx`);

      toast.success(`Exported ${formattedRows.length} indents to Excel!`);
    } catch (err) {
      console.error("Export Excel error:", err);
      toast.error("Failed to export Excel report: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-6 space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-navy to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                  Indent Management
                </h1>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  {stats.total} Total
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage position openings, required qualifications, and track recruitment SLA
              </p>
            </div>
          </div>

          {/* Action buttons on right */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Table / Grid view switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-white text-navy shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Table View"
              >
                <LayoutList className="w-4 h-4" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-navy shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Grid / Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={tableLoading}
              className="p-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
              title="Refresh Data from Database"
            >
              <RefreshCw className={`w-4 h-4 ${tableLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            {/* Export Excel Report Button */}
            <button
              onClick={handleExportToExcel}
              disabled={indentData.length === 0}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Download Full Excel Indent Report"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Create Indent CTA */}
            <button
              onClick={() => {
                setEditingIndent(null);
                setPosts([{ ...initialPost }]);
                setFormData({ completionDate: "" });
                setShowModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-navy to-indigo-700 hover:from-navy-dark hover:to-indigo-800 text-white rounded-xl font-medium text-sm shadow-md shadow-indigo-700/20 hover:shadow-indigo-700/30 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Indent</span>
            </button>
          </div>
        </div>

        {/* Quick Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-slate-100 scrollbar-thin">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white shadow-sm shadow-slate-900/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <span>All Indents</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("OPEN")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "OPEN"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200/60"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Open Positions</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "OPEN" ? "bg-white/20 text-white" : "bg-emerald-200 text-emerald-800"
            }`}>
              {stats.open}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("CLOSED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "CLOSED"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 border border-indigo-200/60"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Closed / Filled</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "CLOSED" ? "bg-white/20 text-white" : "bg-indigo-200 text-indigo-800"
            }`}>
              {stats.closed}
            </span>
          </button>

          {stats.hold > 0 && (
            <button
              onClick={() => setActiveTab("HOLD")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "HOLD"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100/80 border border-amber-200/60"
              }`}
            >
              <span>On Hold</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "HOLD" ? "bg-white/20 text-white" : "bg-amber-200 text-amber-800"
              }`}>
                {stats.hold}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3 sm:p-4 relative z-30">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Indent #, Post, Person, etc..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy focus:border-navy transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Custom Dropdown */}
          <CustomDropdown
            icon={Building2}
            label="Department"
            allLabel="All Departments"
            value={deptFilter}
            count={departments.length}
            options={departments}
            onChange={(val) => {
              setDeptFilter(val);
              setCurrentPage(1);
            }}
          />

          {/* Location Custom Dropdown */}
          <CustomDropdown
            icon={MapPin}
            label="Location"
            allLabel="All Locations"
            value={locationFilter}
            options={locationsList}
            onChange={(val) => {
              setLocationFilter(val);
              setCurrentPage(1);
            }}
          />

          {/* Post Custom Dropdown */}
          <CustomDropdown
            icon={Briefcase}
            label="Post"
            allLabel="All Posts"
            value={postFilter}
            count={postsList.length}
            options={postsList}
            onChange={(val) => {
              setPostFilter(val);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Active Filter Clear Tags */}
        {(searchTerm || deptFilter !== "all" || locationFilter !== "all" || postFilter !== "all") && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Active Filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                Search: "{searchTerm}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm("")} />
              </span>
            )}
            {deptFilter !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
                Dept: {deptFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setDeptFilter("all")} />
              </span>
            )}
            {locationFilter !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg border border-orange-200">
                Loc: {locationFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setLocationFilter("all")} />
              </span>
            )}
            {postFilter !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                Post: {postFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPostFilter("all")} />
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm("");
                setDeptFilter("all");
                setLocationFilter("all");
                setPostFilter("all");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium ml-auto"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Table / Grid Container */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col relative z-10">
          {/* Scrollable Table Viewport with Sticky Header */}
          <div className="overflow-x-auto max-h-[calc(100vh-270px)] scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead className="bg-slate-100/90 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                <tr>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-center">
                    Status
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <div className="flex items-center gap-1.5 text-navy">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Timestamp / Added On</span>
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Indent #
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Location
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Post / Designation
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Department
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Indenter Name
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-center">
                    Posts #
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Salary
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Office Timing
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Weekly Off
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Gender
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Preference
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Target Completion
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 max-w-[200px]">
                    Qualifications
                  </th>
                  <th className="py-3 px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-center sticky right-0 bg-slate-100/95 backdrop-blur-md shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
                {tableLoading ? (
                  <tr>
                    <td colSpan="16" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-slate-600">Loading Indent records from database...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="16" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Briefcase className="w-10 h-10 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">No Indents Found</p>
                        <p className="text-xs text-slate-500">
                          Try adjusting your search filters or click "Create Indent" to add a new requirement.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, idx) => {
                    const isClosed = (item.position_status || "").toUpperCase() === "CLOSED";
                    const isOpen = (item.position_status || "OPEN").toUpperCase() === "OPEN";

                    return (
                      <tr
                        key={item.id || idx}
                        className="hover:bg-indigo-50/40 transition-colors group"
                      >
                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                              isOpen
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isClosed
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOpen ? "bg-emerald-500" : isClosed ? "bg-slate-400" : "bg-amber-500"
                              }`}
                            ></span>
                            {item.position_status || "OPEN"}
                          </span>
                        </td>

                        {/* Timestamp (Prominently Highlighted) */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                            <span className="font-mono text-[11px] text-slate-800 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
                              {item.timestamp || "-"}
                            </span>
                          </div>
                        </td>

                        {/* Indent Number */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-indigo-900 bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100">
                            {item.indent_no || "-"}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                              (item.location || "").toLowerCase().includes("plant")
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : (item.location || "").toLowerCase().includes("roma")
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : (item.location || "").toLowerCase().includes("shankar")
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : (item.location || "").toLowerCase().includes("shyam")
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            <MapPin className="w-3 h-3" />
                            {item.location || "Plant"}
                          </span>
                        </td>

                        {/* Post / Designation */}
                        <td className="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap">
                          {item.post || "-"}
                        </td>

                        {/* Department */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                          <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                            {item.department || "-"}
                          </span>
                        </td>

                        {/* Person Name */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              {(item.person_name || "I").charAt(0).toUpperCase()}
                            </div>
                            <span>{item.person_name || "-"}</span>
                          </div>
                        </td>

                        {/* No of Posts */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-full text-[11px] border border-slate-200">
                            {item.number_of_post || "1"}
                          </span>
                        </td>

                        {/* Salary */}
                        <td className="py-3 px-3.5 whitespace-nowrap font-medium text-emerald-700">
                          {item.salary || "-"}
                        </td>

                        {/* Office Timing */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                          {item.office_timing || "-"}
                        </td>

                        {/* Weekly Off */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                          {item.types_of_weekly_off || "-"}
                        </td>

                        {/* Gender */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                          {item.gender || "Any"}
                        </td>

                        {/* Prefer */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                          {item.prefer || "-"}
                        </td>

                        {/* Completion Date */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.completion_date || "-"}</span>
                          </div>
                        </td>

                        {/* Required Qualifications */}
                        <td className="py-3 px-3.5 text-slate-600 max-w-[200px] truncate" title={item.required_qualifications}>
                          {item.required_qualifications || "-"}
                        </td>

                        {/* Actions (Sticky Right) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-indigo-50/60 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors"
                              title="Edit Indent"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                              title="Delete Indent"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Pagination Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * itemsPerPage, filteredData.length)}
              </span>{" "}
              of <span className="font-semibold text-slate-800">{filteredData.length}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-3 py-1 font-medium bg-white border border-slate-200 rounded-lg">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Grid / Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tableLoading ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-600">Loading Indent cards...</p>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Indents Found</p>
            </div>
          ) : (
            paginatedData.map((item, idx) => {
              const isOpen = (item.position_status || "OPEN").toUpperCase() === "OPEN";
              return (
                <div
                  key={item.id || idx}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200/80 p-4 flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Header: Status, Timestamp & Indent No */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs">
                          {item.indent_no || "-"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isOpen
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.position_status || "OPEN"}
                        </span>
                      </div>

                      {/* Timestamp Badge */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>{item.timestamp || "-"}</span>
                      </div>
                    </div>

                    {/* Post & Department */}
                    <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1">
                      {item.post || "-"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 flex-wrap">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                        {item.department || "General"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        <MapPin className="w-3 h-3" />
                        {item.location || "Plant"}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span>{item.number_of_post || 1} Opening(s)</span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 mb-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Indenter:</span>
                        <span className="font-medium text-slate-800 truncate block">{item.person_name || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Salary:</span>
                        <span className="font-semibold text-emerald-700 block">{item.salary || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Timing / Off:</span>
                        <span className="text-slate-700 block truncate">{item.office_timing || "-"} | {item.types_of_weekly_off || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Target Date:</span>
                        <span className="text-slate-700 font-medium block">{item.completion_date || "-"}</span>
                      </div>
                    </div>

                    {item.required_qualifications && (
                      <p className="text-xs text-slate-500 italic line-clamp-2 mb-3">
                        <span className="font-semibold not-italic text-slate-600">Req: </span>
                        {item.required_qualifications}
                      </p>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-navy text-white flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    {editingIndent ? `Edit Indent (${editingIndent.indent_no})` : "Create New Indent(s)"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fill in position specifications and requirements
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin">
                {/* Common Target Completion Date */}
                <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 max-w-md">
                  <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wide mb-1.5">
                    Common Target Completion Date *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600" />
                    <input
                      type="date"
                      name="completionDate"
                      value={formData.completionDate}
                      onChange={handleCommonInputChange}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy"
                      required
                    />
                  </div>
                </div>

                {/* Post Entries (Multi-post support) */}
                {posts.map((postField, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-indigo-600" />
                        Position Requirement #{index + 1}
                      </span>
                      {posts.length > 1 && !editingIndent && (
                        <button
                          type="button"
                          onClick={() => removePostField(index)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                      {/* Post Title */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Post / Designation (पद) *
                        </label>
                        <input
                          type="text"
                          name="post"
                          value={postField.post}
                          onChange={(e) => handlePostInputChange(index, e)}
                          placeholder="e.g. Account Executive, Fitter, Sales"
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                          required
                        />
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Department *
                        </label>
                        <select
                          name="department"
                          value={postField.department}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                          required
                        >
                          <option value="">Select Department</option>
                          {departments.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                          <option value="Admin">Admin</option>
                          <option value="Account">Account</option>
                          <option value="Sales">Sales</option>
                          <option value="CRM">CRM</option>
                          <option value="Technical">Technical</option>
                          <option value="Production">Production</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Indenter Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Indenter (Person Name) *
                        </label>
                        <input
                          type="text"
                          name="indenterName"
                          list={`indenter-list-${index}`}
                          value={postField.indenterName}
                          onChange={(e) => handlePostInputChange(index, e)}
                          placeholder="e.g. Apurva Ray"
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                          required
                        />
                        <datalist id={`indenter-list-${index}`}>
                          {indenterNames.map((n) => (
                            <option key={n} value={n} />
                          ))}
                        </datalist>
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Location
                        </label>
                        <select
                          name="location"
                          value={postField.location}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        >
                          <option value="Plant">Plant</option>
                          <option value="Shankar Nagar">Shankar Nagar</option>
                          <option value="Shyam Plaza">Shyam Plaza</option>
                          <option value="Home">Home</option>
                          <option value="Roma Industries">Roma Industries</option>
                          <option value="VBA">VBA</option>
                        </select>
                      </div>

                      {/* No of Posts */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          No. of Posts
                        </label>
                        <input
                          type="number"
                          min="1"
                          name="numberOfPost"
                          value={postField.numberOfPost}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        />
                      </div>

                      {/* Salary Range */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Salary Range
                        </label>
                        <input
                          type="text"
                          name="salary"
                          value={postField.salary}
                          onChange={(e) => handlePostInputChange(index, e)}
                          placeholder="e.g. 15000 - 20000"
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        />
                      </div>

                      {/* Office Timing */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Office Timing
                        </label>
                        <input
                          type="text"
                          name="officeTiming"
                          list={`timing-list-${index}`}
                          value={postField.officeTiming}
                          onChange={(e) => handlePostInputChange(index, e)}
                          placeholder="e.g. 9 To 6, 10 To 8"
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        />
                        <datalist id={`timing-list-${index}`}>
                          {timings.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      </div>

                      {/* Weekly Off */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Weekly Off
                        </label>
                        <select
                          name="typeOfWeek"
                          value={postField.typeOfWeek}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        >
                          <option value="Week off">Week off</option>
                          <option value="No week off">No week off</option>
                          <option value="Rotational">Rotational</option>
                        </select>
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Gender
                        </label>
                        <select
                          name="gender"
                          value={postField.gender}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        >
                          <option value="Any">Any</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>

                      {/* Residence */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Residence
                        </label>
                        <select
                          name="residence"
                          value={postField.residence}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        >
                          <option value="Up-down">Up-down</option>
                          <option value="Stay">Stay</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>

                      {/* Preference */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Preference
                        </label>
                        <select
                          name="prefer"
                          value={postField.prefer}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        >
                          <option value="Experience">Experience</option>
                          <option value="Fresher">Fresher</option>
                          <option value="Any">Any</option>
                        </select>
                      </div>

                      {/* Required Qualifications */}
                      <div className="sm:col-span-2 md:col-span-4">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Required Qualifications & Skills
                        </label>
                        <textarea
                          rows={2}
                          name="qualifications"
                          value={postField.qualifications}
                          onChange={(e) => handlePostInputChange(index, e)}
                          placeholder="e.g. Graduated, ITI, B.Tech, 2+ Years Experience in Tally, Good Communication..."
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Another Post Button */}
                {!editingIndent && (
                  <button
                    type="button"
                    onClick={addPostField}
                    className="w-full py-2.5 border-2 border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50/50 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Post Entry</span>
                  </button>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelModal}
                  disabled={submitting}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-navy to-indigo-700 hover:from-navy-dark hover:to-indigo-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-700/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : editingIndent ? (
                    <span>Update Indent</span>
                  ) : (
                    <span>Create Indents</span>
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

export default Indent;
