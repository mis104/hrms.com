import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
  Filter, Search, Clock, CheckCircle, CheckCircle2, ImageIcon, X, User, 
  Briefcase, MapPin, Calendar, FileText, Phone, Mail, Download, RefreshCw, 
  Users, UserCheck, LayoutList, LayoutGrid, ChevronRight, AlertCircle, Sparkles, 
  Building2, Edit, Eye, CreditCard, Shield, ExternalLink, Laptop, Smartphone, 
  AtSign, Copy, Check, Award, ChevronDown
} from "lucide-react";

import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { supabase } from "../services/supabaseClient";

const Employee = () => {
  const [activeTab, setActiveTab] = useState("joining");
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    dateOfLeaving: "",
    mobileNumber: "",
    reasonOfLeaving: "",
    salary: ""
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [joiningData, setJoiningData] = useState([]);
  const [sheetHeaders, setSheetHeaders] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    candidateName: "",
    fatherName: "",
    dateOfJoining: "",
    joiningPlace: "",
    designation: "",
    salary: "",
    currentAddress: "",
    addressAsPerAadhar: "",
    dobAsPerAadhar: "",
    gender: "",
    mobileNo: "",
    familyMobileNo: "",
    twoReferenceNo: "",
    pastPfId: "",
    currentBankAcNo: "",
    ifscCode: "",
    branchName: "",
    personalEmail: "",
    esicNo: "",
    highestQualification: "",
    aadharCardNo: "",
    department: "",

    aadharPhotoFile: null,
    panCardFile: null,
    candidatePhotoFile: null,
    bankPassbookPhotoFile: null,
    qualificationPhotoFile: null,
    salarySlipFile: null,
    resumeUploadFile: null,

    aadharPhotoUrl: "",
    panCardUrl: "",
    candidatePhotoUrl: "",
    bankPassbookPhotoUrl: "",
    qualificationPhotoUrl: "",
    salarySlipUrl: "",
    resumeUploadUrl: "",
  });
  const [updating, setUpdating] = useState(false);
  const [leavingData, setLeavingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [joiningPlaceFilter, setJoiningPlaceFilter] = useState("");
  const [joiningPlaces, setJoiningPlaces] = useState([]);

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

  // Helper to convert Google Drive link or Cloudinary to direct high-res image link
  const getDriveImageUrl = (url, size = 200) => {
    if (!url) return "";
    const str = url.toString().trim();
    if (!str) return "";

    if (str.includes("cloudinary.com")) {
      return size ? str.replace("/upload/", `/upload/w_${size},q_auto,f_auto/`) : str;
    }

    const match = str.match(/\/d\/([a-zA-Z0-9_-]+)/) || str.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=w${size}`;
    }
    return str;
  };

  const formatDOB = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // Fetch global data from store (still needed only for refreshing data after submit)


  // Helper to normalize IDs for consistent comparison
  // Removes all non-alphanumeric characters and lowercases
  const normalizeId = (id) => id ? id.toString().toLowerCase().replace(/[^a-z0-9]/g, "") : "";

  const parseJsonSafely = (text, fallback = { data: [] }) => {
    if (!text || typeof text !== "string") return fallback;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      }
      const arrStart = text.indexOf("[");
      const arrEnd = text.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
        return JSON.parse(text.slice(arrStart, arrEnd + 1));
      }
      return JSON.parse(text);
    } catch (e) {
      return fallback;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);
    try {
      // Fetch joining_fms and leaving_fms directly from Supabase
      const [sbJoiningRes, sbLeavingRes] = await Promise.all([
        supabase.from("joining_fms").select("*").order("id", { ascending: true }),
        supabase.from("leaving_fms").select("*").order("id", { ascending: true })
      ]);

      if (sbJoiningRes.error) throw sbJoiningRes.error;
      if (sbLeavingRes.error) throw sbLeavingRes.error;

      const rawJoining = sbJoiningRes.data || [];
      const rawLeaving = sbLeavingRes.data || [];

      // Set standard headers for excel export fallback
      setSheetHeaders([
        "Employee Code", "Candidate Name", "Department", "Designation",
        "Date of Joining", "Joining Place", "Finalized Salary",
        "Contact No", "Email Id", "Father Name", "Status"
      ]);

      // --- Process FMS / Leaving Data ---
      const jMap = new Map();
      rawJoining.forEach(jRow => {
        const c = normalizeId(jRow.employee_code);
        const ind = normalizeId(jRow.indent_no);
        const nm = normalizeId(jRow.candidate_name);
        if (c) jMap.set(c, jRow);
        if (ind) jMap.set(ind, jRow);
        if (nm) jMap.set(nm, jRow);
      });

      const seenLeavingKeys = new Set();
      const processedLeaving = rawLeaving.map(row => {
        const lEmpId = normalizeId(row.employee_id);
        const lName = normalizeId(row.candidate_name);
        const jRow = jMap.get(lEmpId) || jMap.get(lName) ||
          rawJoining.find(jr => lEmpId && normalizeId(jr.indent_no) && lEmpId.startsWith(normalizeId(jr.indent_no))) || {};

        return {
          dbId: row.id,
          originalRow: { ...jRow, ...row },
          employeeId: row.employee_id || jRow.employee_code || jRow.indent_no || "",
          name: row.candidate_name || jRow.candidate_name || "",
          candidateName: row.candidate_name || jRow.candidate_name || "",
          designation: row.designation || jRow.designation || "",
          mobileNo: row.mobile_no || jRow.mobile_no || "",
          lastWorkingDay: row.last_working_day || "",
          dateOfLeaving: row.last_working_day || "",
          reasonOfLeaving: row.reason_for_resignation || "",
          salary: row.salary || jRow.finalized_salary || jRow.salary || "",
          familyMobileNo: row.family_mobile_no || jRow.family_mobile_no || "",
          relationshipWithFamily: row.relationship_with_family_person || jRow.relationship_with_family_person || "",
          pastPfId: row.past_pf_id_no || jRow.past_pf_id_no || "",
          currentBankAcNo: row.current_bank_ac_no || jRow.current_bank_ac_no || "",
          ifscCode: row.ifsc_code || jRow.ifsc_code || "",
          branchName: row.branch_name || jRow.branch_name || "",
          bankPassbookPhoto: row.photo_of_front_bank_passbook || jRow.photo_of_front_bank_passbook || "",
          personalEmail: row.personal_email_id || jRow.personal_email_id || "",
          emailId: row.personal_email_id || jRow.personal_email_id || "",
          esicNo: row.esic_no || jRow.esic_no || "",
          highestQualification: row.highest_qualification || jRow.highest_qualification || "",
          aadharCardNo: row.aadhar_card_no || jRow.aadhar_card_no || "",
          qualificationPhoto: row.qualification_photo || jRow.qualification_photo || "",
          salarySlip: row.salary_slip || jRow.salary_slip || "",
          resumeUpload: row.resume_cv_upload || jRow.resume_cv_upload || "",
          dateOfJoining: jRow.date_of_joining || "",
          joiningPlace: jRow.joining_place || "",
          department: jRow.department || jRow.joining_place || "",
          fatherName: jRow.father_name || "",
          candidatePhoto: jRow.candidate_photo || "",
          aadharPhoto: jRow.aadhar_frontside_photo || "",
          panCard: jRow.pan_card || "",
          isArchived: true
        };
      }).filter(item => {
        const id = normalizeId(item.employeeId);
        const uniqueKey = id || (item.name + "-" + item.mobileNo).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (uniqueKey) {
          if (seenLeavingKeys.has(uniqueKey)) return false;
          seenLeavingKeys.add(uniqueKey);
        }
        return true;
      });

      setLeavingData(processedLeaving);

      // Helper to detect if an employee has left
      const isEmployeeLeaving = (jRow) => {
        if ((jRow.leave || "").trim().toLowerCase() === "yes") return true;

        const normCode = normalizeId(jRow.employee_code);
        const normIndent = normalizeId(jRow.indent_no);
        const normName = normalizeId(jRow.candidate_name);

        for (const lRow of rawLeaving) {
          const lEmpId = normalizeId(lRow.employee_id);
          const lName = normalizeId(lRow.candidate_name);

          // 1. Direct code or indent match
          if (normCode && normCode === lEmpId) return true;
          if (normIndent && normIndent === lEmpId) return true;

          // 2. Exact or substring name match (e.g. Soni & Soni Singh, Topeshwar & Topeshwar Das Panika)
          if (normName && lName) {
            if (normName === lName) return true;
            if ((normName.includes(lName) || lName.includes(normName)) && 
                (lEmpId.startsWith(normIndent) || normIndent.length === 0)) {
              return true;
            }
          }

          // 3. Indent prefix match if name starts with same 4 chars
          if (normIndent && lEmpId.startsWith(normIndent)) {
            const firstWordJ = normName.slice(0, 4);
            const firstWordL = lName.slice(0, 4);
            if (firstWordJ && firstWordL && firstWordJ === firstWordL) return true;
          }
        }
        return false;
      };

      // --- Process Joining Data ---
      const seenJoiningKeys = new Set();
      const processedJoining = rawJoining.map((row, idx) => ({
        dbId: row.id,
        rowIndex: idx + 1,
        employeeId: row.employee_code || row.indent_no || "",
        indentNo: row.indent_no || "",
        candidateName: row.candidate_name || row.name_as_per_aadhar || "",
        fatherName: row.father_name || "",
        department: row.department || row.joining_place || row.lookup_designation || "",
        designation: row.designation || row.lookup_designation || "",
        mobileNo: row.mobile_no || "",
        emailId: row.personal_email_id || "",
        personalEmail: row.personal_email_id || "",
        dateOfJoining: row.date_of_joining || "",
        joiningPlace: row.joining_place || "",
        salary: row.finalized_salary || row.salary || "",
        currentAddress: row.current_address || "",
        addressAsPerAadhar: row.address_as_per_aadhar_card || "",
        dobAsPerAadhar: row.dob_as_per_aadhar || "",
        gender: row.gender || "",
        familyMobileNo: row.family_mobile_no || "",
        relationshipWithFamily: row.relationship_with_family_person || "",
        pastPfId: row.past_pf_id_no || "",
        currentBankAcNo: row.current_bank_ac_no || "",
        ifscCode: row.ifsc_code || "",
        branchName: row.branch_name || "",
        esicNo: row.esic_no || "",
        highestQualification: row.highest_qualification || "",
        aadharCardNo: row.aadhar_card_no || "",
        aadharPhoto: row.aadhar_frontside_photo || "",
        panCard: row.pan_card || "",
        candidatePhoto: row.candidate_photo || "",
        bankPassbookPhoto: row.photo_of_front_bank_passbook || "",
        qualificationPhoto: row.qualification_photo || "",
        salarySlip: row.salary_slip || "",
        resumeUpload: row.resume_cv_upload || "",
        laptopBrandModel: row.laptop_brand_model || "",
        assets: row.assets || "",
        mobileBrandSim: row.mobile_brand_sim || "",
        gmailId: row.gmail_id || "",
        status: row.update_link || "",
        leave: row.leave || "",
        colBM: "",
        originalRow: row,
      })).filter(item => {
        // Filter 1: Status is DONE (Case Insensitive)
        const isDone = item.status && item.status.toString().trim().toUpperCase() === "DONE";
        if (!isDone) return false;

        // Filter 2: Must NOT have left
        if (isEmployeeLeaving(item.originalRow)) return false;

        // Deduplication: prevent showing the same employee multiple times (e.g. Vijay Driver, Upendra, Lakeshwar)
        const normName = normalizeId(item.candidateName);
        const normIndent = normalizeId(item.indentNo);
        const normMobile = normalizeId(item.mobileNo);
        const uniqueKey = normName + "-" + (normIndent || normMobile);

        if (uniqueKey) {
          if (seenJoiningKeys.has(uniqueKey)) return false;
          seenJoiningKeys.add(uniqueKey);
        }

        return true;
      });

      setJoiningData(processedJoining);

      // Extract unique joining places for the filter dropdown
      const placesMap = new Map();
      processedJoining.forEach(item => {
        const place = item.joiningPlace && item.joiningPlace.toString().trim();
        if (place) {
          const lowerPlace = place.toLowerCase();
          if (!placesMap.has(lowerPlace)) {
            placesMap.set(lowerPlace, place);
          }
        }
      });
      const places = Array.from(placesMap.values()).sort();
      setJoiningPlaces(places);

    } catch (err) {
      console.error("Fetch Data Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredJoiningData = joiningData.filter((item) => {
    const matchesSearch =
      item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fatherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.emailId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mobileNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJoiningPlace = !joiningPlaceFilter ||
      (item.joiningPlace && item.joiningPlace.toString().trim().toLowerCase() === joiningPlaceFilter.toString().trim().toLowerCase());

    return matchesSearch && matchesJoiningPlace;
  });

  const filteredLeavingData = leavingData.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleLeaveClick = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
    setFormData({
      dateOfLeaving: "",
      mobileNumber: item.mobileNo || "",
      reasonOfLeaving: "",
      salary: ""
    });
    setShowModal(true);
  };



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const convertToInputDate = (dateVal) => {
    if (!dateVal) return "";
    const date = new Date(dateVal);
    if (!isNaN(date.getTime())) {
      try {
        return date.toISOString().split('T')[0];
      } catch (e) {
        // Fallback below
      }
    }
    // Try dd/mm/yyyy format
    const parts = dateVal.toString().trim().split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      if (year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }
    return "";
  };

  const uploadFile = async (file, folderId) => {
    if (!file) return "";
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result;
          const targetUrl = import.meta.env.VITE_GOOGLE_SHEET_URL || import.meta.env.VITE_JOINING_SHEET_URL;
          const response = await fetch(targetUrl, {
            method: "POST",
            body: new URLSearchParams({
              action: "uploadFile",
              base64Data: base64Data,
              fileName: file.name,
              mimeType: file.type,
              folderId: '1DL_Xf0_9fszToIDlZ3MMsiebDSK4OeIu2FOa1kvA8vPZCGoVKN6Johxc95FLVqP9Qp7cBp9v',
            }),
          });
          const result = await response.json();
          if (result.success) {
            resolve(result.fileUrl);
          } else {
            console.error("Upload failed:", result.error);
            resolve("");
          }
        } catch (error) {
          console.error("Upload error:", error);
          resolve("");
        }
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleViewProfile = (item) => {
    if (!item) return;
    const row = item.originalRow || [];
    const getVal = (names, defaultIdx) => {
      const idx = sheetHeaders.findIndex(
        (h) => h && names.map(n => n.toLowerCase()).includes(h.toString().trim().toLowerCase())
      );
      const useIdx = idx !== -1 ? idx : defaultIdx;
      return row[useIdx] || "";
    };

    setSelectedProfile({
      ...item,
      candidateName: item.candidateName || item.name || getVal(["Candidate Name", "Name as per Aadhar", "Name"], 10),
      fatherName: item.fatherName || getVal(["Father Name", "Father's Name"], 11),
      dateOfJoining: item.dateOfJoining || getVal(["Date of Joining"], 12),
      joiningPlace: item.joiningPlace || getVal(["Joining Place"], 13),
      designation: item.designation || getVal(["Designation"], 14),
      salary: item.salary || getVal(["Salary", "Finalized Salary"], 15),
      currentAddress: item.currentAddress || getVal(["Current Address"], 19),
      addressAsPerAadhar: item.addressAsPerAadhar || getVal(["Address as per Aadhar", "Address As per Aadhar Card"], 20),
      dobAsPerAadhar: item.dobAsPerAadhar || getVal(["DOB as per Aadhar", "Date of Birth As Per Aadhar Card", "Date of Birth"], 21),
      gender: item.gender || getVal(["Gender"], 22),
      mobileNo: item.mobileNo || getVal(["Contact No", "Mobile No", "Mobile Number"], 23),
      familyMobileNo: item.familyMobileNo || getVal(["Family Mobile No.", "Family Mobile No"], 24),
      relationshipWithFamily: item.relationshipWithFamily || getVal(["Relationship with Family Person"], 25),
      pastPfId: item.pastPfId || getVal(["Past Pf Id No. (If Any)", "Past PF ID", "PF ID"], 26),
      currentBankAcNo: item.currentBankAcNo || getVal(["Current Bank AC No.", "Current Bank AC No", "Bank Account No"], 27),
      ifscCode: item.ifscCode || getVal(["IFSC Code"], 28),
      branchName: item.branchName || getVal(["Branch Name"], 29),
      personalEmail: item.emailId || item.personalEmail || getVal(["Personal Email-Id", "Email Id", "Personal Email", "Email"], 31),
      esicNo: item.esicNo || getVal(["ESIC No (IF Any)", "ESIC No"], 32),
      highestQualification: item.highestQualification || getVal(["Highest Qualification"], 33),
      aadharCardNo: item.aadharCardNo || getVal(["Aadhar Card No", "Aadhar No"], 34),
      department: item.department || getVal(["Department"], 2),
      aadharPhoto: item.aadharPhoto || getVal(["Aadhar Frontside photo", "Aadhar Front Photo", "Aadhar Photo"], 16),
      panCard: item.panCard || getVal(["Pan Card", "PAN Card"], 17),
      candidatePhoto: item.candidatePhoto || getVal(["Candidate Photo", "Profile Photo"], 18),
      bankPassbookPhoto: item.bankPassbookPhoto || getVal(["Photo Of Front Bank Passbook", "Bank Passbook Photo"], 30),
      qualificationPhoto: item.qualificationPhoto || getVal(["Qualication Photo", "Highest Qualification Photo", "Qualification Photo"], 35),
      salarySlip: item.salarySlip || getVal(["Salary Slip"], 36),
      resumeUpload: item.resumeUpload || getVal(["Resume/Cv Upload", "Resume Upload", "Resume"], 37),
      laptopBrandModel: item.laptop_brand_model || item.laptopBrandModel || getVal(["LAPTOP BRAND NAME -MODEL NAME", "Laptop Brand Model", "Laptop"], 41),
      assets: item.assets || getVal(["ASSESTS", "Assets"], 42),
      mobileBrandSim: item.mobile_brand_sim || item.mobileBrandSim || getVal(["MOBILE BRAND NAME-SIM NUMBER", "Mobile Brand SIM", "Mobile SIM"], 43),
      gmailId: item.gmail_id || item.gmailId || getVal(["GMAIL ID", "Gmail ID", "Official Email"], 44),
      indentNo: item.indent_no || item.indentNo || getVal(["INDENT NO", "Indent No"], 46),
    });
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedProfile(null);
  };

  const openImagePreview = (url, title) => {
    setImagePreview({ url, title });
  };

  const handleDownloadFile = async (e, url, defaultName) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!url) return;
    try {
      const downloadUrl = getDriveImageUrl ? getDriveImageUrl(url, 2000) : url;
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = defaultName ? `${defaultName}.jpg` : "document.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch (err) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = defaultName || "document";
      a.click();
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    const row = item.originalRow || {};

    setEditFormData({
      candidateName: item.candidateName || row.candidate_name || "",
      fatherName: item.fatherName || row.father_name || "",
      dateOfJoining: convertToInputDate(item.dateOfJoining || row.date_of_joining || ""),
      joiningPlace: item.joiningPlace || row.joining_place || "",
      designation: item.designation || row.designation || row.lookup_designation || "",
      salary: item.salary || row.finalized_salary || row.salary || "",
      currentAddress: item.currentAddress || row.current_address || "",
      addressAsPerAadhar: item.addressAsPerAadhar || row.address_as_per_aadhar_card || "",
      dobAsPerAadhar: convertToInputDate(item.dobAsPerAadhar || row.dob_as_per_aadhar || ""),
      gender: item.gender || row.gender || "",
      mobileNo: item.mobileNo || row.mobile_no || "",
      familyMobileNo: item.familyMobileNo || row.family_mobile_no || "",
      twoReferenceNo: row.two_reference_no || "",
      pastPfId: item.pastPfId || row.past_pf_id_no || "",
      currentBankAcNo: item.currentBankAcNo || row.current_bank_ac_no || "",
      ifscCode: item.ifscCode || row.ifsc_code || "",
      branchName: item.branchName || row.branch_name || "",
      personalEmail: item.personalEmail || item.emailId || row.personal_email_id || "",
      esicNo: item.esicNo || row.esic_no || "",
      highestQualification: item.highestQualification || row.highest_qualification || "",
      aadharCardNo: item.aadharCardNo || row.aadhar_card_no || "",
      department: item.department || row.joining_place || row.lookup_designation || "",

      aadharPhotoFile: null,
      panCardFile: null,
      candidatePhotoFile: null,
      bankPassbookPhotoFile: null,
      qualificationPhotoFile: null,
      salarySlipFile: null,
      resumeUploadFile: null,

      aadharPhotoUrl: item.aadharPhoto || row.aadhar_frontside_photo || "",
      panCardUrl: item.panCard || row.pan_card || "",
      candidatePhotoUrl: item.candidatePhoto || row.candidate_photo || "",
      bankPassbookPhotoUrl: item.bankPassbookPhoto || row.photo_of_front_bank_passbook || "",
      qualificationPhotoUrl: item.qualificationPhoto || row.qualification_photo || "",
      salarySlipUrl: item.salarySlip || row.salary_slip || "",
      resumeUploadUrl: item.resumeUpload || row.resume_cv_upload || "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      let aadharUrl = editFormData.aadharPhotoUrl;
      let panUrl = editFormData.panCardUrl;
      let photoUrl = editFormData.candidatePhotoUrl;
      let passbookUrl = editFormData.bankPassbookPhotoUrl;
      let qualUrl = editFormData.qualificationPhotoUrl;
      let salarySlipUrl = editFormData.salarySlipUrl;
      let resumeUrl = editFormData.resumeUploadUrl;

      if (editFormData.aadharPhotoFile) {
        aadharUrl = await uploadFile(editFormData.aadharPhotoFile, "1G4C-jwXRmkpbpR0d-7LW46jmtINqmEDtIEfGeyFya02oPVaODGQbh-zgWH5mUSlYPB_g1NnH");
      }
      if (editFormData.panCardFile) {
        panUrl = await uploadFile(editFormData.panCardFile, "1KF3kXxiteLk5WFy_zRCyQSg_7YSp-1ngoLNIoc29xly2OVdspjTgw9g-tZekv0OfIPaH_iXB");
      }
      if (editFormData.candidatePhotoFile) {
        photoUrl = await uploadFile(editFormData.candidatePhotoFile, "1Mu3MgyDhc-kM2UesunFRJxLo1sPYOQvdZa1cyKX8yvhPfiz5ssUDxIofM_MAIjlggXAOR4P9");
      }
      if (editFormData.bankPassbookPhotoFile) {
        passbookUrl = await uploadFile(editFormData.bankPassbookPhotoFile, "13WCUdwjeDfmC5Prfayqx45gv6GRebLpIwe2d0dHzVJ0mefMivnBqKD9YPqRiBytXaBJjs0P9");
      }
      if (editFormData.qualificationPhotoFile) {
        qualUrl = await uploadFile(editFormData.qualificationPhotoFile, "1H8kcgIU2Xr2JZWbIBklPiyOX7bnJ58WUn4Xnl3OlS2mV4B2KHk1wWOAmuIwZ3lEauSk4pClI");
      }
      if (editFormData.salarySlipFile) {
        salarySlipUrl = await uploadFile(editFormData.salarySlipFile, "1G2bX00chZoWyqeVm_P_Od7Fg901yqt6yZp3OogK4d1gjmIeVy1C2293fqqyaNyzUVj5P0aLd");
      }
      if (editFormData.resumeUploadFile) {
        resumeUrl = await uploadFile(editFormData.resumeUploadFile, "1wofoM_7jVDj61UV1R5QoxSdQeJhZTOgJMaAOKEqrbvqO-5HUis6qoc3z65K2e2JDIPMZpC7q");
      }

      // Update in Supabase joining_fms directly
      if (editingItem && editingItem.dbId) {
        const updatePayload = {
          candidate_name: editFormData.candidateName,
          name_as_per_aadhar: editFormData.candidateName,
          father_name: editFormData.fatherName,
          date_of_joining: editFormData.dateOfJoining,
          joining_place: editFormData.joiningPlace,
          designation: editFormData.designation,
          salary: editFormData.salary,
          current_address: editFormData.currentAddress,
          address_as_per_aadhar_card: editFormData.addressAsPerAadhar,
          dob_as_per_aadhar: editFormData.dobAsPerAadhar,
          gender: editFormData.gender,
          mobile_no: editFormData.mobileNo,
          family_mobile_no: editFormData.familyMobileNo,
          past_pf_id_no: editFormData.pastPfId,
          current_bank_ac_no: editFormData.currentBankAcNo,
          ifsc_code: editFormData.ifscCode,
          branch_name: editFormData.branchName,
          personal_email_id: editFormData.personalEmail,
          esic_no: editFormData.esicNo,
          highest_qualification: editFormData.highestQualification,
          aadhar_card_no: editFormData.aadharCardNo,
          aadhar_frontside_photo: aadharUrl,
          pan_card: panUrl,
          candidate_photo: photoUrl,
          photo_of_front_bank_passbook: passbookUrl,
          qualification_photo: qualUrl,
          salary_slip: salarySlipUrl,
          resume_cv_upload: resumeUrl,
          updated_at: new Date().toISOString()
        };
        const { error: sbUpdateErr } = await supabase
          .from("joining_fms")
          .update(updatePayload)
          .eq("id", editingItem.dbId);
        if (sbUpdateErr) throw sbUpdateErr;
      }

      // Optional legacy Google Sheet sync
      try {
        if (import.meta.env.VITE_JOINING_SHEET_URL) {
          const jefResponse = await fetch(
            `${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=${encodeURIComponent("JOINING ENTRY FORM")}&_=${Date.now()}`
          );
          const jefJson = parseJsonSafely(await jefResponse.text(), { data: [] });
          const jefData = jefJson.data || [];
          const jefHeaders = jefData[0] || [];
          const getIndex = (names) => jefHeaders.findIndex(h => h && names.map(n => n.toLowerCase().trim()).includes(h.toString().trim().toLowerCase()));
          const idxEnquiry = getIndex(["Candidate Enquiry No.", "Candidate Enquiry No", "Indent Number"]);
          const targetKey = normalizeId(editingItem.employeeId);

          let matchRow = -1;
          for (let i = 1; i < jefData.length; i++) {
            if (idxEnquiry !== -1 && normalizeId(jefData[i][idxEnquiry]) === targetKey && targetKey !== "") {
              matchRow = i;
              break;
            }
          }
          if (matchRow !== -1) {
            let updatedRow = [...jefData[matchRow]];
            const writeVal = (idx, val) => { if (idx !== -1) updatedRow[idx] = val; };
            writeVal(getIndex(["Name As per Aadhar", "Candidate Name", "Name"]), editFormData.candidateName);
            writeVal(getIndex(["Father Name", "Father's Name"]), editFormData.fatherName);
            writeVal(getIndex(["Joining Place"]), editFormData.joiningPlace);
            writeVal(getIndex(["Designation"]), editFormData.designation);
            writeVal(getIndex(["Salary"]), editFormData.salary);
            writeVal(getIndex(["Mobile No.", "Contact No", "Mobile No", "Mobile Number"]), editFormData.mobileNo);

            const payload = {
              sheet: "JOINING ENTRY FORM",
              action: "update",
              rowNumber: matchRow + 1,
              data: JSON.stringify(updatedRow)
            };

            await fetch(import.meta.env.VITE_JOINING_SHEET_URL, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(payload).toString(),
            });
          }
        }
      } catch (sheetSyncErr) {
        console.warn("Legacy sheet sync skipped:", sheetSyncErr);
      }

      toast.success("Employee updated successfully!");
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dateOfLeaving || !formData.reasonOfLeaving) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date();
      const formattedTimestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
      const leavingDate = new Date(formData.dateOfLeaving);
      const formattedLeavingDate = `${String(leavingDate.getMonth() + 1).padStart(2, '0')}/${String(leavingDate.getDate()).padStart(2, '0')}/${leavingDate.getFullYear()}`;

      // 1. Insert into Supabase leaving_fms
      const leavingPayload = {
        employee_id: selectedItem.employeeId,
        timestamp: formattedTimestamp,
        last_working_day: formData.dateOfLeaving,
        reason_for_resignation: formData.reasonOfLeaving,
        salary: formData.salary || selectedItem.salary || "",
        candidate_name: selectedItem.candidateName || selectedItem.name || "",
        designation: selectedItem.designation || "",
        mobile_no: formData.mobileNumber || selectedItem.mobileNo || "",
        family_mobile_no: selectedItem.familyMobileNo || "",
        relationship_with_family_person: selectedItem.relationshipWithFamily || "",
        past_pf_id_no: selectedItem.pastPfId || "",
        current_bank_ac_no: selectedItem.currentBankAcNo || "",
        ifsc_code: selectedItem.ifscCode || "",
        branch_name: selectedItem.branchName || "",
        photo_of_front_bank_passbook: selectedItem.bankPassbookPhoto || "",
        personal_email_id: selectedItem.personalEmail || selectedItem.emailId || "",
        esic_no: selectedItem.esicNo || "",
        highest_qualification: selectedItem.highestQualification || "",
        aadhar_card_no: selectedItem.aadharCardNo || "",
        qualification_photo: selectedItem.qualificationPhoto || "",
        salary_slip: selectedItem.salarySlip || "",
        resume_cv_upload: selectedItem.resumeUpload || "",
        leaving: "",
        ex4_status: "Pending",
        created_at: new Date().toISOString()
      };

      const { error: sbLeavingErr } = await supabase.from("leaving_fms").insert([leavingPayload]);
      if (sbLeavingErr) console.warn("Supabase leaving insert note:", sbLeavingErr.message);

      // 2. Mark leaving in joining_fms
      if (selectedItem.dbId) {
        await supabase.from("joining_fms").update({ leave: "Yes" }).eq("id", selectedItem.dbId);
      }

      // 3. Optional legacy Google Sheet sync
      try {
        if (import.meta.env.VITE_LEAVING_SHEET_URL) {
          const rowData = new Array(13).fill("");
          rowData[5] = selectedItem.employeeId;
          rowData[6] = formattedTimestamp;
          rowData[7] = formattedLeavingDate;
          rowData[8] = formData.reasonOfLeaving;
          rowData[9] = formData.salary;
          rowData[10] = selectedItem.candidateName;
          rowData[11] = selectedItem.designation;
          rowData[12] = formData.mobileNumber;

          const insertParams = new URLSearchParams({
            sheetName: 'FMS',
            action: 'insert',
            rowData: JSON.stringify(rowData),
          });

          await fetch(import.meta.env.VITE_LEAVING_SHEET_URL, {
            method: 'POST',
            body: insertParams,
          });
        }
      } catch (sheetErr) {
        console.warn("Legacy leaving sheet sync skipped:", sheetErr);
      }

      setFormData({
        dateOfLeaving: '',
        reasonOfLeaving: '',
        salary: '',
        mobileNumber: ''
      });
      setShowModal(false);
      toast.success('Leaving details submitted successfully!');
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Something went wrong: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcelClick = () => {
    setExportPassword("");
    setShowPasswordModal(true);
  };

  const executeExportExcel = () => {
    if (exportPassword !== "9184") {
      toast.error("Incorrect password!");
      return;
    }
    setShowPasswordModal(false);

    try {
      const wb = XLSX.utils.book_new();

      const formattedJoining = filteredJoiningData.map(item => {
        const rowData = {};
        if (sheetHeaders && sheetHeaders.length > 0) {
          sheetHeaders.forEach((header, index) => {
            if (header && typeof header === 'string' && header.trim() !== "") {
              rowData[header.trim()] = (item.originalRow && item.originalRow[index] !== undefined && item.originalRow[index] !== null) 
                                       ? item.originalRow[index].toString() 
                                       : "";
            } else if (header !== null && header !== undefined && header.toString().trim() !== "") {
              rowData[header.toString().trim()] = (item.originalRow && item.originalRow[index] !== undefined && item.originalRow[index] !== null) 
                                       ? item.originalRow[index].toString() 
                                       : "";
            }
          });
        }
        
        // If rowData is empty (e.g. headers were empty strings), use fallback
        if (Object.keys(rowData).length === 0) {
          rowData["Employee ID"] = item.employeeId;
          rowData["Name"] = item.candidateName;
          rowData["Father's Name"] = item.fatherName;
          rowData["Designation"] = item.designation;
          rowData["Department"] = item.department;
          rowData["Joining Date"] = item.dateOfJoining;
          rowData["Joining Place"] = item.joiningPlace;
          rowData["Mobile Number"] = item.mobileNo;
          rowData["Email"] = item.emailId;
          rowData["Status"] = item.status;
        }
        return rowData;
      });

      const formattedLeaving = filteredLeavingData.map(item => ({
        "Employee ID": item.employeeId,
        "Name": item.name,
        "Father's Name": item.fatherName,
        "Designation": item.designation,
        "Department": item.department,
        "Joining Date": item.dateOfJoining,
        "Joining Place": item.joiningPlace,
        "Leaving Date": item.dateOfLeaving,
        "Reason for Leaving": item.reasonOfLeaving,
        "Salary": item.salary,
        "Mobile Number": item.mobileNo
      }));

      const wsJoining = formattedJoining.length > 0 
        ? XLSX.utils.json_to_sheet(formattedJoining) 
        : XLSX.utils.json_to_sheet([{"Message": "No data"}]);
      XLSX.utils.book_append_sheet(wb, wsJoining, "Active_Joining");

      const wsLeaving = formattedLeaving.length > 0 
        ? XLSX.utils.json_to_sheet(formattedLeaving) 
        : XLSX.utils.json_to_sheet([{"Message": "No data"}]);
      XLSX.utils.book_append_sheet(wb, wsLeaving, "Archived_Leaving");

      XLSX.writeFile(wb, "Employee_Master.xlsx");
      toast.success("Excel downloaded successfully!");
    } catch (err) {
      console.error("Export Error:", err);
      toast.error("Failed to export Excel file");
    }
  };

  const isFilterActive = Boolean(searchTerm || joiningPlaceFilter);

  const clearAllFilters = () => {
    setSearchTerm("");
    setJoiningPlaceFilter("");
  };

  return (
    <div className="p-3 sm:p-5 space-y-3 bg-[#f8fafc] min-h-screen text-xs antialiased text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation & Actions Top Bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-xs shadow-teal-500/20">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Employee Master Directory</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  {activeTab === "joining" ? filteredJoiningData.length : filteredLeavingData.length} Personnel
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Manage all active joining and archived personnel records</p>
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

            {/* Refresh / Sync */}
            <button
              onClick={fetchData}
              disabled={tableLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={12} className={tableLoading ? "animate-spin text-teal-600" : "text-slate-500"} />
              <span>{tableLoading ? "Syncing..." : "Sync"}</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcelClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Download size={13} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Quick Status Tabs Sub-bar */}
        <div className="px-4 py-2 bg-slate-50/50 flex items-center gap-2 overflow-x-auto border-t border-slate-100">
          <button
            onClick={() => setActiveTab("joining")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "joining"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold"
                : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === "joining" ? "bg-emerald-300" : "bg-emerald-500"}`}></span>
            <span>Active / Joining</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === "joining" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {joiningData.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("leaving")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "leaving"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold"
                : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === "leaving" ? "bg-rose-300" : "bg-rose-500"}`}></span>
            <span>Archived / Leaving</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === "leaving" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {leavingData.length}
            </span>
          </button>
        </div>
      </div>

      {/* Team Stories & Quick Profiles Section (Interactive Story Carousel) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs overflow-hidden">
        {/* Header line */}
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Team Stories & Quick Profiles
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 font-mono">
              {activeTab === "joining" ? filteredJoiningData.length : filteredLeavingData.length} Personnel
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Click circle to view full profile details
          </span>
        </div>

        {/* Stories Horizontal Scroll Carousel */}
        <div className="flex items-center gap-3.5 sm:gap-4.5 overflow-x-auto custom-scrollbar pb-1 pt-1 px-1">
          {/* Quick Add / Focus Overview Icon */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 group cursor-default">
            <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full border-2 border-dashed border-teal-400/80 flex items-center justify-center bg-teal-50/50 group-hover:bg-teal-50 group-hover:border-teal-500 transition-all">
              <Sparkles size={20} className="text-teal-600 group-hover:rotate-12 transition-transform" />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-slate-800 leading-tight">All Team</p>
              <p className="text-[9.5px] text-slate-400 leading-tight">Overview</p>
            </div>
          </div>

          {/* Employee Story Circles */}
          {(activeTab === "joining" ? filteredJoiningData : filteredLeavingData).map((item, index) => {
            const displayName = (item.candidateName || item.name || "Employee").split(" ")[0];
            const displayRole = item.designation || "Member";
            const isLeaving = activeTab === "leaving";

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleViewProfile(item)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none transition-transform active:scale-95"
                title={`Click to view ${item.candidateName || item.name}'s complete details`}
              >
                {/* Story Ring Avatar */}
                <div className="relative">
                  <div className={`w-14 h-14 sm:w-15 sm:h-15 rounded-full p-0.5 transition-all duration-300 group-hover:scale-105 shadow-xs ${
                    isLeaving
                      ? "bg-gradient-to-tr from-rose-400 to-amber-400 group-hover:shadow-md group-hover:shadow-rose-400/30"
                      : "bg-gradient-to-tr from-teal-500 via-emerald-400 to-indigo-500 group-hover:shadow-md group-hover:shadow-teal-500/30"
                  }`}>
                    <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden">
                      {item.candidatePhoto ? (
                        <img
                          src={getDriveImageUrl(item.candidatePhoto, 140)}
                          alt={item.candidateName || item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top rounded-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-tr ${getAvatarGradient(item.candidateName || item.name)} text-white font-bold text-xs rounded-full flex items-center justify-center ${item.candidatePhoto ? 'hidden' : 'flex'}`}>
                        {getInitials(item.candidateName || item.name)}
                      </div>
                    </div>
                  </div>

                  {/* Active / Status Dot */}
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs ${
                    isLeaving ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                  }`} />
                </div>

                {/* Name & Role Text */}
                <div className="text-center max-w-[68px] sm:max-w-[74px]">
                  <p className="text-[11.5px] font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[9.5px] text-slate-400 truncate leading-tight mt-0.5 font-medium">
                    {displayRole}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Joining Place Filter */}
          {activeTab === "joining" && (
            <div className="relative">
              <select
                value={joiningPlaceFilter}
                onChange={(e) => setJoiningPlaceFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-teal-500 font-medium cursor-pointer"
              >
                <option value="">All Joining Places</option>
                {joiningPlaces.map((place, index) => (
                  <option key={index} value={place}>
                    📍 {place}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {isFilterActive && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-200"
            >
              <X size={11} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Count summary indicator */}
        <div className="text-[11px] text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{activeTab === "joining" ? filteredJoiningData.length : filteredLeavingData.length}</span> records
        </div>
      </div>

      {/* Main Table / Grid Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {activeTab === "joining" && (
          <>
            {viewMode === "table" ? (
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] table-container">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead className="bg-slate-50/90 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Profile & Name</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Employee ID</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Designation & Dept</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Joining Date</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Joining Location</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Documents</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs">
                    {tableLoading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-16 text-center">
                          <div className="flex justify-center flex-col items-center">
                            <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
                            <span className="text-slate-500 font-medium">Loading employee directory...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl inline-block">
                            <p className="font-semibold mb-1">Error loading employee data</p>
                            <p className="text-xs text-rose-600 mb-2">{error}</p>
                            <button onClick={fetchData} className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors text-xs">Retry</button>
                          </div>
                        </td>
                      </tr>
                    ) : filteredJoiningData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                          <Users size={28} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-slate-600">No active employees found</p>
                          <p className="text-[11px]">Try adjusting your search query or filter</p>
                        </td>
                      </tr>
                    ) : (
                      filteredJoiningData.map((item, index) => (
                        <tr
                          key={index}
                          onClick={() => handleViewProfile(item)}
                          className="hover:bg-indigo-50/60 transition-colors group cursor-pointer"
                        >
                          {/* Profile & Name */}
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-slate-200 shadow-2xs shrink-0 bg-slate-100">
                                {item.candidatePhoto ? (
                                  <img
                                    src={getDriveImageUrl(item.candidatePhoto, 120)}
                                    alt={item.candidateName}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full h-full bg-gradient-to-tr ${getAvatarGradient(item.candidateName)} text-white font-bold text-[11px] flex items-center justify-center ${item.candidatePhoto ? 'hidden' : 'flex'}`}>
                                  {getInitials(item.candidateName)}
                                </div>
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                                  {item.candidateName}
                                </p>
                                {item.fatherName && item.fatherName !== "N/A" && item.fatherName !== "na" && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <User size={10} /> C/O {item.fatherName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-200/60 px-2 py-0.5 rounded-md text-[11px]">
                              {item.employeeId || "-"}
                            </span>
                          </td>

                          {/* Designation & Dept */}
                          <td className="px-3.5 py-2.5">
                            <p className="font-semibold text-slate-800 flex items-center gap-1.5 leading-tight">
                              <Briefcase size={12} className="text-slate-400 shrink-0" />
                              <span>{item.designation || 'N/A'}</span>
                            </p>
                            {item.department && item.department !== "N/A" && item.department !== "na" && (
                              <p className="text-[10px] text-slate-400 mt-0.5 pl-4">{item.department}</p>
                            )}
                          </td>

                          {/* Joining Date */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <Calendar size={12} className="text-teal-600 shrink-0" />
                              <span>{item.dateOfJoining ? formatDOB(item.dateOfJoining) : "-"}</span>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
                              <MapPin size={11} />
                              <span>{item.joiningPlace || 'N/A'}</span>
                            </span>
                          </td>

                          {/* Documents */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {item.aadharPhoto ? (
                              <a
                                href={item.aadharPhoto}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[11px] font-semibold transition-colors border border-slate-200"
                              >
                                <FileText size={12} className="text-indigo-600" />
                                <span>Aadhar</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">No doc</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProfile(item);
                                }}
                                title="View Complete Details"
                                className="p-1.5 text-xs bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 font-bold rounded-lg transition-colors shadow-2xs cursor-pointer inline-flex items-center justify-center"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(item);
                                }}
                                className="px-2.5 py-1 text-xs bg-white border border-indigo-200 text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => handleLeaveClick(e, item)}
                                className="px-2.5 py-1 text-xs bg-white border border-rose-200 text-rose-700 font-bold rounded-lg hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                              >
                                Mark Leave
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Card Grid View (Ultra Premium Edition) */
              <div className="p-4 sm:p-5 max-h-[calc(100vh-230px)] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-4.5">
                  {filteredJoiningData.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleViewProfile(item)}
                      className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-teal-400/80 p-4 sm:p-4.5 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1"
                    >
                      {/* Top Glowing Ambient Accent */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />

                      {/* Header Row: Avatar + Employee ID & Active Status */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          {/* Avatar with Status Ring */}
                          <div className="relative shrink-0">
                            <div className="w-13 h-13 rounded-2xl bg-slate-100 p-0.5 shadow-xs border border-slate-200/90 overflow-hidden group-hover:border-teal-400 group-hover:shadow-md transition-all duration-300">
                              {item.candidatePhoto ? (
                                <img
                                  src={getDriveImageUrl(item.candidatePhoto, 180)}
                                  alt={item.candidateName}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover object-top rounded-[13px]"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-tr ${getAvatarGradient(item.candidateName)} text-white font-extrabold text-sm rounded-[13px] flex items-center justify-center ${item.candidatePhoto ? 'hidden' : 'flex'}`}>
                                {getInitials(item.candidateName)}
                              </div>
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-2xs animate-pulse" title="Active Employee" />
                          </div>

                          {/* ID & Status Chip */}
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200/90 px-2 py-0.5 rounded-lg text-[10px] tracking-wide shadow-2xs group-hover:bg-teal-50 group-hover:text-teal-800 group-hover:border-teal-200 transition-colors">
                              {item.employeeId || 'ID N/A'}
                            </span>
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/90 px-2 py-0.5 rounded-full border border-emerald-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Active</span>
                            </div>
                          </div>
                        </div>

                        {/* Name & Guardian */}
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors text-[14px] tracking-tight line-clamp-1">
                            {item.candidateName}
                          </h3>
                          {item.fatherName && item.fatherName !== "N/A" && (
                            <p className="text-[10.5px] font-medium text-slate-400 truncate flex items-center gap-1">
                              <User size={10} className="text-slate-400 shrink-0" />
                              <span>C/O {item.fatherName}</span>
                            </p>
                          )}
                        </div>

                        {/* Designation Pill */}
                        <div className="mt-2.5">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-teal-50/80 text-teal-900 font-bold text-[11px] border border-teal-200/60 max-w-full truncate shadow-2xs">
                            <Briefcase size={12} className="text-teal-600 shrink-0" />
                            <span className="truncate">{item.designation || 'Role N/A'}</span>
                          </div>
                        </div>

                        {/* Info Tiles Section */}
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                          {/* Joining Date */}
                          <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-slate-50/70 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <Calendar size={12} className="text-teal-600 shrink-0" />
                              <span>Joined</span>
                            </div>
                            <span className="font-semibold text-slate-800">{item.dateOfJoining ? formatDOB(item.dateOfJoining) : "-"}</span>
                          </div>

                          {/* Location */}
                          <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-slate-50/70 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <MapPin size={12} className="text-sky-600 shrink-0" />
                              <span>Location</span>
                            </div>
                            <span className="font-semibold text-slate-800 truncate max-w-[120px]">{item.joiningPlace || 'Raipur'}</span>
                          </div>

                          {/* Contact or KYC Doc Info */}
                          {item.mobileNo ? (
                            <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-slate-50/70 border border-slate-100">
                              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                                <Phone size={12} className="text-amber-600 shrink-0" />
                                <span>Phone</span>
                              </div>
                              <span className="font-mono font-semibold text-slate-700">{item.mobileNo}</span>
                            </div>
                          ) : item.aadharPhoto ? (
                            <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-indigo-50/40 border border-indigo-100/60">
                              <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                                <FileText size={12} className="text-indigo-600 shrink-0" />
                                <span>Document</span>
                              </div>
                              <span className="font-semibold text-indigo-700">Aadhar Available</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        {/* Primary View Profile Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(item);
                          }}
                          className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-[11.5px] font-bold shadow-xs shadow-teal-600/20 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="View Complete Profile Dossier"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(item);
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-xl border border-slate-200/90 transition-all shadow-2xs cursor-pointer"
                            title="Edit Employee Details"
                          >
                            <Edit size={11} className="inline mr-1" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveClick(e, item);
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50/70 hover:bg-rose-100 hover:border-rose-300 rounded-xl border border-rose-200/80 transition-all shadow-2xs cursor-pointer"
                            title="Mark as Left / Archive"
                          >
                            Leave
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "leaving" && (
          <>
            {viewMode === "table" ? (
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] table-container">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead className="bg-slate-50/90 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Archived Profile</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Employee ID</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Role & Details</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Duration</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Contact</th>
                      <th className="px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Reason for Leaving</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs">
                    {tableLoading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-16 text-center">
                          <div className="flex justify-center flex-col items-center">
                            <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-600 rounded-full animate-spin mb-3"></div>
                            <span className="text-slate-500 font-medium">Loading archived personnel...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl inline-block">
                            <p className="font-semibold mb-1">Error loading archived records</p>
                            <p className="text-xs text-rose-600 mb-2">{error}</p>
                            <button onClick={fetchData} className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors text-xs">Retry</button>
                          </div>
                        </td>
                      </tr>
                    ) : filteredLeavingData.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                          <Users size={28} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-slate-600">No archived records found</p>
                          <p className="text-[11px]">No leaving personnel records match criteria</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLeavingData.map((item, index) => (
                        <tr
                          key={index}
                          onClick={() => handleViewProfile(item)}
                          className="hover:bg-rose-50/50 transition-colors group cursor-pointer"
                        >
                          {/* Profile */}
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-slate-200 shadow-2xs shrink-0 bg-slate-100 grayscale opacity-80">
                                {item.candidatePhoto ? (
                                  <img
                                    src={getDriveImageUrl(item.candidatePhoto, 120)}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className="w-full h-full bg-slate-400 text-white font-bold text-[11px] flex items-center justify-center">
                                  {getInitials(item.name)}
                                </div>
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 line-through decoration-rose-400 opacity-80 leading-tight">
                                  {item.name}
                                </p>
                                <span className="text-[9px] font-bold uppercase text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 inline-block mt-0.5">
                                  Left
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] opacity-80">
                              {item.employeeId || "-"}
                            </span>
                          </td>

                          {/* Role & Dept */}
                          <td className="px-3.5 py-2.5">
                            <p className="font-semibold text-slate-700 flex items-center gap-1.5 leading-tight">
                              <Briefcase size={12} className="text-slate-400" />
                              <span>{item.designation || 'N/A'}</span>
                            </p>
                            {item.department && <p className="text-[10px] text-slate-400 pl-4 mt-0.5">{item.department}</p>}
                          </td>

                          {/* Duration */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {item.dateOfJoining && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 w-fit">
                                  <span className="font-bold">Joined:</span> {formatDOB(item.dateOfJoining)}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 w-fit">
                                <span className="font-bold">Left:</span> {item.dateOfLeaving ? formatDOB(item.dateOfLeaving) : 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-600">
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-slate-400" />
                              {item.mobileNo || '-'}
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="px-3.5 py-2.5">
                            <p className="text-[11px] text-slate-600 italic border-l-2 border-rose-300 pl-2.5 py-0.5 bg-slate-50/80 rounded-r-md max-w-xs truncate" title={item.reasonOfLeaving}>
                              "{item.reasonOfLeaving || 'No reason specified'}"
                            </p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Archived Cards Grid View */
              <div className="p-4 sm:p-5 max-h-[calc(100vh-230px)] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-4.5">
                  {filteredLeavingData.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleViewProfile(item)}
                      className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-rose-300 p-4 sm:p-4.5 hover:shadow-xl hover:shadow-rose-900/5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 via-rose-500 to-amber-500 opacity-80" />
                      
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-13 h-13 rounded-2xl bg-slate-100 p-0.5 shadow-xs border border-slate-200/90 overflow-hidden shrink-0 grayscale opacity-85">
                            {item.candidatePhoto ? (
                              <img
                                src={getDriveImageUrl(item.candidatePhoto, 180)}
                                alt={item.name}
                                className="w-full h-full object-cover object-top rounded-[13px]"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className="w-full h-full bg-slate-400 text-white font-extrabold text-sm rounded-[13px] flex items-center justify-center">
                              {getInitials(item.name)}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <span className="font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px]">
                              {item.employeeId || 'ID N/A'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/70">
                              Archived
                            </span>
                          </div>
                        </div>

                        <h3 className="font-bold text-slate-800 line-through decoration-rose-400 text-[14px] tracking-tight line-clamp-1">
                          {item.name}
                        </h3>

                        <div className="mt-2.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200 max-w-full truncate">
                            <Briefcase size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{item.designation || 'Role N/A'}</span>
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-rose-50/50 border border-rose-100">
                            <span className="text-slate-500 font-medium">Left On</span>
                            <span className="font-bold text-rose-700">{item.dateOfLeaving ? formatDOB(item.dateOfLeaving) : 'N/A'}</span>
                          </div>
                          {item.reasonOfLeaving && (
                            <div className="text-[11px] px-2 py-1 rounded-lg bg-slate-50 text-slate-600 italic truncate border border-slate-100">
                              "{item.reasonOfLeaving}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(item);
                          }}
                          className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View Archived Dossier</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedItem && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
              {/* Modal Header (Sticky Top) */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Leaving Form</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Mark personnel as Left / Archive</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Content (Scrollable) */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar text-xs">
                  {/* Employee Summary Card */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Employee</span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded text-[10px]">
                        {selectedItem.employeeId || "-"}
                      </span>
                    </div>
                    <p className="font-extrabold text-slate-800 text-[13px]">
                      {selectedItem.candidateName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedItem.designation || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Working Day <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dateOfLeaving"
                      value={formData.dateOfLeaving}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none transition-all shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reason For Resignation <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      name="reasonOfLeaving"
                      value={formData.reasonOfLeaving}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Enter reason for leaving..."
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none transition-all shadow-2xs resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Salary</label>
                      <input
                        type="text"
                        name="salary"
                        placeholder="e.g. 30000"
                        value={formData.salary}
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile No.</label>
                      <input
                        type="text"
                        name="mobileNumber"
                        placeholder="Mobile number"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Sticky Footer with Always-Visible Submit Button */}
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-end gap-2.5 shrink-0 z-10 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-white active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Leaving</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
      )}

      {/* Enhanced Profile Details Modal */}
      {showProfileModal && selectedProfile && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-[99999] p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative animate-scaleIn border border-slate-200/90">
            
            {/* Header / Cover Banner */}
            <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 sm:px-8 py-4.5 text-white shrink-0 border-b border-indigo-900/40">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold tracking-widest uppercase text-indigo-200">
                    PIRAMAL PHARMA • EMPLOYEE DOSSIER
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const prof = selectedProfile;
                      setShowProfileModal(false);
                      handleEditClick(prof);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
                  >
                    <Edit size={13} />
                    <span>Edit Profile</span>
                  </button>

                  <button 
                    onClick={closeProfileModal} 
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar p-6 sm:p-8 space-y-5 sm:space-y-6">
              
              {/* Profile Avatar & Hero Information Card */}
              <div className="bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40 p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-5 sm:gap-6 pl-1 sm:pl-2">
                  {/* Avatar Container */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200/90 shrink-0 relative group">
                    <div className="w-full h-full bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center relative">
                      {selectedProfile.candidatePhoto ? (
                        <button
                          type="button"
                          onClick={() => openImagePreview(selectedProfile.candidatePhoto, selectedProfile.candidateName || selectedProfile.name)}
                          className="w-full h-full cursor-zoom-in group/btn relative block"
                          aria-label="Open employee photo"
                        >
                          <img 
                            src={getDriveImageUrl(selectedProfile.candidatePhoto, 600)} 
                            alt={selectedProfile.candidateName || selectedProfile.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top group-hover/btn:scale-105 transition-transform duration-300" 
                            onError={(e) => { 
                              e.target.onerror = null; 
                              e.target.style.display = 'none'; 
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }} 
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/btn:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            <Eye size={16} />
                          </div>
                        </button>
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-tr ${getAvatarGradient(selectedProfile.candidateName || selectedProfile.name)} text-white font-black text-2xl flex items-center justify-center ${selectedProfile.candidatePhoto ? 'hidden' : 'flex'}`}>
                        {getInitials(selectedProfile.candidateName || selectedProfile.name)}
                      </div>
                    </div>
                  </div>

                  {/* Name and Designation */}
                  <div className="space-y-2 pl-1 sm:pl-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {selectedProfile.candidateName || selectedProfile.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg">
                        <Briefcase size={13} className="text-indigo-600" /> 
                        {selectedProfile.designation || 'No Designation'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                        {selectedProfile.employeeId || selectedProfile.employee_code || 'No Code'}
                      </span>
                      {selectedProfile.joiningPlace && (
                        <span className="inline-flex items-center gap-1 font-medium text-sky-700 bg-sky-50 border border-sky-200/70 px-2.5 py-1 rounded-lg">
                          <MapPin size={12} className="text-sky-500" />
                          {selectedProfile.joiningPlace}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 self-start sm:self-center pr-1 sm:pr-2">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs ${
                    selectedProfile.isArchived 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${selectedProfile.isArchived ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                    {selectedProfile.isArchived ? 'Inactive / Left' : 'Active Employee'}
                  </span>
                </div>
              </div>

              {/* 4 Core Details Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 text-xs">
                {/* 1. Personal & KYC Details */}
                <div className="bg-slate-50/90 hover:bg-slate-50 transition-colors p-5 sm:p-6 rounded-2xl border border-slate-200/90 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 pl-1">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                        <User size={13} />
                      </div>
                      Personal & KYC Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pl-1 pr-1">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Father's Name</span>
                      <span className="font-bold text-slate-800">{selectedProfile.fatherName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Date of Birth</span>
                      <span className="font-bold text-slate-800">{selectedProfile.dobAsPerAadhar || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Gender</span>
                      <span className="font-bold text-slate-800">{selectedProfile.gender || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Highest Qualification</span>
                      <span className="font-bold text-slate-800">{selectedProfile.highestQualification || '—'}</span>
                    </div>
                    <div className="col-span-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Aadhar Card Number</span>
                        <span className="font-mono font-bold text-slate-900 tracking-wider">{selectedProfile.aadharCardNo || '—'}</span>
                      </div>
                      {selectedProfile.aadharCardNo && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedProfile.aadharCardNo);
                            toast.success("Aadhar number copied!");
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Copy Aadhar Number"
                        >
                          <Copy size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Address */}
                <div className="bg-slate-50/90 hover:bg-slate-50 transition-colors p-5 sm:p-6 rounded-2xl border border-slate-200/90 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 pl-1">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                        <Phone size={13} />
                      </div>
                      Contact & Address
                    </h3>
                  </div>

                  <div className="space-y-3 pl-1 pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">Primary Mobile</span>
                      {selectedProfile.mobileNo ? (
                        <a href={`tel:${selectedProfile.mobileNo}`} className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1">
                          <Phone size={11} />
                          {selectedProfile.mobileNo}
                        </a>
                      ) : (
                        <span className="font-bold text-slate-700">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">Family Mobile</span>
                      <span className="font-mono font-bold text-slate-700">{selectedProfile.familyMobileNo || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">Personal Email</span>
                      {selectedProfile.emailId || selectedProfile.personalEmail ? (
                        <a href={`mailto:${selectedProfile.emailId || selectedProfile.personalEmail}`} className="font-medium text-indigo-600 hover:underline truncate max-w-[200px]">
                          {selectedProfile.emailId || selectedProfile.personalEmail}
                        </a>
                      ) : (
                        <span className="font-medium text-slate-700">—</span>
                      )}
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Current Address</span>
                      <p className="font-medium text-slate-700 text-[11px] leading-relaxed">{selectedProfile.currentAddress || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Address as per Aadhar</span>
                      <p className="font-medium text-slate-700 text-[11px] leading-relaxed">{selectedProfile.addressAsPerAadhar || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Employment & Salary */}
                <div className="bg-slate-50/90 hover:bg-slate-50 transition-colors p-5 sm:p-6 rounded-2xl border border-slate-200/90 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 pl-1">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                        <Briefcase size={13} />
                      </div>
                      Employment & Role
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pl-1 pr-1">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Date of Joining</span>
                      <span className="font-bold text-slate-800">{selectedProfile.dateOfJoining ? formatDOB(selectedProfile.dateOfJoining) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Joining Location</span>
                      <span className="font-bold text-slate-800">{selectedProfile.joiningPlace || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Department</span>
                      <span className="font-bold text-slate-800">{selectedProfile.department || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Indent Reference</span>
                      <span className="font-bold text-slate-800">{selectedProfile.indentNo || '—'}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Monthly Salary / CTC</span>
                        <span className="text-base font-black text-emerald-700 tracking-tight">₹ {selectedProfile.salary || '—'}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                        Finalized
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Bank Account & Statutory */}
                <div className="bg-slate-50/90 hover:bg-slate-50 transition-colors p-5 sm:p-6 rounded-2xl border border-slate-200/90 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 pl-1">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                        <CreditCard size={13} />
                      </div>
                      Bank Account & Statutory
                    </h3>
                  </div>

                  <div className="space-y-3 pl-1 pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">Bank Account No</span>
                      <span className="font-mono font-bold text-slate-900">{selectedProfile.currentBankAcNo || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">IFSC Code</span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">{selectedProfile.ifscCode || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">Branch Name</span>
                      <span className="font-semibold text-slate-700">{selectedProfile.branchName || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">PF ID No</span>
                      <span className="font-mono font-medium text-slate-800">{selectedProfile.pastPfId || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">ESIC No</span>
                      <span className="font-mono font-medium text-slate-800">{selectedProfile.esicNo || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Assigned Corporate Assets (if any) */}
              {(selectedProfile.laptopBrandModel || selectedProfile.mobileBrandSim || selectedProfile.gmailId) && (
                <div className="mt-4 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm">
                  <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Laptop size={14} className="text-cyan-400" />
                    Assigned Corporate Assets & IT Credentials
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {selectedProfile.laptopBrandModel && (
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Laptop / Workstation</span>
                        <span className="font-bold text-slate-200">{selectedProfile.laptopBrandModel}</span>
                      </div>
                    )}
                    {selectedProfile.mobileBrandSim && (
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Mobile / SIM Allocation</span>
                        <span className="font-bold text-slate-200">{selectedProfile.mobileBrandSim}</span>
                      </div>
                    )}
                    {selectedProfile.gmailId && (
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Official Google Workspace</span>
                        <span className="font-bold text-cyan-300">{selectedProfile.gmailId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. Uploaded KYC Documents Gallery */}
              <div className="mt-5 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                      <FileText size={13} />
                    </div>
                    Uploaded Documents & KYC Proofs
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Click to view document proofs</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {/* Aadhar Photo */}
                  {selectedProfile.aadharPhoto ? (
                    <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all hover:shadow-sm">
                      <div className="p-2 rounded-xl bg-white text-indigo-600 shadow-2xs">
                        <FileText size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-indigo-900 leading-tight">Aadhar Card</span>
                      <div className="flex items-center gap-1 w-full pt-1 border-t border-indigo-100/80">
                        <a 
                          href={selectedProfile.aadharPhoto} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 py-1 px-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center gap-0.5 border border-indigo-200/60 transition-colors shadow-2xs"
                          title="View Online"
                        >
                          <span>View</span>
                          <ExternalLink size={9} />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(e, selectedProfile.aadharPhoto, `${selectedProfile.candidateName || 'Employee'}_Aadhar`)}
                          className="flex-1 py-1 px-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title="Download Aadhar"
                        >
                          <Download size={10} />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 opacity-50 min-h-[105px]">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400">No Aadhar</span>
                    </div>
                  )}

                  {/* PAN Card */}
                  {selectedProfile.panCard ? (
                    <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all hover:shadow-sm">
                      <div className="p-2 rounded-xl bg-white text-purple-600 shadow-2xs">
                        <FileText size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-purple-900 leading-tight">PAN Card</span>
                      <div className="flex items-center gap-1 w-full pt-1 border-t border-purple-100/80">
                        <a 
                          href={selectedProfile.panCard} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 py-1 px-1 rounded-lg bg-white hover:bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center gap-0.5 border border-purple-200/60 transition-colors shadow-2xs"
                          title="View Online"
                        >
                          <span>View</span>
                          <ExternalLink size={9} />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(e, selectedProfile.panCard, `${selectedProfile.candidateName || 'Employee'}_PAN`)}
                          className="flex-1 py-1 px-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title="Download PAN"
                        >
                          <Download size={10} />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 opacity-50 min-h-[105px]">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400">No PAN</span>
                    </div>
                  )}

                  {/* Bank Passbook */}
                  {selectedProfile.bankPassbookPhoto ? (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all hover:shadow-sm">
                      <div className="p-2 rounded-xl bg-white text-emerald-600 shadow-2xs">
                        <CreditCard size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-900 leading-tight">Bank Passbook</span>
                      <div className="flex items-center gap-1 w-full pt-1 border-t border-emerald-100/80">
                        <a 
                          href={selectedProfile.bankPassbookPhoto} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 py-1 px-1 rounded-lg bg-white hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center gap-0.5 border border-emerald-200/60 transition-colors shadow-2xs"
                          title="View Online"
                        >
                          <span>View</span>
                          <ExternalLink size={9} />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(e, selectedProfile.bankPassbookPhoto, `${selectedProfile.candidateName || 'Employee'}_Passbook`)}
                          className="flex-1 py-1 px-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title="Download Passbook"
                        >
                          <Download size={10} />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 opacity-50 min-h-[105px]">
                      <CreditCard size={16} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400">No Passbook</span>
                    </div>
                  )}

                  {/* Qualification */}
                  {selectedProfile.qualificationPhoto ? (
                    <div className="p-3 bg-sky-50/80 border border-sky-200/80 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all hover:shadow-sm">
                      <div className="p-2 rounded-xl bg-white text-sky-600 shadow-2xs">
                        <Award size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-sky-900 leading-tight">Qualification</span>
                      <div className="flex items-center gap-1 w-full pt-1 border-t border-sky-100/80">
                        <a 
                          href={selectedProfile.qualificationPhoto} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 py-1 px-1 rounded-lg bg-white hover:bg-sky-100 text-sky-700 font-bold text-[10px] flex items-center justify-center gap-0.5 border border-sky-200/60 transition-colors shadow-2xs"
                          title="View Online"
                        >
                          <span>View</span>
                          <ExternalLink size={9} />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(e, selectedProfile.qualificationPhoto, `${selectedProfile.candidateName || 'Employee'}_Qualification`)}
                          className="flex-1 py-1 px-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title="Download Qualification"
                        >
                          <Download size={10} />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 opacity-50 min-h-[105px]">
                      <Award size={16} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400">No Degree</span>
                    </div>
                  )}

                  {/* Salary Slip */}
                  {selectedProfile.salarySlip ? (
                    <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all hover:shadow-sm">
                      <div className="p-2 rounded-xl bg-white text-amber-600 shadow-2xs">
                        <FileText size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-amber-900 leading-tight">Salary Slip</span>
                      <div className="flex items-center gap-1 w-full pt-1 border-t border-amber-100/80">
                        <a 
                          href={selectedProfile.salarySlip} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 py-1 px-1 rounded-lg bg-white hover:bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center gap-0.5 border border-amber-200/60 transition-colors shadow-2xs"
                          title="View Online"
                        >
                          <span>View</span>
                          <ExternalLink size={9} />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(e, selectedProfile.salarySlip, `${selectedProfile.candidateName || 'Employee'}_SalarySlip`)}
                          className="flex-1 py-1 px-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title="Download Salary Slip"
                        >
                          <Download size={10} />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 opacity-50 min-h-[105px]">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400">No Slip</span>
                    </div>
                  )}

                  {/* Resume / CV */}
                  {selectedProfile.resumeUpload ? (
                    <div className="p-3 bg-teal-50/80 border border-teal-200/80 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all hover:shadow-sm">
                      <div className="p-2 rounded-xl bg-white text-teal-600 shadow-2xs">
                        <FileText size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-teal-900 leading-tight">Resume / CV</span>
                      <div className="flex items-center gap-1 w-full pt-1 border-t border-teal-100/80">
                        <a 
                          href={selectedProfile.resumeUpload} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 py-1 px-1 rounded-lg bg-white hover:bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center gap-0.5 border border-teal-200/60 transition-colors shadow-2xs"
                          title="View Online"
                        >
                          <span>View</span>
                          <ExternalLink size={9} />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(e, selectedProfile.resumeUpload, `${selectedProfile.candidateName || 'Employee'}_Resume`)}
                          className="flex-1 py-1 px-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title="Download Resume"
                        >
                          <Download size={10} />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 opacity-50 min-h-[105px]">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400">No Resume</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-400">Employee Profile Dossier • Verified Database</span>
              <button
                type="button"
                onClick={closeProfileModal}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showEditModal && editingItem && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-150">
              <div>
                <h3 className="text-lg font-black text-gray-800 tracking-tight">Edit Employee Details</h3>
                <p className="text-xs text-gray-500 font-medium">Update profile, documents and general details</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Section 1: Personal Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Employee Name</label>
                    <input
                      type="text"
                      value={editFormData.candidateName}
                      onChange={(e) => setEditFormData({ ...editFormData, candidateName: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Father's Name</label>
                    <input
                      type="text"
                      value={editFormData.fatherName}
                      onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editFormData.dobAsPerAadhar}
                      onChange={(e) => setEditFormData({ ...editFormData, dobAsPerAadhar: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Gender</label>
                    <select
                      value={editFormData.gender}
                      onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all h-9.5"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Aadhar Card No</label>
                    <input
                      type="text"
                      value={editFormData.aadharCardNo}
                      onChange={(e) => setEditFormData({ ...editFormData, aadharCardNo: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Highest Qualification</label>
                    <input
                      type="text"
                      value={editFormData.highestQualification}
                      onChange={(e) => setEditFormData({ ...editFormData, highestQualification: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Address */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">Contact & Address Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Mobile No</label>
                    <input
                      type="text"
                      value={editFormData.mobileNo}
                      onChange={(e) => setEditFormData({ ...editFormData, mobileNo: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Family Mobile No</label>
                    <input
                      type="text"
                      value={editFormData.familyMobileNo}
                      onChange={(e) => setEditFormData({ ...editFormData, familyMobileNo: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Personal Email</label>
                    <input
                      type="email"
                      value={editFormData.personalEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, personalEmail: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Current Address</label>
                    <textarea
                      value={editFormData.currentAddress}
                      onChange={(e) => setEditFormData({ ...editFormData, currentAddress: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Address as per Aadhar</label>
                    <textarea
                      value={editFormData.addressAsPerAadhar}
                      onChange={(e) => setEditFormData({ ...editFormData, addressAsPerAadhar: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Employment Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">Employment details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={editFormData.dateOfJoining}
                      onChange={(e) => setEditFormData({ ...editFormData, dateOfJoining: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Joining Place</label>
                    <input
                      type="text"
                      value={editFormData.joiningPlace}
                      onChange={(e) => setEditFormData({ ...editFormData, joiningPlace: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Department</label>
                    <input
                      type="text"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Designation</label>
                    <input
                      type="text"
                      value={editFormData.designation}
                      onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Salary</label>
                    <input
                      type="text"
                      value={editFormData.salary}
                      onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Past PF ID</label>
                    <input
                      type="text"
                      value={editFormData.pastPfId}
                      onChange={(e) => setEditFormData({ ...editFormData, pastPfId: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">ESIC No</label>
                    <input
                      type="text"
                      value={editFormData.esicNo}
                      onChange={(e) => setEditFormData({ ...editFormData, esicNo: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">References (Two Reference No)</label>
                    <input
                      type="text"
                      value={editFormData.twoReferenceNo}
                      onChange={(e) => setEditFormData({ ...editFormData, twoReferenceNo: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Bank Account Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">Bank Account Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Bank Account No</label>
                    <input
                      type="text"
                      value={editFormData.currentBankAcNo}
                      onChange={(e) => setEditFormData({ ...editFormData, currentBankAcNo: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={editFormData.ifscCode}
                      onChange={(e) => setEditFormData({ ...editFormData, ifscCode: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={editFormData.branchName}
                      onChange={(e) => setEditFormData({ ...editFormData, branchName: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Documents Upload */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">Documents Upload</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Row 1 */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Aadhar Card Document</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setEditFormData({ ...editFormData, aadharPhotoFile: e.target.files[0] })}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                    {editFormData.aadharPhotoUrl && (
                      <p className="mt-2 text-xs font-medium text-gray-500 truncate">
                        Current: <a href={editFormData.aadharPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">View Document</a>
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Profile Photo (Candidate Photo)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditFormData({ ...editFormData, candidatePhotoFile: e.target.files[0] })}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                    {editFormData.candidatePhotoUrl && (
                      <p className="mt-2 text-xs font-medium text-gray-500 truncate">
                        Current: <a href={editFormData.candidatePhotoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">View Photo</a>
                      </p>
                    )}
                  </div>

                  {/* Row 2 */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">PAN Card</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setEditFormData({ ...editFormData, panCardFile: e.target.files[0] })}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                    {editFormData.panCardUrl && (
                      <p className="mt-2 text-xs font-medium text-gray-500 truncate">
                        Current: <a href={editFormData.panCardUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">View PAN Card</a>
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Bank Passbook Photo</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setEditFormData({ ...editFormData, bankPassbookPhotoFile: e.target.files[0] })}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                    {editFormData.bankPassbookPhotoUrl && (
                      <p className="mt-2 text-xs font-medium text-gray-500 truncate">
                        Current: <a href={editFormData.bankPassbookPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">View Passbook</a>
                      </p>
                    )}
                  </div>

                  {/* Row 3 */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Qualification Photo</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setEditFormData({ ...editFormData, qualificationPhotoFile: e.target.files[0] })}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                    {editFormData.qualificationPhotoUrl && (
                      <p className="mt-2 text-xs font-medium text-gray-500 truncate">
                        Current: <a href={editFormData.qualificationPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">View Qualification</a>
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Salary Slip</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setEditFormData({ ...editFormData, salarySlipFile: e.target.files[0] })}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                    {editFormData.salarySlipUrl && (
                      <p className="mt-2 text-xs font-medium text-gray-500 truncate">
                        Current: <a href={editFormData.salarySlipUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">View Salary Slip</a>
                      </p>
                    )}
                  </div>

                  {/* Row 4 */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between md:col-span-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Resume Upload</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => setEditFormData({ ...editFormData, resumeUploadFile: e.target.files[0] })}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                    {editFormData.resumeUploadUrl && (
                      <p className="mt-2 text-xs font-medium text-gray-500 truncate">
                        Current: <a href={editFormData.resumeUploadUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">View Resume</a>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center min-w-[120px]"
                >
                  {updating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Full-Size DP / Image Lightbox Preview */}
      {imagePreview && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setImagePreview(null)}
        >
          {/* Top Actions */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            {(imagePreview.url || imagePreview.src) && (
              <a
                href={imagePreview.url || imagePreview.src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
              >
                <ExternalLink size={14} />
                <span>Open Original</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full backdrop-blur-md border border-white/20 shadow-lg transition-all cursor-pointer"
              aria-label="Close image preview"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image Container */}
          <div 
            className="max-w-4xl max-h-[85vh] p-2 bg-white/5 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getDriveImageUrl(imagePreview.url || imagePreview.src, 1200)}
              alt={imagePreview.title || imagePreview.alt || "Employee DP Full View"}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[78vh] rounded-2xl object-contain shadow-2xl bg-slate-900/40"
            />
            {(imagePreview.title || imagePreview.alt) && (
              <div className="mt-3 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-xs font-bold text-white tracking-wide">
                  {imagePreview.title || imagePreview.alt}
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {showPasswordModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Authentication Required</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Please enter the password to download the Excel file.</p>
            <input
              type="password"
              placeholder="Enter password..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeExportExcel()}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={executeExportExcel}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium"
              >
                Download
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Employee;
