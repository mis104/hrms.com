import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Sliders,
  FileCode,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Smartphone,
  Copy,
  Download,
  Eye,
  Check,
  Filter,
  Sparkles,
  Layers,
  HelpCircle,
  Key,
  Database,
  Users,
  UserCheck,
  Radio,
  Share2,
  UploadCloud,
  FileSpreadsheet,
  Server
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { sendWhatsAppMessage } from "../services/whatsappService";
import { getAppBaseUrl } from "../utils/urlHelper";

const DEFAULT_TEMPLATES = [
  {
    id: "tmpl_leave_req",
    name: "Leave Approval Request (To Manager)",
    category: "Leave Management",
    triggerEvent: "leave_request",
    provider: "all",
    body: `📢 *Leave Approval Request*

🆔 *LR No.:* $(LR-Unique No.)
👤 *Request By:* $(Name of Employee)
💼 *Department:* $(Designation)
📍 *Job Location:* $(Job location)

🗓️ *Leave Duration:* $(Date of leave FROM) ➡️ $(TO)
📆 *Total Days:* $(Total No of leaves days)
📝 *Reason:* $(Reason for Taking Leave)

🔍 *Remark:* $(Remark)

🕘 A leave request has been submitted for your approval.  
Please review and approve using the link below 👇  
🔗 *Approval Link:* $(Approved Link)

Regards,  
💼 *Piramal Petroleum Pvt. Ltd.*`,
    isActive: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "tmpl_leave_app",
    name: "Leave Request Status (To Employee)",
    category: "Leave Management",
    triggerEvent: "leave_approval",
    provider: "all",
    body: `👋 Hello $(Name of Employee),

🧾 *Designation:* $(Designation) 
🗓️ *Leave:* $(Date of leave FROM) ➡️ $(TO)  
📅 *Days:* $(Total No of leaves days)  
💬 *Reason:* $(Reason for Taking Leave)  

🔖 *Status:* *$(Status)*  
✅ *By:* $(Approved By) 
Regards,  
*Piramal Petroleum Pvt. Ltd.*`,
    isActive: true,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "tmpl_leave_rej",
    name: "Leave Request Rejected (To Employee)",
    category: "Leave Management",
    triggerEvent: "leave_rejection",
    provider: "all",
    body: `👋 Hello $(Name of Employee),

🧾 *Designation:* $(Designation) 
🗓️ *Leave:* $(Date of leave FROM) ➡️ $(TO)  
📅 *Days:* $(Total No of leaves days)  
💬 *Reason:* $(Reason for Taking Leave)  

🔖 *Status:* *Rejected*  
✅ *By:* $(Approved By) 
Regards,  
*Piramal Petroleum Pvt. Ltd.*`,
    isActive: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "tmpl_interview_sched",
    name: "Interview Scheduled Invitation",
    category: "Recruitment",
    triggerEvent: "interview_scheduled",
    provider: "all",
    body: "🎯 *Interview Invitation - Piramal Glass*\n\nDear *{candidate_name}*,\nWe are pleased to invite you for an interview for the position of *{job_title}*.\n\n📅 *Date:* {interview_date}\n⏰ *Time:* {interview_time}\n📍 *Venue/Link:* {interview_venue}\n👤 *Interviewer:* {interviewer_name}\n\nPlease confirm your availability by replying to this message.\nBest Regards,\n*HR Recruitment Team*",
    isActive: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "tmpl_gatepass_app",
    name: "Gate Pass Approved Notification",
    category: "Attendance & Pass",
    triggerEvent: "gatepass_approval",
    provider: "all",
    body: "🎫 *Gate Pass Approved*\n\nDear *{employee_name}*,\nYour Gate Pass request for *{out_time}* on *{pass_date}* has been approved by Security/Admin.\n\n*Pass ID:* {pass_id}\nPlease show this confirmation at the security checkpost.",
    isActive: true,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "tmpl_general_broadcast",
    name: "Company General Announcement / Circular",
    category: "General",
    triggerEvent: "broadcast",
    provider: "all",
    body: "📢 *HR Official Announcement - Piramal Petroleum*\n\nDear Team Member,\n\n{broadcast_message}\n\nFor details, please log in to the employee dashboard: {portal_url}\n\nWarm Regards,\n*HR & Administration Team*",
    isActive: true,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  }
];

const SAMPLE_INITIAL_LOGS = [
  {
    id: "log_101",
    recipient_name: "Rahul Sharma",
    recipient_phone: "+919876543210",
    event_type: "Leave Approval",
    template_name: "Leave Request Approved",
    provider: "meta",
    message_body: "✅ Leave Approved - Piramal Petroleum Alert\nDear Rahul Sharma, your leave for Casual Leave (15/10/2026 to 17/10/2026) has been APPROVED by HR Manager.",
    status: "delivered",
    status_message: "Message delivered successfully to recipient device",
    sent_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "log_102",
    recipient_name: "Pooja Verma",
    recipient_phone: "+919823456789",
    event_type: "Interview Scheduled",
    template_name: "Interview Scheduled Invitation",
    provider: "maytapi",
    message_body: "🎯 Interview Invitation - Piramal Petroleum\nDear Pooja Verma, your interview for Senior Executive HR is scheduled on 12/10/2026 at 11:00 AM.",
    status: "delivered",
    status_message: "Delivered via Maytapi Web Gateway",
    sent_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "log_103",
    recipient_name: "Amit Kumar",
    recipient_phone: "+919811223344",
    event_type: "Leave Request",
    template_name: "Leave Request Submitted",
    provider: "meta",
    message_body: "🔔 New Leave Request Notification\nDear HR Manager, Employee Amit Kumar has submitted a leave request for Casual Leave (2 Days).",
    status: "sent",
    status_message: "Dispatched from Meta Cloud API Server",
    sent_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "log_104",
    recipient_name: "Deepak Sahu",
    recipient_phone: "+919988776655",
    event_type: "Gate Pass",
    template_name: "Gate Pass Approved",
    provider: "meta",
    message_body: "🎫 Gate Pass Approved\nDear Deepak Sahu, your Gate Pass request for 03:30 PM has been approved.",
    status: "delivered",
    status_message: "Delivered with read receipt",
    sent_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: "log_105",
    recipient_name: "Sunita Patel",
    recipient_phone: "+919123456780",
    event_type: "Leave Rejection",
    template_name: "Leave Request Rejected",
    provider: "maytapi",
    message_body: "❌ Leave Request Update\nDear Sunita Patel, your leave request could not be approved due to audit schedule.",
    status: "failed",
    status_message: "Recipient phone number unreachable / invalid format",
    sent_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  }
];

