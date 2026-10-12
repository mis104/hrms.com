import React, { useEffect, useState, useMemo, useRef } from "react";
import { 
    Search, 
    Clock, 
    CheckCircle2, 
    X, 
    Upload, 
    RefreshCw, 
    Sparkles, 
    Briefcase, 
    FileText, 
    ChevronDown, 
    Check, 
    Send, 
    User, 
    Phone, 
    Mail, 
    Building2, 
    CreditCard, 
    FileCheck, 
    ExternalLink,
    Shield,
    RotateCcw
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabaseClient";

// Searchable Filter Dropdown
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

// Helpers to bridge HTML date picker (YYYY-MM-DD) and database format (DD-MM-YYYY)
const toInputDateFormat = (val) => {
    if (!val) return "";
    val = String(val).trim();
    const m = val.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
        const d = String(m[1]).padStart(2, '0');
        const mo = String(m[2]).padStart(2, '0');
        const y = m[3];
        return `${y}-${mo}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return val;
};

const fromInputDateFormat = (val) => {
    if (!val) return "";
    val = String(val).trim();
    const m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
        const y = m[1];
        const mo = String(m[2]).padStart(2, '0');
        const d = String(m[3]).padStart(2, '0');
        return `${d}-${mo}-${y}`;
    }
    return val;
};

const Joining = () => {
    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [activeTab, setActiveTab] = useState("pending");
    const [tableLoading, setTableLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        employeeCode: "",
        candidateEnquiryNo: "",
        candidateName: "",
        nameAsPerAadhar: "",
        fatherName: "",
        dateOfJoining: "",
        joiningPlace: "",
        designation: "",
        salary: "",
        finalizedSalary: "",
        aadharFrontPhoto: "",
        panCard: "",
        candidatePhoto: "",
        currentAddress: "",
        addressAsPerAadhar: "",
        dobAsPerAadhar: "",
        gender: "Male",
        mobileNo: "",
        familyMobileNo: "",
        relationshipWithFamily: "",
        pastPfId: "",
        currentBankAcNo: "",
        ifscCode: "",
        branchName: "",
        bankPassbookPhoto: "",
        personalEmail: "",
        esicNo: "",
        highestQualification: "",
        aadharCardNo: "",
        qualificationPhoto: "",
        salarySlip: "",
        resumeUpload: ""
    });

    const fetchData = async () => {
        setTableLoading(true);
        try {
            // Fetch joining_fms
            const { data: joinData, error: joinErr } = await supabase
                .from("joining_fms")
                .select("*")
                .order("id", { ascending: false });

            if (joinErr) throw joinErr;

            const currentJoiningRows = joinData || [];

            const processed = currentJoiningRows.map(row => {
                const isDone = (row.update_link || "").trim().toUpperCase() === "DONE";
                return {
                    ...row,
                    isPending: !isDone,
                    isHistory: isDone
                };
            });

            setCandidateData(processed);
        } catch (error) {
            console.error("Joining Data Fetch Error:", error);
            toast.error("Failed to load joining records");
        } finally {
            setTableLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (candidate) => {
        setSelectedCandidate(candidate);
        setFormData({
            employeeCode: candidate.employee_code || "",
            candidateEnquiryNo: candidate.indent_no || "",
            candidateName: candidate.candidate_name || "",
            nameAsPerAadhar: candidate.name_as_per_aadhar || candidate.candidate_name || "",
            fatherName: candidate.father_name || "",
            dateOfJoining: toInputDateFormat(candidate.date_of_joining),
            joiningPlace: candidate.joining_place || "Plant",
            designation: candidate.designation || candidate.lookup_designation || "",
            salary: candidate.salary || candidate.finalized_salary || "",
            finalizedSalary: candidate.finalized_salary || "",
            aadharFrontPhoto: candidate.aadhar_frontside_photo || "",
            panCard: candidate.pan_card || "",
            candidatePhoto: candidate.candidate_photo || "",
            currentAddress: candidate.current_address || "",
            addressAsPerAadhar: candidate.address_as_per_aadhar_card || "",
            dobAsPerAadhar: toInputDateFormat(candidate.dob_as_per_aadhar),
            gender: candidate.gender || "Male",
            mobileNo: candidate.mobile_no || "",
            familyMobileNo: candidate.family_mobile_no || "",
            relationshipWithFamily: candidate.relationship_with_family_person || "",
            pastPfId: candidate.past_pf_id_no || "",
            currentBankAcNo: candidate.current_bank_ac_no || "",
            ifscCode: candidate.ifsc_code || "",
            branchName: candidate.branch_name || "",
            bankPassbookPhoto: candidate.photo_of_front_bank_passbook || "",
            personalEmail: candidate.personal_email_id || "",
            esicNo: candidate.esic_no || "",
            highestQualification: candidate.highest_qualification || "Graduation",
            aadharCardNo: candidate.aadhar_card_no || "",
            qualificationPhoto: candidate.qualification_photo || "",
            salarySlip: candidate.salary_slip || "",
            resumeUpload: candidate.resume_cv_upload || ""
        });
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (file, fieldName) => {
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
                setFormData(prev => ({ ...prev, [fieldName]: data.secure_url }));
                toast.success("Uploaded successfully!", { id: toastId });
            } else {
                console.error("Cloudinary error response:", data);
                throw new Error(data.error?.message || "Upload failed");
            }
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(`Upload failed: ${err.message || 'Please check file'}`, { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            const today = `${d}-${m}-${y}`;

            const dojFormatted = fromInputDateFormat(formData.dateOfJoining) || today;
            const dobFormatted = fromInputDateFormat(formData.dobAsPerAadhar);

            const updatePayload = {
                name_as_per_aadhar: formData.nameAsPerAadhar,
                father_name: formData.fatherName,
                date_of_joining: dojFormatted,
                joining_place: formData.joiningPlace,
                designation: formData.designation,
                salary: formData.salary,
                finalized_salary: formData.finalizedSalary || formData.salary,
                aadhar_frontside_photo: formData.aadharFrontPhoto,
                pan_card: formData.panCard,
                candidate_photo: formData.candidatePhoto,
                current_address: formData.currentAddress,
                address_as_per_aadhar_card: formData.addressAsPerAadhar,
                dob_as_per_aadhar: dobFormatted,
                gender: formData.gender,
                mobile_no: formData.mobileNo,
                family_mobile_no: formData.familyMobileNo,
                relationship_with_family_person: formData.relationshipWithFamily,
                past_pf_id_no: formData.pastPfId,
                current_bank_ac_no: formData.currentBankAcNo,
                ifsc_code: formData.ifscCode,
                branch_name: formData.branchName,
                photo_of_front_bank_passbook: formData.bankPassbookPhoto,
                personal_email_id: formData.personalEmail,
                esic_no: formData.esicNo,
                highest_qualification: formData.highestQualification,
                aadhar_card_no: formData.aadharCardNo,
                qualification_photo: formData.qualificationPhoto,
                salary_slip: formData.salarySlip,
                resume_cv_upload: formData.resumeUpload,
                update_link: "DONE",
                stage1_planned: selectedCandidate.stage1_planned || today,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from("joining_fms")
                .update(updatePayload)
                .eq("id", selectedCandidate.id);

            if (error) throw error;

            // Also mark stage4_actual in candidate_selection if matching candidate exists
            if (selectedCandidate.mobile_no || selectedCandidate.candidate_name) {
                try {
                    await supabase
                        .from("candidate_selection")
                        .update({
                            stage4_actual: today,
                            stage4_status: "Done",
                            updated_at: new Date().toISOString()
                        })
                        .or(`contact_no.eq.${selectedCandidate.mobile_no},name_of_candidate.eq.${selectedCandidate.candidate_name}`);
                } catch (e) {
                    console.warn("Could not sync stage4 to candidate_selection:", e);
                }
            }

            toast.success("Joining candidate details updated successfully in Joining FMS!");
            try {
                localStorage.removeItem("hrms_documents_folders_supabase_v1");
            } catch (e) {}
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to update joining details");
        } finally {
            setSubmitting(false);
        }
    };

    // Filtered data
    const filteredData = useMemo(() => {
        return candidateData.filter((item) => {
            const term = searchTerm.toLowerCase();
            const matchesTab = activeTab === "pending" ? item.isPending : item.isHistory;

            const matchesSearch = (
                (item.candidate_name || "").toLowerCase().includes(term) ||
                (item.employee_code || "").toLowerCase().includes(term) ||
                (item.indent_no || "").toLowerCase().includes(term) ||
                (item.designation || "").toLowerCase().includes(term) ||
                (item.joining_place || "").toLowerCase().includes(term) ||
                (item.mobile_no || "").toLowerCase().includes(term)
            );

            const matchesDept = !deptFilter || item.joining_place === deptFilter;
            const matchesDesig = !desigFilter || item.designation === desigFilter;

            return matchesTab && matchesSearch && matchesDept && matchesDesig;
        });
    }, [candidateData, searchTerm, activeTab, deptFilter, desigFilter]);

    const pendingCount = useMemo(() => candidateData.filter(i => i.isPending).length, [candidateData]);
    const historyCount = useMemo(() => candidateData.filter(i => i.isHistory).length, [candidateData]);
    const totalCount = candidateData.length;

    const departments = useMemo(() => [...new Set(candidateData.map(item => item.joining_place))].filter(Boolean).sort(), [candidateData]);
    const designations = useMemo(() => [...new Set(candidateData.map(item => item.designation))].filter(Boolean).sort(), [candidateData]);

    return (
        <div className="space-y-6 page-content p-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3 text-indigo-600" />
                            Onboarding Master
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 border border-purple-200/60 px-2.5 py-0.5 rounded-full">
                            HR-JOINING FMS
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                        Candidate Joining Details Form
                    </h1>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Fill candidate KYC, Aadhar, Bank Passbook, PF/ESIC and complete personal information before stage processing.
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

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Candidates</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">{tableLoading ? "..." : totalCount}</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Registered in Joining FMS</p>
                </div>

                <div 
                    onClick={() => setActiveTab("pending")}
                    className={`rounded-2xl p-5 border transition-all cursor-pointer ${
                        activeTab === "pending"
                            ? "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-300 shadow-md ring-2 ring-amber-400/20"
                            : "bg-white border-slate-200/80 hover:border-amber-200"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending KYC / Update</p>
                            <h3 className="text-2xl font-black text-amber-900 mt-1">{tableLoading ? "..." : pendingCount}</h3>
                        </div>
                        <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab("history")}
                    className={`rounded-2xl p-5 border transition-all cursor-pointer ${
                        activeTab === "history"
                            ? "bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-300 shadow-md ring-2 ring-indigo-400/20"
                            : "bg-white border-slate-200/80 hover:border-indigo-200"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Completed Profile</p>
                            <h3 className="text-2xl font-black text-indigo-900 mt-1">{tableLoading ? "..." : historyCount}</h3>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-indigo-600" />
                    </div>
                </div>
            </div>

            {/* Filter and Tab Section */}
            <div className="relative z-30 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3.5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start">
                        <button
                            type="button"
                            onClick={() => setActiveTab("pending")}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "pending" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Pending Details Form ({pendingCount})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("history")}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "history" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Completed KYC ({historyCount})</span>
                        </button>
                    </div>

                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by Employee Code, Name, Indent, Mobile..."
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 transition-all"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
                    <FilterDropdown label="Joining Place" options={departments} value={deptFilter} onChange={setDeptFilter} count={departments.length} allLabel="All Locations" icon={Building2} />
                    <FilterDropdown label="Designation" options={designations} value={desigFilter} onChange={setDesigFilter} count={designations.length} allLabel="All Designations" icon={Briefcase} />
                </div>
            </div>

            {/* Table */}
            <div className="relative z-10 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                                <th className="py-3 px-4">Action</th>
                                <th className="py-3 px-4">Emp Code</th>
                                <th className="py-3 px-4">Candidate Name</th>
                                <th className="py-3 px-4">Designation</th>
                                <th className="py-3 px-4">Joining Date</th>
                                <th className="py-3 px-4">Location</th>
                                <th className="py-3 px-4">Salary</th>
                                <th className="py-3 px-4">Aadhar / PAN</th>
                                <th className="py-3 px-4">Bank A/C</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableLoading ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                                        <p className="mt-2 text-xs font-medium">Loading Joining records...</p>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400 text-xs font-semibold">
                                        No candidates found
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((cand) => (
                                    <tr key={cand.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(cand)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
                                            >
                                                <User className="w-3.5 h-3.5" />
                                                <span>{cand.isHistory ? "Edit Details" : "Fill Details"}</span>
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap font-bold text-indigo-700">
                                            {cand.employee_code || "—"}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                                            {cand.candidate_name}
                                            {cand.mobile_no && <div className="text-[11px] text-slate-400 font-normal">{cand.mobile_no}</div>}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">{cand.designation || cand.lookup_designation}</td>
                                        <td className="py-3 px-4 whitespace-nowrap">{cand.date_of_joining || "—"}</td>
                                        <td className="py-3 px-4 whitespace-nowrap">{cand.joining_place || "—"}</td>
                                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700">₹ {cand.finalized_salary || cand.salary || "—"}</td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="text-[11px] font-mono text-slate-600">{cand.aadhar_card_no || "—"}</div>
                                            <div className="text-[10px] text-slate-400">{cand.pan_card ? "PAN Uploaded" : ""}</div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="text-[11px] font-mono text-slate-600">{cand.current_bank_ac_no || "—"}</div>
                                            <div className="text-[10px] text-slate-400">{cand.ifsc_code}</div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {cand.isHistory ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    KYC DONE
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    PENDING
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

            {/* Candidate Details Modal */}
            {showModal && selectedCandidate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
                        {/* Modal Header - Executive Midnight Gradient */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center font-black text-white text-base border border-indigo-400/30 shadow-inner">
                                    {(selectedCandidate.candidate_name || "C").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-full text-indigo-200">
                                            Joining FMS • Full KYC Form
                                        </span>
                                        <span className="text-[11px] font-mono font-black bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2.5 py-0.5 rounded-md shadow-xs">
                                            {selectedCandidate.employee_code || "PPPL/EI/--"}
                                        </span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-black mt-1 text-white tracking-tight flex items-center gap-2">
                                        {selectedCandidate.candidate_name}
                                        <span className="text-xs font-normal text-slate-300">
                                            • {selectedCandidate.designation || selectedCandidate.lookup_designation || "Position"} 
                                            {selectedCandidate.indent_no && ` (${selectedCandidate.indent_no})`}
                                        </span>
                                    </h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 rounded-full p-2 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body Form - Fully Scrollable */}
                        <form id="kycForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs bg-slate-50/60">
                            
                            {/* Section 1: Personal & Aadhar Identification */}
                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
                                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">1</div>
                                    <User className="w-4 h-4 text-indigo-600" />
                                    Personal & Aadhar Identification
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Name As Per Aadhar <span className="text-rose-500">*</span></label>
                                        <input type="text" name="nameAsPerAadhar" value={formData.nameAsPerAadhar} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium text-slate-800" required placeholder="Full name as on Aadhar" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Father's Name</label>
                                        <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" placeholder="Father's full name" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Date of Birth (Aadhar) <span className="text-rose-500">*</span></label>
                                        <input type="date" name="dobAsPerAadhar" value={formData.dobAsPerAadhar} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium text-slate-800 cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Aadhar Card Number</label>
                                        <input type="text" name="aadharCardNo" value={formData.aadharCardNo} onChange={handleInputChange} placeholder="12 Digit Aadhar Number" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Highest Qualification</label>
                                        <input type="text" name="highestQualification" value={formData.highestQualification} onChange={handleInputChange} placeholder="e.g. 10th, 12th, Graduate, B.Tech" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Contact & Residential Address */}
                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
                                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">2</div>
                                    <Phone className="w-4 h-4 text-indigo-600" />
                                    Contact & Residential Address
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Mobile Number <span className="text-rose-500">*</span></label>
                                        <input type="text" name="mobileNo" value={formData.mobileNo} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono text-slate-800" placeholder="10 digit mobile" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Family Mobile Number</label>
                                        <input type="text" name="familyMobileNo" value={formData.familyMobileNo} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono text-slate-800" placeholder="Emergency contact" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Relationship with Family Person</label>
                                        <input type="text" name="relationshipWithFamily" value={formData.relationshipWithFamily} onChange={handleInputChange} placeholder="e.g. Father, Mother, Spouse" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-slate-700 font-semibold mb-1">Personal Email ID</label>
                                        <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleInputChange} placeholder="candidate@gmail.com" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-slate-700 font-semibold mb-1">Current Residential Address</label>
                                        <textarea name="currentAddress" value={formData.currentAddress} onChange={handleInputChange} rows={2} placeholder="Current living address" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-slate-700 font-semibold mb-1">Permanent Address (as on Aadhar)</label>
                                        <textarea name="addressAsPerAadhar" value={formData.addressAsPerAadhar} onChange={handleInputChange} rows={2} placeholder="Permanent address on Aadhar card" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Joining & Compensation */}
                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
                                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">3</div>
                                    <Briefcase className="w-4 h-4 text-indigo-600" />
                                    Joining & Compensation Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Date of Joining <span className="text-rose-500">*</span></label>
                                        <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium text-slate-800 font-semibold cursor-pointer" required />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Joining Place / Location</label>
                                        <input type="text" name="joiningPlace" value={formData.joiningPlace} onChange={handleInputChange} placeholder="e.g. Plant, HO, Raipur" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Designation</label>
                                        <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} placeholder="Job designation" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800 font-semibold" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Finalized Salary (₹)</label>
                                        <input type="text" name="salary" value={formData.salary} onChange={handleInputChange} placeholder="e.g. 15000" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl font-bold text-indigo-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Bank Account & Statutory (PF / ESIC) */}
                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
                                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">4</div>
                                    <CreditCard className="w-4 h-4 text-indigo-600" />
                                    Bank Account & Statutory (PF / ESIC)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Current Bank Account Number</label>
                                        <input type="text" name="currentBankAcNo" value={formData.currentBankAcNo} onChange={handleInputChange} placeholder="Bank A/C number" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">IFSC Code</label>
                                        <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} placeholder="e.g. SBIN0001234" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl uppercase font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800 font-semibold" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Branch Name</label>
                                        <input type="text" name="branchName" value={formData.branchName} onChange={handleInputChange} placeholder="Branch location" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">Past PF ID (If Any)</label>
                                        <input type="text" name="pastPfId" value={formData.pastPfId} onChange={handleInputChange} placeholder="Previous UAN / PF ID or NA" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-700 font-semibold mb-1">ESIC Number (If Any)</label>
                                        <input type="text" name="esicNo" value={formData.esicNo} onChange={handleInputChange} placeholder="ESIC IP Number or NA" className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-800" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: KYC Document & Photo Uploads */}
                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
                                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">5</div>
                                    <FileCheck className="w-4 h-4 text-indigo-600" />
                                    KYC Documents & Verification Uploads
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all">
                                        <label className="block text-slate-700 font-bold mb-1.5 text-[11px]">Aadhar Photo (Front)</label>
                                        <input type="file" onChange={(e) => handleFileUpload(e.target.files[0], "aadharFrontPhoto")} className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-indigo-950" />
                                        {formData.aadharFrontPhoto && <a href={formData.aadharFrontPhoto} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-2 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Uploaded File</a>}
                                    </div>

                                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all">
                                        <label className="block text-slate-700 font-bold mb-1.5 text-[11px]">PAN Card Photo</label>
                                        <input type="file" onChange={(e) => handleFileUpload(e.target.files[0], "panCard")} className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-indigo-950" />
                                        {formData.panCard && <a href={formData.panCard} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-2 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Uploaded File</a>}
                                    </div>

                                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all">
                                        <label className="block text-slate-700 font-bold mb-1.5 text-[11px]">Candidate Photo (DP / Passport)</label>
                                        <input type="file" onChange={(e) => handleFileUpload(e.target.files[0], "candidatePhoto")} className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-indigo-950" />
                                        {formData.candidatePhoto && <a href={formData.candidatePhoto} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-2 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Uploaded File</a>}
                                    </div>

                                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all">
                                        <label className="block text-slate-700 font-bold mb-1.5 text-[11px]">Bank Passbook / Cheque</label>
                                        <input type="file" onChange={(e) => handleFileUpload(e.target.files[0], "bankPassbookPhoto")} className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-indigo-950" />
                                        {formData.bankPassbookPhoto && <a href={formData.bankPassbookPhoto} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-2 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Uploaded File</a>}
                                    </div>

                                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all">
                                        <label className="block text-slate-700 font-bold mb-1.5 text-[11px]">Qualification / Degree Photo</label>
                                        <input type="file" onChange={(e) => handleFileUpload(e.target.files[0], "qualificationPhoto")} className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-indigo-950" />
                                        {formData.qualificationPhoto && <a href={formData.qualificationPhoto} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-2 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Uploaded File</a>}
                                    </div>

                                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all">
                                        <label className="block text-slate-700 font-bold mb-1.5 text-[11px]">Salary Slip (Previous Job)</label>
                                        <input type="file" onChange={(e) => handleFileUpload(e.target.files[0], "salarySlip")} className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-indigo-950" />
                                        {formData.salarySlip && <a href={formData.salarySlip} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-2 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Uploaded File</a>}
                                    </div>

                                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all">
                                        <label className="block text-slate-700 font-bold mb-1.5 text-[11px]">Resume / CV Upload</label>
                                        <input type="file" onChange={(e) => handleFileUpload(e.target.files[0], "resumeUpload")} className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-indigo-950" />
                                        {formData.resumeUpload && <a href={formData.resumeUpload} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-2 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Uploaded File</a>}
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Modal Footer - Fixed at Bottom with Premium Styling */}
                        <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                            <p className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Saving will mark KYC as <strong className="text-emerald-700 font-bold">DONE</strong> and advance candidate to Step 1.
                            </p>
                            <div className="flex items-center gap-3 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="kycForm"
                                    disabled={submitting || uploading}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-black hover:via-indigo-900 hover:to-black text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95 text-xs border border-white/10"
                                >
                                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-indigo-300" />}
                                    <span>Save & Update Full KYC</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Joining;
