import React, { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  Plus, 
  X, 
  Filter, 
  Globe, 
  PhoneCall, 
  Building2, 
  ExternalLink, 
  RefreshCw, 
  Briefcase, 
  Sparkles, 
  Users, 
  Calendar,
  AlertCircle,
  FileCheck,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Phone,
  User,
  Copy,
  Check,
  ArrowRight,
  Trash2,
  Upload,
  Paperclip,
  Image,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { recordDataResponse } from "../services/supabaseService";

const DEFAULT_SOCIAL_SITES = [
  "indeed.com",
  "Online Posting",
  "Naukri.com",
  "LinkedIn",
  "WorkIndia",
  "Apna",
  "WhatsApp Blast",
  "Company Website",
  "Other"
];

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
  "Sonalam Consultancy"
];

const getCurrentFormattedTimestamp = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${d}-${m}-${y} ${hh}:${mm}:${ss}`;
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
      const timeParts = clean.split(" ")[1] || "";
      const date = new Date(year, month, day);
      date.setDate(date.getDate() + 1);
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return timeParts ? `${d}-${m}-${y} ${timeParts}`.trim() : `${d}-${m}-${y}`;
    }
    const dObj = new Date(clean);
    if (!isNaN(dObj.getTime())) {
      dObj.setDate(dObj.getDate() + 1);
      const d = String(dObj.getDate()).padStart(2, "0");
      const m = String(dObj.getMonth() + 1).padStart(2, "0");
      const y = dObj.getFullYear();
      const hh = String(dObj.getHours()).padStart(2, "0");
      const mm = String(dObj.getMinutes()).padStart(2, "0");
      return `${d}-${m}-${y} ${hh}:${mm}`;
    }
  } catch (_) {}
  return "";
};

const OnlinePosting = () => {
  const [postFormData, setPostFormData] = useState({
    siteStatus: "",
    socialSiteTypes: [],
    onlinePlatformAttachments: [""],
    onlinePlatformAttachment: "",
    selectedFile: null,
    status: "Yes",
    agencyStatus: "Yes",
    jobConsultancyNames: [],
    consultancyContacts: {},
  });

  const [activeTab, setActiveTab] = useState("pending");
  const [indentData, setIndentData] = useState([]);
  const [historyIndentData, setHistoryIndentData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [desigFilter, setDesigFilter] = useState("");
  const [tableLoading, setTableLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination states (Default 50 rows, ultra low-egress)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Modals
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isDraggingAgencyFile, setIsDraggingAgencyFile] = useState(false);
  const [uploadingAgencyFiles, setUploadingAgencyFiles] = useState(false);

  // Consultancy Directory Modal State
  const [showConsultancyModal, setShowConsultancyModal] = useState(false);
  const [consultancySearch, setConsultancySearch] = useState("");
  const [consultancyDirectory, setConsultancyDirectory] = useState([]);
  const [copiedPhone, setCopiedPhone] = useState(null);

  const [socialSiteOptions, setSocialSiteOptions] = useState(DEFAULT_SOCIAL_SITES);
  const [consultancyOptions, setConsultancyOptions] = useState(DEFAULT_JOB_CONSULTANCIES);

  // Reset page when filters, tab or rows per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, desigFilter, activeTab, rowsPerPage]);

  // ==========================================
  // FETCH FROM SUPABASE (LOW EGRESS COLUMN PROJECTION + VLOOKUP)
  // ==========================================
  const fetchData = async (isBackground = false) => {
    if (!isBackground) setTableLoading(true);
    try {
      // 1. Fetch FMS indents with LOW EGRESS column projection
      const { data: fmsData, error: fmsErr } = await supabase
        .from("fms")
        .select(
          "id, indent_no, timestamp, person_name, post, salary, office_timing, types_of_weekly_off, residence, gender, department, prefer, number_of_post, completion_date, required_qualifications, stage1_planned, stage1_actual, stage1_status, online_platform, online_platform_attachments, stage2_planned, stage2_actual, stage2_status, job_consultancy, contact_person_name, contact_no, position_status, created_at"
        )
        .order("created_at", { ascending: false });

      if (fmsErr) throw fmsErr;

      // 2. Fetch Data Response records for PO-1 and PO-2 (LOW EGRESS projection)
      const { data: drData, error: drErr } = await supabase
        .from("data_response")
        .select(
          "id, unique_id, step_code, timestamp, status, online_platform, attachment, job_consultancy, job_consultancy_attachment, contact_person_name, contact_no"
        )
        .in("step_code", ["PO-1", "PO-2"])
        .order("id", { ascending: true });

      if (drErr) console.warn("data_response fetch warning:", drErr);

      // 3. Build lookup maps by unique_id (Indent Number)
      const po1Map = {};
      const po2Map = {};
      const consultanciesMap = {};
      const socialSitesSet = new Set(DEFAULT_SOCIAL_SITES);

      // Initialize default consultancies
      DEFAULT_JOB_CONSULTANCIES.forEach((name) => {
        consultanciesMap[name] = {
          name,
          contacts: new Set(),
          phones: new Set(),
          indents: new Set(),
          lastUsed: "",
        };
      });

      (drData || []).forEach((dr) => {
        const uid = (dr.unique_id || "").trim();
        if (!uid) return;

        if (dr.step_code === "PO-1") {
          po1Map[uid] = dr;
          if (dr.online_platform) {
            dr.online_platform
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
              .forEach((p) => socialSitesSet.add(p));
          }
        } else if (dr.step_code === "PO-2") {
          po2Map[uid] = dr;
          if (dr.job_consultancy) {
            const names = dr.job_consultancy.split(",").map((c) => c.trim()).filter(Boolean);
            const contacts = (dr.contact_person_name || "").split(",").map((c) => c.trim());
            const phones = (dr.contact_no || "").split(",").map((c) => c.trim());

            names.forEach((name, idx) => {
              if (!consultanciesMap[name]) {
                consultanciesMap[name] = {
                  name,
                  contacts: new Set(),
                  phones: new Set(),
                  indents: new Set(),
                  lastUsed: "",
                };
              }
              if (contacts[idx]) consultanciesMap[name].contacts.add(contacts[idx]);
              if (phones[idx]) consultanciesMap[name].phones.add(phones[idx]);
              if (dr.unique_id) consultanciesMap[name].indents.add(dr.unique_id);
              if (dr.timestamp) consultanciesMap[name].lastUsed = dr.timestamp;
            });
          }
        }
      });

      const records = fmsData || [];

      // Also add any consultancies/social sites from fms
      records.forEach((r) => {
        if (r.job_consultancy) {
          const names = r.job_consultancy.split(",").map((c) => c.trim()).filter(Boolean);
          const contacts = (r.contact_person_name || "").split(",").map((c) => c.trim());
          const phones = (r.contact_no || "").split(",").map((c) => c.trim());

          names.forEach((name, idx) => {
            if (!consultanciesMap[name]) {
              consultanciesMap[name] = {
                name,
                contacts: new Set(),
                phones: new Set(),
                indents: new Set(),
                lastUsed: "",
              };
            }
            if (contacts[idx]) consultanciesMap[name].contacts.add(contacts[idx]);
            if (phones[idx]) consultanciesMap[name].phones.add(phones[idx]);
            if (r.indent_no) consultanciesMap[name].indents.add(r.indent_no);
          });
        }
        if (r.online_platform) {
          r.online_platform
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .forEach((p) => socialSitesSet.add(p));
        }
      });

      const directoryList = Object.values(consultanciesMap)
        .map((c) => ({
          name: c.name,
          contacts: Array.from(c.contacts).filter(Boolean),
          phones: Array.from(c.phones).filter(Boolean),
          totalIndents: c.indents.size,
          lastUsed: c.lastUsed,
        }))
        .sort((a, b) => b.totalIndents - a.totalIndents || a.name.localeCompare(b.name));

      setConsultancyDirectory(directoryList);
      setConsultancyOptions(directoryList.map((c) => c.name));
      setSocialSiteOptions(Array.from(socialSitesSet));

      const pending = [];
      const history = [];

      records.forEach((row) => {
        const uid = (row.indent_no || "").trim();
        const po1 = po1Map[uid];
        const po2 = po2Map[uid];

        const rawPlanned = (row.stage1_planned || "").toString().trim();
        const planned = rawPlanned || (row.timestamp ? String(row.timestamp).trim() : "");
        const actual = po1?.timestamp || (row.stage1_actual || "").toString().trim();

        const rawAgencyPlanned = (row.stage2_planned || "").toString().trim();
        const agencyPlanned = rawAgencyPlanned || addOneDayToTimestamp(row.timestamp);
        const agencyActual = po2?.timestamp || (row.stage2_actual || "").toString().trim();

        // Pending is decided purely by the FMS Planned/Actual columns:
        // Planned is NOT blank AND Actual IS blank — same rule for Stage 1 & Stage 2.
        // (Do not use the data_response po1/po2 fallback here, otherwise a stray
        // PO record hides a row whose fms Actual column is still blank.)
        const onlinePending = rawPlanned !== "" && (row.stage1_actual || "").toString().trim() === "";
        const agencyPending = rawAgencyPlanned !== "" && (row.stage2_actual || "").toString().trim() === "";
        const onlineDone = planned !== "" && actual !== "";
        const agencyDone = agencyPlanned !== "" && agencyActual !== "";

        const siteStatus = po1?.status || row.stage1_status || "";
        const socialSiteTypes = po1?.online_platform || row.online_platform || "";
        const onlineAttachment = po1?.attachment || row.online_platform_attachments || "";

        const agencyStatus = po2?.status || row.stage2_status || "";
        const jobConsultancyDR = po2?.job_consultancy || row.job_consultancy || "";
        const jobConsultancyAttachment = po2?.job_consultancy_attachment || "";
        const contactPersonDR = po2?.contact_person_name || row.contact_person_name || "";
        const contactNumberDR = po2?.contact_no || row.contact_no || "";

        const item = {
          status: row.position_status || "OPEN",
          stepCode: "PO-1",
          indentNumber: row.indent_no || "",
          timestamp: row.timestamp || "",
          indenterName: row.person_name || "",
          post: row.post || "",
          salary: row.salary || "",
          officeTiming: row.office_timing || "",
          typeOfWeek: row.types_of_weekly_off || "",
          residence: row.residence || "",
          gender: row.gender || "",
          department: row.department || "",
          prefer: row.prefer || "",
          noOfPost: row.number_of_post || "1",
          completionDate: row.completion_date || "",
          experience: row.required_qualifications || "",
          planned,
          actual,
          agencyPlanned,
          agencyActual,
          onlinePending,
          agencyPending,
          onlineDone,
          agencyDone,
          siteStatus,
          socialSiteTypes,
          onlineAttachment,
          agencyStatus,
          jobConsultancyDR,
          jobConsultancyAttachment,
          contactPersonDR,
          contactNumberDR,
        };

        if (onlinePending || agencyPending) {
          pending.push(item);
        } else if (onlineDone || agencyDone || row.position_status !== "CLOSED") {
          history.push(item);
        }
      });

      setIndentData(pending);
      setHistoryIndentData(history);
    } catch (error) {
      console.error("OnlinePosting Data Fetch Error:", error);
      toast.error("Failed to load data: " + error.message);
    } finally {
      if (!isBackground) setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    setRefreshing(false);
    toast.success("Data refreshed successfully!");
  };

  const handleCopyPhone = (phone) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success(`Copied ${phone} to clipboard!`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const splitListValues = (value) => {
    if (!value) return [];
    return value
      .toString()
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const hasOnlinePostingStage = (indent) =>
    !!(
      indent &&
      (indent.planned ||
        indent.actual ||
        indent.onlinePending ||
        indent.onlineDone ||
        indent.siteStatus ||
        indent.socialSiteTypes ||
        indent.onlineAttachment)
    );

  const hasJobAgencyStage = (indent) =>
    !!(
      indent &&
      (indent.agencyPlanned ||
        indent.agencyActual ||
        indent.agencyPending ||
        indent.agencyDone ||
        indent.agencyStatus ||
        indent.jobConsultancyDR ||
        indent.contactPersonDR ||
        indent.contactNumberDR)
    );

  const buildConsultancyContacts = (names, contactPeople, contactNumbers) => {
    return names.reduce((acc, name, index) => {
      acc[name] = {
        contactPerson: contactPeople[index] || "",
        contactNumber: contactNumbers[index] || "",
      };
      return acc;
    }, {});
  };

  const getPostFormData = (indent = null) => {
    const jobConsultancyNames = splitListValues(indent?.jobConsultancyDR);
    const contactPeople = splitListValues(indent?.contactPersonDR);
    const contactNumbers = splitListValues(indent?.contactNumberDR);
    const initialAttachments = indent?.onlineAttachment
      ? String(indent.onlineAttachment).split(",").map((u) => u.trim()).filter(Boolean)
      : [];
    const initialAgencyAttachments = indent?.jobConsultancyAttachment
      ? String(indent.jobConsultancyAttachment).split(",").map((u) => u.trim()).filter(Boolean)
      : [];

    const currentSiteStatus = (indent?.siteStatus || "").trim();
    const resolvedSiteStatus = (currentSiteStatus && currentSiteStatus.toLowerCase() !== "pending") ? currentSiteStatus : "Yes";

    const currentAgencyStatus = (indent?.agencyStatus || "").trim();
    const resolvedAgencyStatus = (currentAgencyStatus && currentAgencyStatus.toLowerCase() !== "pending") ? currentAgencyStatus : "Yes";

    return {
      siteStatus: "",
      socialSiteTypes: splitListValues(indent?.socialSiteTypes),
      onlinePlatformAttachments: initialAttachments,
      onlinePlatformAttachment: indent?.onlineAttachment || "",
      attachedFiles: initialAttachments.map((url, i) => ({
        name: url.startsWith("data:") ? `Attached_Proof_${i + 1}.png` : (url.split("/").pop() || `Proof_${i + 1}`),
        size: null,
        type: url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.startsWith("data:image") ? "image" : "file",
        data: url,
      })),
      selectedFile: null,
      status: resolvedSiteStatus,
      agencyStatus: resolvedAgencyStatus,
      jobConsultancyNames,
      jobConsultancyAttachments: initialAgencyAttachments,
      jobConsultancyAttachment: indent?.jobConsultancyAttachment || "",
      attachedAgencyFiles: initialAgencyAttachments.map((url, i) => ({
        name: url.startsWith("data:") ? `Agency_Proof_${i + 1}.png` : (url.split("/").pop() || `Agency_Proof_${i + 1}`),
        size: null,
        type: url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.startsWith("data:image") ? "image" : "file",
        data: url,
      })),
      consultancyContacts: buildConsultancyContacts(
        jobConsultancyNames,
        contactPeople,
        contactNumbers
      ),
    };
  };

  const resetPostFormData = (indent = null) => {
    setPostFormData(getPostFormData(indent));
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const toastId = toast.loading(`Uploading ${files.length} file(s) to Cloudinary...`);

    try {
      const uploadPromises = files.map(async (file) => {
        const url = await uploadFileToCloudinary(file);
        return {
          name: file.name,
          size: file.size,
          type: file.type.startsWith("image/") ? "image" : "file",
          data: url,
        };
      });

      const uploadedResults = await Promise.all(uploadPromises);
      const validUploads = uploadedResults.filter((f) => Boolean(f.data));

      if (validUploads.length > 0) {
        setPostFormData((prev) => {
          const currentFiles = prev.attachedFiles || [];
          const updatedFiles = [...currentFiles, ...validUploads];
          const updatedAttachments = updatedFiles.map((f) => f.data).filter(Boolean);
          return {
            ...prev,
            attachedFiles: updatedFiles,
            onlinePlatformAttachments: updatedAttachments,
            onlinePlatformAttachment: updatedAttachments.join(", "),
          };
        });
        toast.success(`Successfully uploaded ${validUploads.length} file(s) to Cloudinary!`, { id: toastId });
      } else {
        toast.error("File upload failed. Please try again.", { id: toastId });
      }
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      toast.error(`Upload error: ${error.message || "Failed"}`, { id: toastId });
    } finally {
      setUploadingFiles(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveFile = (index) => {
    setPostFormData((prev) => {
      const updatedFiles = [...(prev.attachedFiles || [])];
      updatedFiles.splice(index, 1);
      const updatedAttachments = updatedFiles.map((f) => f.data);
      return {
        ...prev,
        attachedFiles: updatedFiles,
        onlinePlatformAttachments: updatedAttachments,
        onlinePlatformAttachment: updatedAttachments.join(", "),
      };
    });
  };

  const handleAgencyFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingAgencyFiles(true);
    const toastId = toast.loading(`Uploading ${files.length} agency proof file(s) to Cloudinary...`);

    try {
      const uploadPromises = files.map(async (file) => {
        const url = await uploadFileToCloudinary(file);
        return {
          name: file.name,
          size: file.size,
          type: file.type.startsWith("image/") ? "image" : "file",
          data: url,
        };
      });

      const uploadedResults = await Promise.all(uploadPromises);
      const validUploads = uploadedResults.filter((f) => Boolean(f.data));

      if (validUploads.length > 0) {
        setPostFormData((prev) => {
          const currentFiles = prev.attachedAgencyFiles || [];
          const updatedFiles = [...currentFiles, ...validUploads];
          const updatedAttachments = updatedFiles.map((f) => f.data).filter(Boolean);
          return {
            ...prev,
            attachedAgencyFiles: updatedFiles,
            jobConsultancyAttachments: updatedAttachments,
            jobConsultancyAttachment: updatedAttachments.join(", "),
          };
        });
        toast.success(`Uploaded ${validUploads.length} agency proof file(s) to Cloudinary!`, { id: toastId });
      } else {
        toast.error("File upload failed. Please try again.", { id: toastId });
      }
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      toast.error(`Upload error: ${error.message || "Failed"}`, { id: toastId });
    } finally {
      setUploadingAgencyFiles(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveAgencyFile = (index) => {
    setPostFormData((prev) => {
      const updatedFiles = [...(prev.attachedAgencyFiles || [])];
      updatedFiles.splice(index, 1);
      const updatedAttachments = updatedFiles.map((f) => f.data);
      return {
        ...prev,
        attachedAgencyFiles: updatedFiles,
        jobConsultancyAttachments: updatedAttachments,
        jobConsultancyAttachment: updatedAttachments.join(", "),
      };
    });
  };

  const handleAddAttachmentUrl = () => {
    setPostFormData((prev) => ({
      ...prev,
      onlinePlatformAttachments: [...(prev.onlinePlatformAttachments || []), ""],
    }));
  };

  const handleRemoveAttachmentUrl = (index) => {
    setPostFormData((prev) => {
      const list = [...(prev.onlinePlatformAttachments || [])];
      list.splice(index, 1);
      return {
        ...prev,
        onlinePlatformAttachments: list,
        onlinePlatformAttachment: list.filter(Boolean).join(", "),
      };
    });
  };

  const handleAttachmentUrlChange = (index, value) => {
    setPostFormData((prev) => {
      const list = [...(prev.onlinePlatformAttachments || [])];
      list[index] = value;
      return {
        ...prev,
        onlinePlatformAttachments: list,
        onlinePlatformAttachment: list.filter(Boolean).join(", "),
      };
    });
  };

  const handleConsultancyChange = (option) => {
    setPostFormData((prev) => {
      const isSelected = prev.jobConsultancyNames.includes(option);
      const updatedNames = isSelected
        ? prev.jobConsultancyNames.filter((name) => name !== option)
        : [...prev.jobConsultancyNames, option];

      const updatedContacts = { ...prev.consultancyContacts };
      if (isSelected) {
        delete updatedContacts[option];
      } else {
        updatedContacts[option] = { contactPerson: "", contactNumber: "" };
      }

      return {
        ...prev,
        jobConsultancyNames: updatedNames,
        consultancyContacts: updatedContacts,
      };
    });
  };

  const handleContactInfoChange = (agencyName, field, value) => {
    setPostFormData((prev) => ({
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

  const handlePostSubmit = async (e) => {
    e.preventDefault();

    const shouldSubmitOnlinePosting = hasOnlinePostingStage(selectedIndent);
    const shouldSubmitJobAgency = hasJobAgencyStage(selectedIndent);

    if (!shouldSubmitOnlinePosting && !shouldSubmitJobAgency) {
      toast.error("No pending task found for this indent.");
      return;
    }

    if (
      shouldSubmitOnlinePosting &&
      (!postFormData.socialSiteTypes || postFormData.socialSiteTypes.length === 0)
    ) {
      toast.error("Please select at least one social site type!");
      return;
    }

    if (
      shouldSubmitJobAgency &&
      (!postFormData.jobConsultancyNames || postFormData.jobConsultancyNames.length === 0)
    ) {
      toast.error("Please select at least one Job Consultancy!");
      return;
    }

    try {
      setSubmitting(true);
      const timestamp = getCurrentFormattedTimestamp();
      const updates = { updated_at: new Date().toISOString() };

      // 1. PO-1 Submit
      if (shouldSubmitOnlinePosting) {
        const platformsStr = postFormData.socialSiteTypes.join(", ");
        const attachmentUrl = (postFormData.onlinePlatformAttachments || [])
          .map((u) => u.trim())
          .filter(Boolean)
          .join(", ") || postFormData.onlinePlatformAttachment || "";

        updates.stage1_actual = timestamp;
        updates.stage1_status = postFormData.status;
        updates.online_platform = platformsStr;
        updates.online_platform_attachments = attachmentUrl;

        await recordDataResponse({
          uniqueId: selectedIndent.indentNumber,
          stepCode: "PO-1",
          status: postFormData.status,
          onlinePlatform: platformsStr,
          attachment: attachmentUrl,
          timestamp,
        });
      }

      // 2. PO-2 Submit
      if (shouldSubmitJobAgency) {
        const consultancyNames = postFormData.jobConsultancyNames.join(", ");
        const contactPersons = postFormData.jobConsultancyNames
          .map((name) => postFormData.consultancyContacts[name]?.contactPerson || "")
          .join(", ");
        const contactNumbers = postFormData.jobConsultancyNames
          .map((name) => postFormData.consultancyContacts[name]?.contactNumber || "")
          .join(", ");
        const agencyAttachmentUrl = (postFormData.jobConsultancyAttachments || [])
          .map((u) => u.trim())
          .filter(Boolean)
          .join(", ") || postFormData.jobConsultancyAttachment || "";

        updates.stage2_actual = timestamp;
        updates.stage2_status = postFormData.agencyStatus;
        updates.job_consultancy = consultancyNames;
        updates.contact_person_name = contactPersons;
        updates.contact_no = contactNumbers;

        await recordDataResponse({
          uniqueId: selectedIndent.indentNumber,
          stepCode: "PO-2",
          status: postFormData.agencyStatus,
          jobConsultancy: consultancyNames,
          jobConsultancyAttachment: agencyAttachmentUrl,
          contactPersonName: contactPersons,
          contactNo: contactNumbers,
          timestamp,
        });
      }

      // 3. Update Supabase FMS
      const { error: fmsError } = await supabase
        .from("fms")
        .update(updates)
        .eq("indent_no", selectedIndent.indentNumber);

      if (fmsError) throw fmsError;

      toast.success("Posting and agency data updated successfully!");
      resetPostFormData();
      setShowPostModal(false);
      fetchData(true);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Something went wrong: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostClick = (indent, rowIndex) => {
    setSelectedIndent({ ...indent, rowIndex });
    resetPostFormData(indent);
    setShowPostModal(true);
  };

  const filteredPendingData = useMemo(() => {
    return indentData
      .filter((item) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.post?.toLowerCase().includes(term) ||
          item.indentNumber?.toLowerCase().includes(term) ||
          item.department?.toLowerCase().includes(term) ||
          item.jobConsultancyDR?.toLowerCase().includes(term);

        const matchesDept = !deptFilter || item.department === deptFilter;
        const matchesDesig = !desigFilter || item.post === desigFilter;

        return matchesSearch && matchesDept && matchesDesig;
      })
      .sort((a, b) => {
        const aIndent = String(a.indentNumber || "").trim();
        const bIndent = String(b.indentNumber || "").trim();
        return bIndent.localeCompare(aIndent, undefined, { numeric: true, sensitivity: "base" });
      });
  }, [indentData, searchTerm, deptFilter, desigFilter]);

  const filteredHistoryData = useMemo(() => {
    return historyIndentData
      .filter((item) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.siteStatus?.toLowerCase().includes(term) ||
          item.agencyStatus?.toLowerCase().includes(term) ||
          item.socialSiteTypes?.toLowerCase().includes(term) ||
          item.jobConsultancyDR?.toLowerCase().includes(term) ||
          item.indentNumber?.toLowerCase().includes(term) ||
          item.department?.toLowerCase().includes(term);

        const matchesDept = !deptFilter || item.department === deptFilter;
        const matchesDesig = !desigFilter || item.post === desigFilter;

        return matchesSearch && matchesDept && matchesDesig;
      })
      .sort((a, b) => {
        const aIndent = String(a.indentNumber || "").trim();
        const bIndent = String(b.indentNumber || "").trim();
        return bIndent.localeCompare(aIndent, undefined, { numeric: true, sensitivity: "base" });
      });
  }, [historyIndentData, searchTerm, deptFilter, desigFilter]);

  // Filtered consultancy directory
  const filteredConsultancyDirectory = useMemo(() => {
    if (!consultancySearch) return consultancyDirectory;
    const term = consultancySearch.toLowerCase();
    return consultancyDirectory.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.contacts.some((p) => p.toLowerCase().includes(term)) ||
        c.phones.some((ph) => ph.toLowerCase().includes(term))
    );
  }, [consultancyDirectory, consultancySearch]);

  // Current active data list & pagination calculations
  const activeDataset = activeTab === "pending" ? filteredPendingData : filteredHistoryData;
  const totalRows = activeDataset.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedPendingData = useMemo(() => {
    const start = (validCurrentPage - 1) * rowsPerPage;
    return filteredPendingData.slice(start, start + rowsPerPage);
  }, [filteredPendingData, validCurrentPage, rowsPerPage]);

  const paginatedHistoryData = useMemo(() => {
    const start = (validCurrentPage - 1) * rowsPerPage;
    return filteredHistoryData.slice(start, start + rowsPerPage);
  }, [filteredHistoryData, validCurrentPage, rowsPerPage]);

  const allData = [...indentData, ...historyIndentData];
  const departments = [...new Set(allData.map((item) => item.department))].filter(Boolean).sort();
  const posts = [...new Set(allData.map((item) => item.post))].filter(Boolean).sort();
  const showOnlinePostingSection = hasOnlinePostingStage(selectedIndent);
  const showJobAgencySection = hasJobAgencyStage(selectedIndent);
  const jobConsultancyOptionList = [
    ...new Set([...(consultancyOptions || []), ...(postFormData.jobConsultancyNames || [])]),
  ];

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "done" || s === "yes" || s === "closed") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          {status}
        </span>
      );
    }
    if (s === "open" || s === "pending") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
          {status}
        </span>
      );
    }
    if (s === "hold") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
          {status}
        </span>
      );
    }
    if (s === "no" || s === "rejected") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {status || "—"}
      </span>
    );
  };

  const startRecord = totalRows === 0 ? 0 : (validCurrentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(validCurrentPage * rowsPerPage, totalRows);

  return (
    <div className="space-y-6 page-content p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Online Posting & Consultancy Calling
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Low-egress pipeline, 50 rows pagination, & Data Response synchronization
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Supabase Live
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || tableLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requirements */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-white via-white to-slate-50/80 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(59,130,246,0.12)] transition-all duration-300 group hover:-translate-y-1 before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-blue-500 before:to-indigo-500">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-blue-500/10 blur-xl group-hover:bg-blue-500/20 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Requirements</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{allData.length}</h3>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                All Open & Closed Indents
              </p>
            </div>
            <div className="p-3.5 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300 ring-4 ring-blue-50">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Pending Actions */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-white via-white to-slate-50/80 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(245,158,11,0.12)] transition-all duration-300 group hover:-translate-y-1 before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-amber-400 before:to-orange-500">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Actions</p>
              <h3 className="text-3xl font-black text-amber-600 tracking-tight">{indentData.length}</h3>
              <p className="text-xs text-amber-600/90 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Requires posting or agency calls
              </p>
            </div>
            <div className="p-3.5 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform duration-300 ring-4 ring-amber-50">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Completed / History */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-white via-white to-slate-50/80 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.12)] transition-all duration-300 group hover:-translate-y-1 before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-emerald-400 before:to-teal-500">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed / History</p>
              <h3 className="text-3xl font-black text-emerald-600 tracking-tight">{historyIndentData.length}</h3>
              <p className="text-xs text-emerald-600/90 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Logged in Data Response
              </p>
            </div>
            <div className="p-3.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300 ring-4 ring-emerald-50">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Partner Consultancies (CLICKABLE MODAL TRIGGER) */}
        <div 
          onClick={() => setShowConsultancyModal(true)}
          className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-white via-white to-slate-50/80 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(168,85,247,0.18)] transition-all duration-300 group hover:-translate-y-1.5 cursor-pointer ring-1 ring-purple-100 hover:ring-purple-300 before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-purple-500 before:to-pink-500"
          title="Click to view all partner consultancy details"
        >
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-purple-500/10 blur-xl group-hover:bg-purple-500/25 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Partner Consultancies</p>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700">View</span>
              </div>
              <h3 className="text-3xl font-black text-purple-600 tracking-tight">{consultancyDirectory.length || consultancyOptions.length}</h3>
              <p className="text-xs text-purple-600/90 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Click for Directory & Contacts →
              </p>
            </div>
            <div className="p-3.5 bg-gradient-to-tr from-purple-500 to-fuchsia-600 text-white rounded-2xl shadow-lg shadow-purple-500/25 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ring-4 ring-purple-50">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by post, indent number, department, consultancy..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[170px]">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm transition-all"
              >
                <option value="">🏢 All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[170px]">
              <select
                value={desigFilter}
                onChange={(e) => setDesigFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm transition-all"
              >
                <option value="">💼 All Designations</option>
                {posts.map((post) => (
                  <option key={post} value={post}>
                    {post}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || deptFilter || desigFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDeptFilter("");
                  setDesigFilter("");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card with Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Navigation Tabs & Pagination Rows Select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 px-6 pt-4 gap-3">
          <nav className="flex space-x-3">
            <button
              onClick={() => setActiveTab("pending")}
              className={`pb-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Clock className="w-4 h-4" />
              Pending Tasks
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === "pending"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {filteredPendingData.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`pb-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "history"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Posting History (Data Response)
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === "history"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {filteredHistoryData.length}
              </span>
            </button>
          </nav>

          {/* Rows per page selector */}
          <div className="flex items-center gap-2 pb-3 sm:pb-0">
            <span className="text-xs font-medium text-slate-500">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-0">
          {activeTab === "pending" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/80">
                <thead className="bg-slate-50/90 text-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Pending Stage
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Indent No
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Indenter Name
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Prefer
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider min-w-[160px]">
                      Experience
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      No. of Post
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Completion Date
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Salary
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Office Timing
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Type Of Week
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Residence
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="15" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm font-semibold text-slate-600">Loading pending requirements...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedPendingData.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                            <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <h4 className="text-base font-bold text-slate-800">All Caught Up!</h4>
                          <p className="text-xs text-slate-500 max-w-sm">
                            No pending online postings or consultancy calls awaiting action.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPendingData.map((item, index) => {
                      const stages = [];
                      if (item.onlinePending) stages.push("Online Posting (PO-1)");
                      if (item.agencyPending) stages.push("Job Agency Calling (PO-2)");

                      return (
                        <tr key={index} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <button
                              onClick={() => handlePostClick(item, index)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Update Task
                            </button>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {stages.map((stg, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80"
                                >
                                  <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                  {stg}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-mono border border-slate-200">
                              {item.indentNumber}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs font-medium text-slate-800">
                            {item.indenterName}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-900">
                            {item.post}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            {item.gender}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {item.department}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            {item.prefer || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 max-w-[180px] break-words">
                            {item.experience || "—"}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-slate-800">
                            {item.noOfPost}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            {item.completionDate || "—"}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-emerald-700">
                            {item.salary}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            {item.officeTiming}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            {item.typeOfWeek}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            {item.residence}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "history" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/80">
                <thead className="bg-slate-50/90 text-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Indent No
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Site Status (PO-1)
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Online Platforms
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Platform Proof
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Agency Status (PO-2)
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider min-w-[200px]">
                      Job Consultancies
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Agency Proof
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider min-w-[160px]">
                      Contact Person
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider min-w-[160px]">
                      Contact Number
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Indenter Name
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Prefer
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider min-w-[160px]">
                      Experience
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      No. of Post
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Completion Date
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Salary
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Office Timing
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Type Of Week
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Residence
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="20" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm font-semibold text-slate-600">Looking up Data Response history...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedHistoryData.length === 0 ? (
                    <tr>
                      <td colSpan="20" className="px-6 py-16 text-center">
                        <p className="text-sm font-medium text-slate-500">No records found matching your filters.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedHistoryData.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-mono border border-slate-200">
                            {item.indentNumber}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-900">
                          {item.post}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {item.department}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {getStatusBadge(item.siteStatus)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {item.socialSiteTypes ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {item.socialSiteTypes.split(",").map((s, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                  {s.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {item.onlineAttachment ? (
                            <div className="flex flex-wrap items-center gap-1.5 max-w-[200px]">
                              {item.onlineAttachment.split(",").map((url, uIdx) => {
                                const trimmedUrl = url.trim();
                                if (!trimmedUrl) return null;
                                const isMultiple = item.onlineAttachment.split(",").filter((u) => u.trim()).length > 1;
                                return (
                                  <a
                                    key={uIdx}
                                    href={trimmedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-2xs"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {isMultiple ? `Proof ${uIdx + 1}` : "View Proof"}
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {getStatusBadge(item.agencyStatus)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700">
                          {item.jobConsultancyDR ? (
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {item.jobConsultancyDR.split(",").map((c, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                >
                                  {c.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {item.jobConsultancyAttachment ? (
                            <div className="flex flex-wrap items-center gap-1.5 max-w-[200px]">
                              {item.jobConsultancyAttachment.split(",").map((url, uIdx) => {
                                const trimmedUrl = url.trim();
                                if (!trimmedUrl) return null;
                                const isMultiple = item.jobConsultancyAttachment.split(",").filter((u) => u.trim()).length > 1;
                                return (
                                  <a
                                    key={uIdx}
                                    href={trimmedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all shadow-2xs"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {isMultiple ? `Proof ${uIdx + 1}` : "View Proof"}
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 max-w-[180px] break-words">
                          {item.contactPersonDR || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-slate-600 max-w-[180px] break-words">
                          {item.contactNumberDR || "—"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-medium text-slate-800">
                          {item.indenterName}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {item.gender}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {item.prefer || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 max-w-[180px] break-words">
                          {item.experience || "—"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-slate-800">
                          {item.noOfPost}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {item.completionDate || "—"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-emerald-700">
                          {item.salary}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {item.officeTiming}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {item.typeOfWeek}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {item.residence}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modern Pagination Bar (50 rows per page default) */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
          <div className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-800">{startRecord}</span> to{" "}
            <span className="font-bold text-slate-800">{endRecord}</span> of{" "}
            <span className="font-bold text-slate-800">{totalRows}</span> entries
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                  .map((page, idx, arr) => {
                    const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-xs text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            validCurrentPage === page
                              ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PARTNER CONSULTANCIES DIRECTORY MODAL */}
      {showConsultancyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50/80 via-white to-pink-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-pink-600 text-white rounded-xl shadow-md shadow-purple-200">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    Partner Consultancies & Contact Directory
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      {filteredConsultancyDirectory.length} Agencies
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Verified recruitment agencies, contact persons, phone numbers, & assigned indents
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConsultancyModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search consultancy name, contact person, or phone number..."
                  value={consultancySearch}
                  onChange={(e) => setConsultancySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-xs"
                />
                {consultancySearch && (
                  <button
                    onClick={() => setConsultancySearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Directory List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30">
              {filteredConsultancyDirectory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-medium">
                  No consultancies found matching "{consultancySearch}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredConsultancyDirectory.map((agency, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-purple-300 hover:shadow-md transition-all space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                            {agency.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                              {agency.name}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {agency.totalIndents > 0
                                ? `Mapped with ${agency.totalIndents} Indent(s)`
                                : "Registered Partner Agency"}
                            </p>
                          </div>
                        </div>

                        {agency.totalIndents > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                            {agency.totalIndents} Indents
                          </span>
                        )}
                      </div>

                      {/* Contacts & Phone Numbers */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        {/* Contact Persons */}
                        {agency.contacts.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              Contact:
                            </span>
                            {agency.contacts.map((contact, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700"
                              >
                                {contact}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">No contact person logged</div>
                        )}

                        {/* Phone Numbers */}
                        {agency.phones.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              Phone:
                            </span>
                            {agency.phones.map((phone, i) => (
                              <div
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 group/btn"
                              >
                                <span>{phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPhone(phone)}
                                  className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded cursor-pointer"
                                  title="Copy Phone Number"
                                >
                                  {copiedPhone === phone ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-emerald-500 hover:scale-110 transition-transform" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">No phone numbers logged</div>
                        )}
                      </div>

                      {agency.lastUsed && (
                        <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                          <span>Last active: {agency.lastUsed}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
              <span className="text-xs text-slate-500 font-medium">
                Total Registered: <span className="font-bold text-slate-800">{consultancyDirectory.length} Consultancies</span>
              </span>
              <button
                type="button"
                onClick={() => setShowConsultancyModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Update Modal */}
      {showPostModal && selectedIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Update Posting & Agency Calling
                  </h3>
                  <p className="text-xs text-slate-500">
                    Indent: <span className="font-mono font-bold text-blue-600">{selectedIndent.indentNumber}</span> ({selectedIndent.post} - {selectedIndent.department})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPostModal(false);
                  resetPostFormData();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePostSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. ONLINE POSTING SECTION */}
                {showOnlinePostingSection && (
                  <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                        <Globe className="w-4 h-4 text-blue-600" />
                        Stage 1: Online Job Posting (PO-1)
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                        Planned: {selectedIndent.planned || "N/A"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Posting Status *
                        </label>
                        <select
                          value={postFormData.status}
                          onChange={(e) =>
                            setPostFormData((prev) => ({
                              ...prev,
                              status: e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                          required
                        >
                          <option value="Yes">Yes (Completed)</option>
                          <option value="No">No</option>
                          <option value="Hold">Hold</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                            <span>Attachment Proof</span>
                            {postFormData.attachedFiles?.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                                {postFormData.attachedFiles.length}
                              </span>
                            )}
                          </label>
                          {postFormData.attachedFiles?.length > 0 && (
                            <label className={`inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-lg text-[11px] font-bold transition-all shadow-2xs ${uploadingFiles ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                              <Plus className="w-3 h-3" />
                              {uploadingFiles ? "Uploading..." : "Add Files"}
                              <input
                                type="file"
                                accept="image/*,.pdf,.doc,.docx"
                                multiple
                                disabled={uploadingFiles}
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* File Upload Dropzone / List */}
                        {uploadingFiles ? (
                          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-400 bg-blue-50/60 rounded-xl text-center">
                            <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                            <span className="text-xs font-bold text-blue-900">Uploading to Cloudinary...</span>
                            <span className="text-[10px] text-blue-600/80 mt-0.5">Please wait while secure URLs are generated</span>
                          </div>
                        ) : (!postFormData.attachedFiles || postFormData.attachedFiles.length === 0) ? (
                          <label
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingFile(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              setIsDraggingFile(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDraggingFile(false);
                              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                handleFileUpload({ target: { files: e.dataTransfer.files } });
                              }
                            }}
                            className={`flex flex-col items-center justify-center p-3.5 border-2 border-dashed rounded-xl transition-all cursor-pointer text-center group ${
                              isDraggingFile
                                ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 scale-[0.99]"
                                : "border-slate-300 hover:border-blue-400 bg-gradient-to-b from-white to-slate-50 hover:from-blue-50/20 hover:to-indigo-50/20 shadow-xs"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-xl bg-blue-100/70 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 mb-1 transition-transform group-hover:scale-110 shadow-2xs">
                              <Upload className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-xs font-bold text-slate-800">
                              Upload Proof Images / Files
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Files will upload to Cloudinary directly (PNG, JPG, PDF)
                            </span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              multiple
                              disabled={uploadingFiles}
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {postFormData.attachedFiles.map((file, idx) => (
                              <div
                                key={idx}
                                className="group flex items-center justify-between gap-2 p-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs transition-all shadow-2xs"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {file.type === "image" ? (
                                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center">
                                      {file.data?.startsWith("http") || file.data?.startsWith("data:") ? (
                                        <img src={file.data} alt="thumb" className="w-full h-full object-cover" />
                                      ) : (
                                        <Image className="w-3.5 h-3.5 text-blue-600" />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                    </div>
                                  )}
                                  <div className="truncate text-left">
                                    <div className="truncate text-slate-800 font-semibold text-[11px]">
                                      {file.name}
                                    </div>
                                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      Cloudinary Ready
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                  title="Remove File"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        Select Online Platforms *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-3 bg-white rounded-xl border border-slate-200 shadow-inner">
                        {socialSiteOptions.map((option) => {
                          const isChecked = postFormData.socialSiteTypes.includes(option);
                          return (
                            <label
                              key={option}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                                isChecked
                                  ? "border-blue-500 bg-blue-50/70 text-blue-900 font-semibold shadow-xs"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                value={option}
                                checked={isChecked}
                                onChange={(e) => {
                                  const { value, checked } = e.target;
                                  setPostFormData((prev) => {
                                    const current = prev.socialSiteTypes || [];
                                    return {
                                      ...prev,
                                      socialSiteTypes: checked
                                        ? [...current, value]
                                        : current.filter((t) => t !== value),
                                    };
                                  });
                                }}
                                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                              />
                              <span className="truncate">{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. JOB AGENCY SECTION */}
                {showJobAgencySection && (
                  <div className="p-5 rounded-2xl border border-purple-100 bg-purple-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                        <PhoneCall className="w-4 h-4 text-purple-600" />
                        Stage 2: Job Agency Calling (PO-2)
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">
                        Planned: {selectedIndent?.agencyPlanned || addOneDayToTimestamp(selectedIndent?.timestamp) || "N/A"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Agency Calling Status *
                      </label>
                      <select
                        value={postFormData.agencyStatus}
                        onChange={(e) =>
                          setPostFormData((prev) => ({
                            ...prev,
                            agencyStatus: e.target.value,
                          }))
                        }
                        className="w-full sm:w-1/2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-sm"
                        required
                      >
                        <option value="Yes">Yes (Calls Completed)</option>
                        <option value="No">No</option>
                        <option value="Hold">Hold</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        Select Partner Consultancies & Contacts *
                      </label>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto p-3 bg-white rounded-xl border border-slate-200 shadow-inner">
                        {jobConsultancyOptionList.map((option) => {
                          const isSelected = postFormData.jobConsultancyNames.includes(option);
                          return (
                            <div
                              key={option}
                              className={`p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? "border-purple-300 bg-purple-50/40 shadow-xs"
                                  : "border-slate-100 hover:bg-slate-50/60"
                              }`}
                            >
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleConsultancyChange(option)}
                                  className="h-4 w-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                                />
                                <span>{option}</span>
                              </label>

                              {isSelected && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5 pl-6">
                                  <input
                                    type="text"
                                    placeholder="Contact Person Name"
                                    value={postFormData.consultancyContacts[option]?.contactPerson || ""}
                                    onChange={(e) =>
                                      handleContactInfoChange(option, "contactPerson", e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Contact Number"
                                    value={postFormData.consultancyContacts[option]?.contactNumber || ""}
                                    onChange={(e) =>
                                      handleContactInfoChange(option, "contactNumber", e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Job Agency Attachment Proof (Cloudinary) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                          <span>Job Consultancy Attachment Proof</span>
                          {postFormData.attachedAgencyFiles?.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700">
                              {postFormData.attachedAgencyFiles.length}
                            </span>
                          )}
                        </label>
                        {postFormData.attachedAgencyFiles?.length > 0 && (
                          <label className={`inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 rounded-lg text-[11px] font-bold transition-all shadow-2xs ${uploadingAgencyFiles ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <Plus className="w-3 h-3" />
                            {uploadingAgencyFiles ? "Uploading..." : "Add Files"}
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              multiple
                              disabled={uploadingAgencyFiles}
                              onChange={handleAgencyFileUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* File Upload Dropzone / List */}
                      {uploadingAgencyFiles ? (
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-400 bg-purple-50/60 rounded-xl text-center">
                          <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-2" />
                          <span className="text-xs font-bold text-purple-900">Uploading to Cloudinary...</span>
                          <span className="text-[10px] text-purple-600/80 mt-0.5">Please wait while secure URLs are generated</span>
                        </div>
                      ) : (!postFormData.attachedAgencyFiles || postFormData.attachedAgencyFiles.length === 0) ? (
                        <label
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingAgencyFile(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingAgencyFile(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingAgencyFile(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              handleAgencyFileUpload({ target: { files: e.dataTransfer.files } });
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-3.5 border-2 border-dashed rounded-xl transition-all cursor-pointer text-center group ${
                            isDraggingAgencyFile
                              ? "border-purple-500 bg-purple-50/70 ring-2 ring-purple-500/20 scale-[0.99]"
                              : "border-slate-300 hover:border-purple-400 bg-gradient-to-b from-white to-slate-50 hover:from-purple-50/20 hover:to-indigo-50/20 shadow-xs"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-purple-100/70 group-hover:bg-purple-100 flex items-center justify-center text-purple-600 mb-1 transition-transform group-hover:scale-110 shadow-2xs">
                            <Upload className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            Upload Consultancy Proof Images / Files
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Files upload directly to Cloudinary (PNG, JPG, PDF)
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            multiple
                            disabled={uploadingAgencyFiles}
                            onChange={handleAgencyFileUpload}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {postFormData.attachedAgencyFiles.map((file, idx) => (
                            <div
                              key={idx}
                              className="group flex items-center justify-between gap-2 p-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs transition-all shadow-2xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                {file.type === "image" ? (
                                  <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center">
                                    {file.data?.startsWith("http") || file.data?.startsWith("data:") ? (
                                      <img src={file.data} alt="thumb" className="w-full h-full object-cover" />
                                    ) : (
                                      <Image className="w-3.5 h-3.5 text-purple-600" />
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                                  </div>
                                )}
                                <div className="truncate text-left">
                                  <div className="truncate text-slate-800 font-semibold text-[11px]">
                                    {file.name}
                                  </div>
                                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Cloudinary Ready
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAgencyFile(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove File"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => {
                    setShowPostModal(false);
                    resetPostFormData();
                  }}
                  disabled={submitting || uploadingFiles || uploadingAgencyFiles}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFiles || uploadingAgencyFiles}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {uploadingFiles || uploadingAgencyFiles ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading Files...
                    </>
                  ) : submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving to Supabase...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Save & Sync Data Response
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

export default OnlinePosting;