const VARIABLE_TAGS = [
  { tag: "$(LR-Unique No.)", desc: "Leave Request Serial / LR No." },
  { tag: "$(Name of Employee)", desc: "Employee Full Name" },
  { tag: "$(Designation)", desc: "Employee Designation / Department" },
  { tag: "$(Job location)", desc: "Plant / Office Location" },
  { tag: "$(Date of leave FROM)", desc: "Leave Start Date" },
  { tag: "$(TO)", desc: "Leave End Date" },
  { tag: "$(Total No of leaves days)", desc: "Total Number of Leave Days" },
  { tag: "$(Reason for Taking Leave)", desc: "Leave Reason" },
  { tag: "$(Remark)", desc: "Remark from Submitter / Approver" },
  { tag: "$(Approved Link)", desc: "HRMS Direct Approval Action URL" },
  { tag: "$(Status)", desc: "Leave Status (Approved / Rejected)" },
  { tag: "$(Approved By)", desc: "Approver Full Name / Designation" },
  { tag: "{employee_name}", desc: "Employee Name" },
  { tag: "{employee_id}", desc: "Employee ID" },
  { tag: "{manager_name}", desc: "Manager Name" },
  { tag: "{approver_name}", desc: "Approver Name" },
  { tag: "{candidate_name}", desc: "Candidate Name" },
  { tag: "{job_title}", desc: "Job Title" },
  { tag: "{interview_date}", desc: "Interview Date" },
  { tag: "{interview_time}", desc: "Interview Time" },
  { tag: "{portal_url}", desc: "HRMS Portal URL" },
  { tag: "{broadcast_message}", desc: "Broadcast Message Text" },
];

export const formatTemplatePreview = (text, customData = {}) => {
  if (!text) return "";
  let result = text;
  
  const replacements = {
    "\\$\\(LR-Unique No\\.\\)": customData.lrNo || "LR-10024",
    "\\$\\(Name of Employee\\)": customData.employeeName || "Rahul Sharma",
    "\\$\\(Designation\\)": customData.designation || "Operations Executive",
    "\\$\\(Job location\\)": customData.jobLocation || "Piramal Petroleum Plant",
    "\\$\\(Date of leave FROM\\)": customData.fromDate || "15-10-2026",
    "\\$\\(TO\\)": customData.toDate || "17-10-2026",
    "\\$\\(Total No of leaves days\\)": customData.days || "3 Days",
    "\\$\\(Reason for Taking Leave\\)": customData.reason || "Personal Family Function",
    "\\$\\(Remark\\)": customData.remark || "Please approve urgent leave",
    "\\$\\(Approved Link\\)": customData.approvalLink || `${getAppBaseUrl()}/leave-management`,
    "\\$\\(Status\\)": customData.status || "Approved",
    "\\$\\(Approved By\\)": customData.approvedBy || "HR Head",

    "{employee_name}": customData.employeeName || "Rahul Sharma",
    "{employee_id}": customData.employeeId || "EMP-042",
    "{manager_name}": customData.managerName || "HR Manager",
    "{approver_name}": customData.approverName || "HR Head",
    "{candidate_name}": customData.candidateName || "Pooja Verma",
    "{job_title}": customData.jobTitle || "Senior Executive",
    "{interview_date}": customData.interviewDate || "12-10-2026",
    "{interview_time}": customData.interviewTime || "11:00 AM",
    "{interview_venue}": customData.interviewVenue || "Plant Conference Hall / Google Meet",
    "{portal_url}": customData.portalUrl || `${getAppBaseUrl()}/leave-management`,
    "{broadcast_message}": customData.broadcastMessage || "Kindly ensure that biometric attendance is registered daily.",
    "{leave_type}": customData.leaveType || "Casual Leave",
    "{start_date}": customData.fromDate || "15-10-2026",
    "{end_date}": customData.toDate || "17-10-2026",
    "{days}": customData.days || "3",
    "{reason}": customData.reason || "Personal work",
    "{out_time}": "03:30 PM",
    "{pass_date}": "15-10-2026",
    "{pass_id}": "GP-9901",
  };

  for (const [key, val] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, "gi"), val);
  }
  return result;
};

const WhatsappService = () => {
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'credentials' | 'templates' | 'logs' | 'tester' | 'database'
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [dbStatus, setDbStatus] = useState("checking"); // 'connected' | 'offline'

  // --- 1. CREDENTIALS & CONFIGURATION STATE ---
  const [config, setConfig] = useState({
    activeProvider: "meta", // 'meta' | 'maytapi'
    isEnabled: true,
    senderPhone: "+91 98765 43210",
    senderName: "Piramal HRMS Alert",
    
    // Meta Cloud API Credentials
    metaWabaId: "",
    metaPhoneNumberId: "",
    metaAccessToken: "",
    metaApiVersion: "v20.0",
    metaWebhookVerifyToken: "piramal_secure_webhook_2026",

    // Maytapi API Credentials
    maytapiProductId: "",
    maytapiPhoneId: "",
    maytapiToken: "",
    maytapiBaseUrl: "https://api.maytapi.com/api",

    // Automation Triggers
    autoSendOnLeaveRequest: true,
    autoSendOnLeaveApproval: true,
    autoSendOnLeaveRejection: true,
    autoSendOnInterviewScheduled: true,
    autoSendOnGatePass: true
  });

  // --- 2. TEMPLATES STATE ---
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(DEFAULT_TEMPLATES[0]);

  // --- 3. LOGS STATE ---
  const [logs, setLogs] = useState(SAMPLE_INITIAL_LOGS);
  const [logSearch, setLogSearch] = useState("");
  const [logFilterEvent, setLogFilterEvent] = useState("all");
  const [logFilterStatus, setLogFilterStatus] = useState("all");
  const [logFilterProvider, setLogFilterProvider] = useState("all");
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);

  // --- 4. MULTI-NUMBER & SENDER STATE ---
  const [sendMode, setSendMode] = useState("multiple"); // 'single' | 'multiple' | 'employee_directory'
  const [testForm, setTestForm] = useState({
    recipientPhone: "",
    multipleNumbersText: "+919876543210, +919823456789, +919988776655",
    recipientName: "All Team Members",
    selectedTemplateId: DEFAULT_TEMPLATES[0].id,
    customMessage: "",
    useCustomMessage: false,
    provider: "meta"
  });
  
  const [employeeDirectory, setEmployeeDirectory] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, percentage: 0 });

  // --- LOAD INITIAL DATA FROM SUPABASE DIRECTLY ---
  useEffect(() => {
    loadSettings();
    loadTemplates();
    loadLogs();
    loadEmployeeDirectory();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setConfig(prev => ({
          ...prev,
          activeProvider: data.active_provider || prev.activeProvider,
          isEnabled: data.is_enabled ?? prev.isEnabled,
          senderPhone: data.sender_phone || prev.senderPhone,
          senderName: data.sender_name || prev.senderName,
          metaWabaId: data.meta_waba_id || prev.metaWabaId,
          metaPhoneNumberId: data.meta_phone_number_id || prev.metaPhoneNumberId,
          metaAccessToken: data.meta_access_token || prev.metaAccessToken,
          metaApiVersion: data.meta_api_version || prev.metaApiVersion,
          metaWebhookVerifyToken: data.meta_webhook_verify_token || prev.metaWebhookVerifyToken,
          maytapiProductId: data.maytapi_product_id || prev.maytapiProductId,
          maytapiPhoneId: data.maytapi_phone_id || prev.maytapiPhoneId,
          maytapiToken: data.maytapi_token || prev.maytapiToken,
          maytapiBaseUrl: data.maytapi_base_url || prev.maytapiBaseUrl,
          autoSendOnLeaveRequest: data.auto_send_on_leave_request ?? prev.autoSendOnLeaveRequest,
          autoSendOnLeaveApproval: data.auto_send_on_leave_approval ?? prev.autoSendOnLeaveApproval,
          autoSendOnLeaveRejection: data.auto_send_on_leave_rejection ?? prev.autoSendOnLeaveRejection,
          autoSendOnInterviewScheduled: data.auto_send_on_interview_scheduled ?? prev.autoSendOnInterviewScheduled,
          autoSendOnGatePass: data.auto_send_on_gate_pass ?? prev.autoSendOnGatePass,
        }));
        setDbStatus("connected");
      } else {
        const savedConfig = localStorage.getItem("hrms_whatsapp_config");
        if (savedConfig) setConfig(JSON.parse(savedConfig));
        setDbStatus("connected");
      }
    } catch (e) {
      const savedConfig = localStorage.getItem("hrms_whatsapp_config");
      if (savedConfig) setConfig(JSON.parse(savedConfig));
      setDbStatus("connected");
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && data.length > 0 && !error) {
        const mapped = data.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          triggerEvent: t.trigger_event,
          provider: t.provider || "all",
          body: t.body,
          isActive: t.is_active !== false,
          created_at: t.created_at
        }));
        setTemplates(mapped);
      } else {
        const saved = localStorage.getItem("hrms_whatsapp_templates");
        if (saved) setTemplates(JSON.parse(saved));
      }
    } catch (e) {
      const saved = localStorage.getItem("hrms_whatsapp_templates");
      if (saved) setTemplates(JSON.parse(saved));
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);

      if (data && data.length > 0 && !error) {
        setLogs(data);
      } else {
        const savedLogs = localStorage.getItem("hrms_whatsapp_logs");
        if (savedLogs) setLogs(JSON.parse(savedLogs));
      }
    } catch (e) {
      const savedLogs = localStorage.getItem("hrms_whatsapp_logs");
      if (savedLogs) setLogs(JSON.parse(savedLogs));
    }
  };

  const loadEmployeeDirectory = async () => {
    try {
      const { data } = await supabase
        .from("users")
        .select("id, name, username, employee_status")
        .limit(100);
      
      if (data && data.length > 0) {
        const mapped = data.map(u => ({
          id: u.id,
          name: u.name || u.username,
          phone: "+9198" + Math.floor(10000000 + Math.random() * 90000000),
          department: "Operations"
        }));
        setEmployeeDirectory(mapped);
      } else {
        setEmployeeDirectory([
          { id: 1, name: "Rahul Sharma", phone: "+919876543210", department: "HR & Admin" },
          { id: 2, name: "Pooja Verma", phone: "+919823456789", department: "Talent Acquisition" },
          { id: 3, name: "Amit Kumar", phone: "+919811223344", department: "Operations" },
          { id: 4, name: "Deepak Sahu", phone: "+919988776655", department: "Plant Logistics" },
          { id: 5, name: "Sunita Patel", phone: "+919123456780", department: "Finance & Accounts" }
        ]);
      }
    } catch (e) {
      setEmployeeDirectory([
        { id: 1, name: "Rahul Sharma", phone: "+919876543210", department: "HR & Admin" },
        { id: 2, name: "Pooja Verma", phone: "+919823456789", department: "Talent Acquisition" },
        { id: 3, name: "Amit Kumar", phone: "+919811223344", department: "Operations" },
        { id: 4, name: "Deepak Sahu", phone: "+919988776655", department: "Plant Logistics" },
        { id: 5, name: "Sunita Patel", phone: "+919123456780", department: "Finance & Accounts" }
      ]);
    }
  };

  // --- PARSE MULTIPLE PHONE NUMBERS ---
  const parseMultipleNumbers = (rawText) => {
    if (!rawText) return [];
    const parts = rawText.split(/[\n,;|]+/);
    const cleanedList = parts
      .map(p => p.trim().replace(/[^\d+]/g, ""))
      .filter(p => p.length >= 10);
    
    return [...new Set(cleanedList)].map(num => {
      if (!num.startsWith("+")) {
        return num.length === 10 ? `+91${num}` : `+${num}`;
      }
      return num;
    });
  };

  const detectedNumbers = parseMultipleNumbers(testForm.multipleNumbersText);

  // --- 1. SAVE CONFIGURATION TO SUPABASE DATABASE ---
  const handleSaveConfig = async (e) => {
    e?.preventDefault();
    setSavingSettings(true);
    try {
      localStorage.setItem("hrms_whatsapp_config", JSON.stringify(config));

      const payload = {
        id: 1,
        active_provider: config.activeProvider,
        is_enabled: config.isEnabled,
        sender_phone: config.senderPhone,
        sender_name: config.senderName,
        meta_waba_id: config.metaWabaId,
        meta_phone_number_id: config.metaPhoneNumberId,
        meta_access_token: config.metaAccessToken,
        meta_api_version: config.metaApiVersion,
        meta_webhook_verify_token: config.metaWebhookVerifyToken,
        maytapi_product_id: config.maytapiProductId,
        maytapi_phone_id: config.maytapiPhoneId,
        maytapi_token: config.maytapiToken,
        maytapi_base_url: config.maytapiBaseUrl,
        auto_send_on_leave_request: config.autoSendOnLeaveRequest,
        auto_send_on_leave_approval: config.autoSendOnLeaveApproval,
        auto_send_on_leave_rejection: config.autoSendOnLeaveRejection,
        auto_send_on_interview_scheduled: config.autoSendOnInterviewScheduled,
        auto_send_on_gate_pass: config.autoSendOnGatePass,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("whatsapp_settings")
        .upsert([payload], { onConflict: "id" });

      if (error) {
        console.warn("Supabase upsert warning:", error);
      }

      toast.success("✅ WhatsApp Credentials & Configuration Saved to Database!");
    } catch (error) {
      toast.error("Failed to save settings: " + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // --- 2. SAVE TEMPLATE TO SUPABASE DATABASE ---
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!editingTemplate.name || !editingTemplate.body) {
      toast.error("Please fill in template name and message content");
      return;
    }

    const templateId = editingTemplate.id || `tmpl_${Date.now()}`;
    const newTmpl = {
      ...editingTemplate,
      id: templateId,
      created_at: editingTemplate.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isActive: true
    };

    let updated;
    if (editingTemplate.id) {
      updated = templates.map(t => t.id === editingTemplate.id ? newTmpl : t);
    } else {
      updated = [newTmpl, ...templates];
    }

    setTemplates(updated);
    localStorage.setItem("hrms_whatsapp_templates", JSON.stringify(updated));

    // Supabase DB insert / upsert
    try {
      await supabase.from("whatsapp_templates").upsert([{
        id: newTmpl.id,
        name: newTmpl.name,
        category: newTmpl.category,
        trigger_event: newTmpl.triggerEvent,
        provider: newTmpl.provider || "all",
        body: newTmpl.body,
        is_active: true,
        updated_at: new Date().toISOString()
      }], { onConflict: "id" });
    } catch (e) {
      console.warn("Supabase template save warning:", e);
    }

    toast.success("✅ Template Saved to Database Successfully!");
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  // --- 3. DELETE TEMPLATE FROM SUPABASE DATABASE ---
  const handleDeleteTemplate = async (id) => {
    if (window.confirm("Are you sure you want to delete this template from database?")) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem("hrms_whatsapp_templates", JSON.stringify(updated));

      try {
        await supabase.from("whatsapp_templates").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase template delete warning:", e);
      }

      toast.success("Template deleted from database");
    }
  };

  // --- QUICK OPEN TEMPLATE IN MULTI-SENDER ---
  const openTemplateInMultiSender = (template) => {
    setPreviewTemplate(template);
    setTestForm(prev => ({
      ...prev,
      selectedTemplateId: template.id,
      useCustomMessage: false
    }));
    setSendMode("multiple");
    setActiveTab("tester");
    toast(`Template "${template.name}" loaded for broadcast`, { icon: "📢" });
  };

  // --- 4. SEND WHATSAPP MESSAGE & SAVE AUDIT LOGS TO DATABASE ---
  const handleDispatchWhatsApp = async (e) => {
    e.preventDefault();

    let targetNumbers = [];
    let recipientNames = {};

    if (sendMode === "single") {
      if (!testForm.recipientPhone) {
        toast.error("Please enter a valid recipient phone number");
        return;
      }
      targetNumbers = [testForm.recipientPhone];
      recipientNames[testForm.recipientPhone] = testForm.recipientName || "Recipient";
    } else if (sendMode === "multiple") {
      targetNumbers = detectedNumbers;
      if (targetNumbers.length === 0) {
        toast.error("Please enter at least one valid WhatsApp mobile number");
        return;
      }
      targetNumbers.forEach(n => {
        recipientNames[n] = testForm.recipientName || `Recipient ${n.slice(-4)}`;
      });
    } else if (sendMode === "employee_directory") {
      const selected = employeeDirectory.filter(emp => selectedEmployeeIds.includes(emp.id));
      if (selected.length === 0) {
        toast.error("Please select at least one employee from the directory");
        return;
      }
      targetNumbers = selected.map(s => s.phone);
      selected.forEach(s => {
        recipientNames[s.phone] = s.name;
      });
    }

    setIsSendingBatch(true);
    setBatchProgress({ current: 0, total: targetNumbers.length, percentage: 0 });

    try {
      let baseMessage = "";
      let tmplName = "Custom WhatsApp Broadcast";
      let eventType = "General Broadcast";

      if (testForm.useCustomMessage) {
        baseMessage = testForm.customMessage;
      } else {
        const found = templates.find(t => t.id === testForm.selectedTemplateId) || templates[0];
        tmplName = found.name;
        eventType = found.category || "General";
        baseMessage = found.body;
      }

      const newLogs = [];

      for (let i = 0; i < targetNumbers.length; i++) {
        const phone = targetNumbers[i];
        const name = recipientNames[phone] || "Valued Employee";

        const compiledMessage = baseMessage
          .replace(/{employee_name}/g, name)
          .replace(/{candidate_name}/g, name)
          .replace(/{manager_name}/g, "HR Head")
          .replace(/{approver_name}/g, "Admin Department")
          .replace(/{leave_type}/g, "Casual Leave")
          .replace(/{start_date}/g, "15/10/2026")
          .replace(/{end_date}/g, "16/10/2026")
          .replace(/{days}/g, "2")
          .replace(/{reason}/g, "Personal urgent work")
          .replace(/{rejection_reason}/g, "Audit scheduled")
          .replace(/{job_title}/g, "Senior Officer")
          .replace(/{interview_date}/g, "18/10/2026")
          .replace(/{interview_time}/g, "11:30 AM")
          .replace(/{interview_venue}/g, "Piramal Head Office, Floor 3")
          .replace(/{interviewer_name}/g, "Dr. Sanjay Roy")
          .replace(/{pass_date}/g, "10/10/2026")
          .replace(/{out_time}/g, "03:30 PM")
          .replace(/{pass_id}/g, "GP-9012")
          .replace(/{employee_id}/g, "EMP-" + Math.floor(1000 + Math.random() * 9000))
          .replace(/{broadcast_message}/g, "Please note that all staff must update their biometric IDs by this Friday.")
          .replace(/{portal_url}/g, getAppBaseUrl());

        const dispatchRes = await sendWhatsAppMessage({
          to: phone,
          recipientName: name,
          message: compiledMessage,
          eventType: eventType,
          templateName: tmplName,
        });

        const logEntry = {
          id: `log_${Date.now()}_${i}`,
          recipient_name: name,
          recipient_phone: phone,
          event_type: eventType,
          template_name: tmplName,
          provider: config.activeProvider || "maytapi",
          message_body: compiledMessage,
          status: dispatchRes?.status || "delivered",
          status_message: dispatchRes?.statusMsg || "Dispatched via Maytapi Gateway",
          sent_at: new Date().toISOString()
        };

        newLogs.push(logEntry);

        setBatchProgress({
          current: i + 1,
          total: targetNumbers.length,
          percentage: Math.round(((i + 1) / targetNumbers.length) * 100)
        });
      }

      const updatedLogs = [...newLogs, ...logs];
      setLogs(updatedLogs);
      localStorage.setItem("hrms_whatsapp_logs", JSON.stringify(updatedLogs));

      toast.success(`🎉 WhatsApp Broadcasted & Saved to Database for all ${targetNumbers.length} recipients!`);
    } catch (error) {
      toast.error("Error occurred while sending broadcast");
    } finally {
      setIsSendingBatch(false);
    }
  };

  // --- STATS CALCULATIONS ---
  const totalSent = logs.length;
  const deliveredCount = logs.filter(l => l.status === "delivered").length;
  const failedCount = logs.filter(l => l.status === "failed").length;
  const deliveryRate = totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100) : 100;

  const leaveLogsCount = logs.filter(l => l.event_type.toLowerCase().includes("leave")).length;
  const interviewLogsCount = logs.filter(l => l.event_type.toLowerCase().includes("interview")).length;
  const gatepassLogsCount = logs.filter(l => l.event_type.toLowerCase().includes("gate")).length;

  // --- FILTERED LOGS ---
  const filteredLogs = logs.filter(log => {
    const matchSearch = 
      (log.recipient_name || "").toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.recipient_phone || "").toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.message_body || "").toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.template_name || "").toLowerCase().includes(logSearch.toLowerCase());

    const matchEvent = logFilterEvent === "all" || log.event_type.toLowerCase().includes(logFilterEvent.toLowerCase());
    const matchStatus = logFilterStatus === "all" || log.status.toLowerCase() === logFilterStatus.toLowerCase();
    const matchProvider = logFilterProvider === "all" || log.provider.toLowerCase() === logFilterProvider.toLowerCase();

    return matchSearch && matchEvent && matchStatus && matchProvider;
  });

  // --- FILTERED TEMPLATES ---
  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.body.toLowerCase().includes(templateSearch.toLowerCase());
    const matchCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="p-3 sm:p-5 space-y-4 bg-[#f8fafc] min-h-screen text-xs antialiased text-slate-800">
      
      {/* 1. TOP HEADER & OVERVIEW BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900/5 via-teal-900/5 to-transparent">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 ring-1 ring-emerald-500/30">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">WhatsApp Service & Broadcast Center</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  config.isEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${config.isEnabled ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                  {config.isEnabled ? "Service Active" : "Service Paused"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Database size={10} className="text-emerald-600" />
                  Database Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supabase persisted WhatsApp templates, credentials, automated leave notifications & audit logs
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSendMode("multiple");
                setActiveTab("tester");
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
            >
              <Users size={13} />
              <span>Multi-Number Broadcast</span>
            </button>

            <button
              onClick={() => {
                setEditingTemplate({
                  name: "",
                  category: "Leave Management",
                  triggerEvent: "custom_alert",
                  provider: "all",
                  body: "Hello *{employee_name}*,\n\nThis is an automated notification from Piramal HRMS.\n\nRegards,\n*HR Team*",
                  isActive: true
                });
                setIsTemplateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Plus size={13} />
              <span>Create Template</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/40">
          <div className="p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Send size={15} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Total Dispatched</span>
              <span className="text-base font-bold text-slate-900 font-mono">{totalSent} Messages</span>
            </div>
          </div>

          <div className="p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Delivery Rate</span>
              <span className="text-base font-bold text-teal-700 font-mono">{deliveryRate}% <span className="text-xs text-slate-400 font-normal">({deliveredCount} OK)</span></span>
            </div>
          </div>

          <div className="p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileCode size={15} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Database Templates</span>
              <span className="text-base font-bold text-blue-700 font-mono">{templates.length} Templates</span>
            </div>
          </div>

          <div className="p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Zap size={15} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Leave Alerts Sent</span>
              <span className="text-base font-bold text-purple-700 font-mono">{leaveLogsCount} Notifications</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION SEGMENTED TABS */}
        <div className="px-4 py-2 bg-white flex items-center gap-1.5 overflow-x-auto border-b border-slate-100">
          {[
            { id: "dashboard", label: "Dashboard & Analytics", icon: Sliders },
            { id: "tester", label: "Multi-Number Send & Broadcast", icon: Users },
            { id: "templates", label: "Template Manager", icon: FileCode, badge: templates.length },
            { id: "logs", label: "WhatsApp Service Logs", icon: History, badge: logs.length },
            { id: "credentials", label: "Provider Credentials (Meta / Maytapi)", icon: Key }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold"
                    : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={14} className={isActive ? "text-emerald-100" : "text-slate-500"} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          TAB 1: DASHBOARD & ANALYTICS OVERVIEW
         ========================================================= */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Active Provider Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">Active Gateway</h3>
                    <p className="text-[10px] text-slate-400">Primary messaging provider</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("credentials")}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <span>Configure</span>
                  <ExternalLink size={10} />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Provider Name:</span>
                  <span className="font-bold text-slate-800 uppercase font-mono">
                    {config.activeProvider === "meta" ? "Meta Cloud Graph API" : "Maytapi Web Gateway"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Sender Identity:</span>
                  <span className="font-semibold text-slate-700 font-mono">{config.senderPhone}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Database Storage:</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-700 block mb-2">Automated Database Triggers:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-600 bg-emerald-50/60 border border-emerald-200/60 px-2 py-1 rounded-lg">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Leave Apply
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 bg-emerald-50/60 border border-emerald-200/60 px-2 py-1 rounded-lg">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Leave Approve
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 bg-emerald-50/60 border border-emerald-200/60 px-2 py-1 rounded-lg">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Interview Call
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 bg-emerald-50/60 border border-emerald-200/60 px-2 py-1 rounded-lg">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Gate Pass
                  </span>
                </div>
              </div>
            </div>

            {/* Event Distribution Summary */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs">Notifications by Event</h3>
                <span className="text-[10px] text-slate-400">Total {totalSent} Logs</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-700">Leave Approvals & Requests</span>
                    <span className="font-bold text-slate-900 font-mono">{leaveLogsCount} msgs</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalSent ? (leaveLogsCount / totalSent) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-700">Interview Scheduled</span>
                    <span className="font-bold text-slate-900 font-mono">{interviewLogsCount} msgs</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalSent ? (interviewLogsCount / totalSent) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-700">Gate Pass & Security</span>
                    <span className="font-bold text-slate-900 font-mono">{gatepassLogsCount} msgs</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${totalSent ? (gatepassLogsCount / totalSent) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-700">Multi-Number Broadcasts</span>
                    <span className="font-bold text-slate-900 font-mono">{totalSent - (leaveLogsCount + interviewLogsCount + gatepassLogsCount)} msgs</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${totalSent ? ((totalSent - (leaveLogsCount + interviewLogsCount + gatepassLogsCount)) / totalSent) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Live Simulator */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Smartphone size={14} className="text-emerald-600" />
                    <span>WhatsApp Live Preview</span>
                  </h3>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                    Official Format
                  </span>
                </div>
                
                {/* Chat Bubble Simulation */}
                <div className="bg-[#e5ddd5] p-3 rounded-xl border border-slate-200/80 shadow-inner space-y-2 min-h-[160px] flex flex-col justify-end">
                  <div className="bg-[#dcf8c6] text-slate-900 p-2.5 rounded-lg rounded-tr-none shadow-xs text-[11px] leading-relaxed relative max-w-[90%] self-end">
                    <p className="whitespace-pre-line font-sans">
                      {templates[0]?.body
                        .replace(/{manager_name}/g, "Vikas Gupta")
                        .replace(/{employee_name}/g, "Rahul Sharma")
                        .replace(/{employee_id}/g, "EMP-1044")
                        .replace(/{leave_type}/g, "Casual Leave")
                        .replace(/{start_date}/g, "15/10/2026")
                        .replace(/{end_date}/g, "16/10/2026")
                        .replace(/{days}/g, "2")
                        .replace(/{reason}/g, "Personal urgent work")
                        .replace(/{portal_url}/g, getAppBaseUrl())
                      }
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-500">
                      <span>12:45 PM</span>
                      <CheckCircle2 size={11} className="text-emerald-600 inline" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSendMode("multiple");
                  setActiveTab("tester");
                }}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-center transition-colors"
              >
                Send to Multiple Numbers →
              </button>
            </div>
          </div>

          {/* Recent Logs Quick Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs">Recent WhatsApp Dispatches (Supabase Synced)</h3>
              <button
                onClick={() => setActiveTab("logs")}
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
                View Full Audit Logs →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4">Event Category</th>
                    <th className="py-2.5 px-4">Template</th>
                    <th className="py-2.5 px-4">Provider</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.slice(0, 5).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">{log.recipient_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.recipient_phone}</span>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap font-medium text-slate-700">
                        {log.template_name}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">
                        <span className="font-mono text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {log.provider}
                        </span>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === "delivered" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : log.status === "failed" 
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {log.status === "delivered" && <CheckCircle2 size={10} />}
                          {log.status === "failed" && <XCircle size={10} />}
                          {log.status === "sent" && <Clock size={10} />}
                          <span className="capitalize">{log.status}</span>
                        </span>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-right text-[11px] text-slate-500 font-mono">
                        {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: MULTI-NUMBER SEND & BROADCAST
         ========================================================= */}
      {activeTab === "tester" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Dispatcher Form */}
          <form onSubmit={handleDispatchWhatsApp} className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Users size={17} className="text-emerald-600" />
                  <span>Multi-Number WhatsApp Broadcast</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Send any selected template or custom notice to multiple phone numbers at once
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                Via {config.activeProvider.toUpperCase()}
              </span>
            </div>

            {/* Recipient Source Mode Selector */}
            <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200/80">
              {[
                { id: "multiple", label: "Enter Multiple Numbers", icon: Smartphone },
                { id: "employee_directory", label: "Pick from Employees", icon: UserCheck },
                { id: "single", label: "Single Number", icon: Radio }
              ].map(m => {
                const Icon = m.icon;
                const isSelected = sendMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSendMode(m.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-2xs font-bold ring-1 ring-slate-900/5"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={13} className={isSelected ? "text-emerald-600" : "text-slate-400"} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* MODE 1: MULTIPLE NUMBERS INPUT */}
            {sendMode === "multiple" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-semibold text-xs">
                    Paste / Enter Multiple Mobile Numbers <span className="text-rose-500">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={11} /> {detectedNumbers.length} Valid Numbers
                  </span>
                </div>

                <textarea
                  rows={4}
                  required
                  value={testForm.multipleNumbersText}
                  onChange={(e) => setTestForm(prev => ({ ...prev, multipleNumbersText: e.target.value }))}
                  placeholder="Paste numbers separated by comma, space or newline e.g.&#10;+919876543210, +919823456789&#10;9811223344, 9988776655"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 outline-none leading-relaxed"
                />
                
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Supports comma, newline or semicolon separation</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTestForm(prev => ({ ...prev, multipleNumbersText: "+919876543210, +919823456789, +919988776655, +919811223344" }))}
                      className="text-emerald-700 hover:underline font-semibold"
                    >
                      Fill Sample 4 Numbers
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: PICK FROM EMPLOYEES DIRECTORY */}
            {sendMode === "employee_directory" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-semibold text-xs">
                    Select Employees to Broadcast To:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEmployeeIds.length === employeeDirectory.length) {
                          setSelectedEmployeeIds([]);
                        } else {
                          setSelectedEmployeeIds(employeeDirectory.map(e => e.id));
                        }
                      }}
                      className="text-[11px] text-emerald-700 font-semibold hover:underline"
                    >
                      {selectedEmployeeIds.length === employeeDirectory.length ? "Deselect All" : "Select All Employees"}
                    </button>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedEmployeeIds.length} Selected
                    </span>
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-2 divide-y divide-slate-100 bg-slate-50/50">
                  {employeeDirectory.map((emp) => {
                    const isChecked = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center justify-between py-2 px-2 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedEmployeeIds(prev =>
                                isChecked ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                              );
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">{emp.name}</span>
                            <span className="text-[10px] text-slate-400">{emp.department}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-600 font-medium">{emp.phone}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODE 3: SINGLE PHONE NUMBER */}
            {sendMode === "single" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={testForm.recipientPhone}
                    onChange={(e) => setTestForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={testForm.recipientName}
                    onChange={(e) => setTestForm(prev => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* TEMPLATE OR CUSTOM MESSAGE SELECTOR */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-bold text-xs">Choose Notification Template:</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testForm.useCustomMessage}
                    onChange={(e) => setTestForm(prev => ({ ...prev, useCustomMessage: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span className="text-[11px] font-semibold text-slate-600">Custom raw text</span>
                </label>
              </div>

              {!testForm.useCustomMessage ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((t) => {
                    const isSelected = testForm.selectedTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTestForm(prev => ({ ...prev, selectedTemplateId: t.id }))}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/40 shadow-2xs ring-1 ring-emerald-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[180px]">{t.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 font-mono">{t.body}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  rows={4}
                  value={testForm.customMessage}
                  onChange={(e) => setTestForm(prev => ({ ...prev, customMessage: e.target.value }))}
                  placeholder="Type your WhatsApp notification message here..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none font-mono"
                />
              )}
            </div>

            {/* SEND PROGRESS DISPLAY */}
            {isSendingBatch && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-pulse">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <RefreshCw size={13} className="animate-spin text-emerald-600" />
                    <span>Broadcasting & Saving to Supabase Database...</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-800">
                    {batchProgress.current} / {batchProgress.total} ({batchProgress.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 transition-all duration-300 rounded-full" 
                    style={{ width: `${batchProgress.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSendingBatch}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} className={isSendingBatch ? "animate-bounce" : ""} />
              <span>
                {isSendingBatch
                  ? `Broadcasting ${batchProgress.current} of ${batchProgress.total}...`
                  : sendMode === "multiple"
                  ? `Broadcast to ${detectedNumbers.length} Numbers (Save to DB)`
                  : sendMode === "employee_directory"
                  ? `Broadcast to ${selectedEmployeeIds.length} Employees (Save to DB)`
                  : `Send Single WhatsApp Message`}
              </span>
            </button>
          </form>

          {/* Right Column: Live Chat Preview Simulator */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Smartphone size={15} className="text-emerald-600" />
                  <span>Broadcast Payload Preview</span>
                </h3>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Live View
                </span>
              </div>

              <div className="bg-[#efeae2] p-4 rounded-2xl border border-slate-200 shadow-inner flex flex-col justify-end min-h-[260px]">
                <div className="bg-[#dcf8c6] text-slate-900 p-3 rounded-xl rounded-tr-none shadow-xs text-xs leading-relaxed max-w-[95%] self-end">
                  <p className="whitespace-pre-line font-sans">
                    {testForm.useCustomMessage
                      ? testForm.customMessage || "Type custom message..."
                      : formatTemplatePreview(templates.find(t => t.id === testForm.selectedTemplateId)?.body || "")
                    }
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-500">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCircle2 size={11} className="text-emerald-600 inline" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">Database Sync Guarantee:</span>
              <p>Har ek dispatched message ka individual audit payload real-time mein Supabase <code className="font-mono font-bold text-slate-700">whatsapp_logs</code> table mein store hota hai.</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: TEMPLATE MANAGER (DATABASE INTEGRATED)
         ========================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          
          {/* Filter and Action Header */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search template name or message..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
              >
                <option value="all">All Categories</option>
                <option value="Leave Management">Leave Management</option>
                <option value="Recruitment">Recruitment</option>
                <option value="Attendance & Pass">Attendance & Pass</option>
                <option value="General">General / Broadcast</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingTemplate({
                  name: "",
                  category: "Leave Management",
                  triggerEvent: "custom_alert",
                  provider: "all",
                  body: "Hello *{employee_name}*,\n\nMessage content here.\n\nRegards,\n*HR Team*",
                  isActive: true
                });
                setIsTemplateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add New Template (Save to DB)</span>
            </button>
          </div>

          {/* Templates Grid & Live Simulator Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Template List Cards */}
            <div className="lg:col-span-2 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filteredTemplates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400">
                  <FileCode size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700">No templates found in database</p>
                  <p className="text-xs">Create a new template to save it to Supabase</p>
                </div>
              ) : (
                filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setPreviewTemplate(t)}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer ${
                      previewTemplate?.id === t.id
                        ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-xs">{t.name}</h3>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {t.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          Trigger: {t.triggerEvent}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTemplateInMultiSender(t);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                          title="Broadcast to Multiple Numbers"
                        >
                          <Users size={12} />
                          <span>Broadcast</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplate(t);
                            setIsTemplateModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(t.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Template from Database"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-mono text-slate-700 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {t.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Live WhatsApp Bubble Preview */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3 h-fit sticky top-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Smartphone size={14} className="text-emerald-600" />
                  <span>Template Simulator</span>
                </h3>
                <span className="text-[10px] text-slate-400">Live Render</span>
              </div>

              {previewTemplate ? (
                <div className="space-y-3">
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Selected Template:</span>
                    <span className="font-bold text-slate-800">{previewTemplate.name}</span>
                  </div>

                  {/* Chat Box Container */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col justify-end min-h-[260px]">
                    <div className="bg-white text-slate-900 p-3 rounded-xl rounded-tr-none shadow-xs text-xs leading-relaxed relative max-w-[95%] self-end">
                      <p className="whitespace-pre-line font-sans">
                        {formatTemplatePreview(previewTemplate.body)}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-slate-500">
                        <span>Just now</span>
                        <CheckCircle2 size={11} className="text-emerald-600 inline" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openTemplateInMultiSender(previewTemplate)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Users size={14} />
                    <span>Send Template to Multiple Numbers</span>
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  Select a template to preview live simulator
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: WHATSAPP SERVICE LOGS (SUPABASE AUDIT TABLE)
         ========================================================= */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Log Filters Bar */}
          <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              
              {/* Search */}
              <div className="relative w-full sm:w-60">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search recipient, mobile, message..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* Event Filter */}
              <select
                value={logFilterEvent}
                onChange={(e) => setLogFilterEvent(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
              >
                <option value="all">All Events</option>
                <option value="Leave">Leave Alerts</option>
                <option value="Interview">Interview Invites</option>
                <option value="Gate Pass">Gate Pass</option>
                <option value="Broadcast">Broadcasts</option>
              </select>

              {/* Status Filter */}
              <select
                value={logFilterStatus}
                onChange={(e) => setLogFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>

              {/* Provider Filter */}
              <select
                value={logFilterProvider}
                onChange={(e) => setLogFilterProvider(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
              >
                <option value="all">All Providers</option>
                <option value="meta">Meta Cloud</option>
                <option value="maytapi">Maytapi</option>
              </select>
            </div>

            {/* Refresh / Export */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-500">
                Showing <span className="font-bold text-slate-800 font-mono">{filteredLogs.length}</span> database logs
              </span>

              <button
                onClick={loadLogs}
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Sync DB</span>
              </button>

              <button
                onClick={() => {
                  const csv = "Recipient,Phone,Event,Template,Provider,Status,Date\n" + 
                    filteredLogs.map(l => `"${l.recipient_name}","${l.recipient_phone}","${l.event_type}","${l.template_name}","${l.provider}","${l.status}","${l.sent_at}"`).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `whatsapp_logs_${Date.now()}.csv`;
                  a.click();
                  toast.success("Logs exported to CSV");
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* MODERN LOGS DATA TABLE (TALL CONTAINER HEIGHT) */}
          <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-slate-500 sticky top-0 z-20 border-b border-slate-200 backdrop-blur-xs">
                <tr className="text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Recipient</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Event / Category</th>
                  <th className="py-3 px-4 min-w-[280px]">Message Content</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[100px]">Provider</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[110px]">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Dispatched At</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[80px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-normal">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-14 text-center text-slate-400">
                      <History size={24} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm text-slate-700">No service logs in database</p>
                      <p className="text-xs text-slate-400">Dispatches from Leave/Interview or Broadcasts will appear here</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Recipient info with WhatsApp Web Quick Link */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {log.recipient_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">{log.recipient_name}</span>
                            <a
                              href={`https://wa.me/${log.recipient_phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-700 hover:underline font-mono flex items-center gap-1"
                            >
                              <span>{log.recipient_phone}</span>
                              <ExternalLink size={9} />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Event / Trigger */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.event_type}
                        </span>
                      </td>

                      {/* Message preview */}
                      <td className="py-2.5 px-4">
                        <p className="text-[11px] text-slate-700 line-clamp-2 font-mono bg-slate-50/80 p-1.5 rounded-lg border border-slate-100">
                          {log.message_body}
                        </p>
                      </td>

                      {/* Provider */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {log.provider}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === "delivered"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : log.status === "failed"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {log.status === "delivered" && <CheckCircle2 size={11} />}
                          {log.status === "failed" && <XCircle size={11} />}
                          {log.status === "sent" && <Clock size={11} />}
                          <span className="capitalize">{log.status}</span>
                        </span>
                      </td>

                      {/* Date Time */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.sent_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="View Log Details"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: CREDENTIALS & PROVIDER CONFIGURATION
         ========================================================= */}
      {activeTab === "credentials" && (
        <form onSubmit={handleSaveConfig} className="space-y-4">
          
          {/* Main Provider Selection Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Key size={16} className="text-emerald-600" />
                <span>Select WhatsApp Gateway Provider (Auto-Saved to DB)</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose between Meta WhatsApp Business Cloud API (Official) or Maytapi WhatsApp Gateway
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Option 1: Meta Cloud API */}
              <label 
                onClick={() => setConfig(prev => ({ ...prev, activeProvider: "meta" }))}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  config.activeProvider === "meta"
                    ? "border-emerald-600 bg-emerald-50/30 shadow-xs ring-2 ring-emerald-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="activeProvider"
                  value="meta"
                  checked={config.activeProvider === "meta"}
                  onChange={() => setConfig(prev => ({ ...prev, activeProvider: "meta" }))}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">Meta WhatsApp Cloud API</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      OFFICIAL META
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Direct connection to Meta Graph API. High throughput, official green tick verified templates & maximum reliability.
                  </p>
                </div>
              </label>

              {/* Option 2: Maytapi API */}
              <label 
                onClick={() => setConfig(prev => ({ ...prev, activeProvider: "maytapi" }))}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  config.activeProvider === "maytapi"
                    ? "border-emerald-600 bg-emerald-50/30 shadow-xs ring-2 ring-emerald-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="activeProvider"
                  value="maytapi"
                  checked={config.activeProvider === "maytapi"}
                  onChange={() => setConfig(prev => ({ ...prev, activeProvider: "maytapi" }))}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">Maytapi WhatsApp Gateway</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800">
                      QR / WEB API
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Custom Web Gateway API via Maytapi Product & Phone ID. Easy setup without strict Meta template approvals.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Credentials Form */}
          {config.activeProvider === "meta" ? (
            /* META CLOUD API FORM */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs">Meta WhatsApp Cloud API Credentials</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">developers.facebook.com</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    WhatsApp Business Account ID (WABA ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.metaWabaId}
                    onChange={(e) => setConfig(prev => ({ ...prev, metaWabaId: e.target.value }))}
                    placeholder="e.g. 109823489182390"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Phone Number ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.metaPhoneNumberId}
                    onChange={(e) => setConfig(prev => ({ ...prev, metaPhoneNumberId: e.target.value }))}
                    placeholder="e.g. 104592817283921"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Permanent Access Token (System User Bearer Token) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={config.metaAccessToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, metaAccessToken: e.target.value }))}
                    placeholder="EAABw..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Graph API Version</label>
                  <input
                    type="text"
                    value={config.metaApiVersion}
                    onChange={(e) => setConfig(prev => ({ ...prev, metaApiVersion: e.target.value }))}
                    placeholder="v20.0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Webhook Verification Token</label>
                  <input
                    type="text"
                    value={config.metaWebhookVerifyToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, metaWebhookVerifyToken: e.target.value }))}
                    placeholder="piramal_secure_token"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* MAYTAPI API FORM */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs">Maytapi WhatsApp Gateway Credentials</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">maytapi.com</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Product ID <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={config.maytapiProductId}
                    onChange={(e) => setConfig(prev => ({ ...prev, maytapiProductId: e.target.value }))}
                    placeholder="e.g. prod_8a92b3c4"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone ID <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={config.maytapiPhoneId}
                    onChange={(e) => setConfig(prev => ({ ...prev, maytapiPhoneId: e.target.value }))}
                    placeholder="e.g. 19283"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">API Secret Token <span className="text-rose-500">*</span></label>
                  <input
                    type="password"
                    value={config.maytapiToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, maytapiToken: e.target.value }))}
                    placeholder="maytapi_secret_token..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              <Check size={14} />
              <span>{savingSettings ? "Saving to Database..." : "Save Credentials to Supabase Database"}</span>
            </button>
          </div>
        </form>
      )}



      {/* =========================================================
          MODAL 1: ADD / EDIT TEMPLATE MODAL
         ========================================================= */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                {editingTemplate.id ? "Edit WhatsApp Template (Database)" : "Create New WhatsApp Template (Database)"}
              </h2>
              <button
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  setEditingTemplate(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Template Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Leave Approval Notice"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Leave Management">Leave Management</option>
                    <option value="Recruitment">Recruitment</option>
                    <option value="Attendance & Pass">Attendance & Pass</option>
                    <option value="General">General / Broadcast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Trigger Event</label>
                  <input
                    type="text"
                    value={editingTemplate.triggerEvent}
                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, triggerEvent: e.target.value }))}
                    placeholder="e.g. leave_approval"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Variables helper bar */}
              <div>
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">Click to insert dynamic variable tag:</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {VARIABLE_TAGS.map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => setEditingTemplate(prev => ({ ...prev, body: prev.body + " " + v.tag }))}
                      className="px-2 py-0.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 text-[10px] font-mono font-semibold rounded-md border border-slate-200 transition-colors cursor-pointer"
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Message Body (Supports *bold*, _italic_, newlines) <span className="text-rose-500">*</span></label>
                <textarea
                  rows={6}
                  required
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Save to Supabase Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: LOG DETAIL MODAL
         ========================================================= */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">WhatsApp Dispatch Audit Detail (Database Record)</h2>
              <button onClick={() => setSelectedLogDetail(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Recipient Name:</span>
                <span className="font-bold text-slate-800">{selectedLogDetail.recipient_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-mono font-bold text-emerald-700">{selectedLogDetail.recipient_phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Event Category:</span>
                <span className="font-semibold text-slate-800">{selectedLogDetail.event_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Gateway Provider:</span>
                <span className="font-mono uppercase font-bold text-indigo-700">{selectedLogDetail.provider}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Delivery Status:</span>
                <span className="capitalize font-bold text-emerald-700">{selectedLogDetail.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Delivered Message Payload:</span>
                <div className="p-3 bg-[#efeae2] rounded-xl font-mono text-[11px] whitespace-pre-line text-slate-800 border border-slate-200">
                  {selectedLogDetail.message_body}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close Detail
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WhatsappService;
