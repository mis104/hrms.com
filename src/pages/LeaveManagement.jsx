import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Search, X, Plus, Share2, RefreshCw, Calendar, CheckCircle2, Clock, 
  AlertCircle, ChevronLeft, ChevronRight, User, MapPin, Building2, 
  FileText, Check, Layers, LayoutList, LayoutGrid, ArrowRight, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getUserRole } from '../utils/authRole';
import { fetchLeaveRequests, createLeaveRequest, updateLeaveStatus, supabase } from '../services/supabaseService';
import { triggerLeaveApprovalNotification, triggerLeaveRejectionNotification, triggerLeaveRequestNotification } from '../services/whatsappService';
import { getAppBaseUrl } from '../utils/urlHelper';

const LEAVE_REFRESH_INTERVAL_MS = 2 * 60 * 1000;
const LEAVE_PAGE_SIZE = 50;

const normalizeMatchValue = (value) =>
  (value || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const getCurrentUserAliases = (user = {}) => {
  const values = [
    localStorage.getItem('employeeId'),
    user.employeeId,
    user.EmployeeID,
    user['Employee ID'],
    user['User ID'],
    user._authUsername,
    user.Username,
    user.username,
    user['User Name'],
    user.Name,
    user.name,
    user._displayName,
    user['Employee Name'],
    user['Sales Person Name'],
  ];

  return [...new Set(values.map(normalizeMatchValue).filter(Boolean))];
};

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

const formatDateToDDMMYYYY = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return String(dateVal);
  } catch {
    return String(dateVal);
  }
};

const formatLeaveDays = (fromDate, toDate) => {
  if (!fromDate || !toDate) return '0 days';
  try {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  } catch {
    return '0 days';
  }
};

const LeaveManagement = () => {
  const authUser = useAuthStore((state) => state.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [rejectedLeaves, setRejectedLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [editableDates, setEditableDates] = useState({ from: '', to: '' });
  const [visibleLimit, setVisibleLimit] = useState(LEAVE_PAGE_SIZE);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const leaveFetchInProgressRef = useRef(false);

  // Leave request modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    designation: '',
    department: '',
    jobLocation: '',
    fromDate: '',
    toDate: '',
    reason: '',
    remark: '',
    imageUrl: ''
  });

  const currentUser = useMemo(() => authUser || getStoredUser(), [authUser]);
  const currentUserAliases = useMemo(() => getCurrentUserAliases(currentUser), [currentUser]);
  const shouldShowOnlyOwnLeaves = getUserRole(currentUser || {}) === 'employee';

  const isOwnLeaveRecord = useMemo(
    () => (item) => {
      if (!shouldShowOnlyOwnLeaves || currentUserAliases.length === 0) return true;

      const rowValues = [
        item.requestedBy,
        item.employeeName,
        item.employeeId,
      ].map(normalizeMatchValue).filter(Boolean);

      return rowValues.some((rowValue) =>
        currentUserAliases.some((alias) =>
          rowValue === alias ||
          rowValue.includes(alias) ||
          alias.includes(rowValue)
        )
      );
    },
    [currentUserAliases, shouldShowOnlyOwnLeaves]
  );

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, candidate_name, designation, department, joining_place')
        .eq('is_active', true)
        .order('candidate_name', { ascending: true })
        .limit(300);

      if (error) throw error;

      const formatted = (data || []).map(emp => ({
        id: emp.id,
        code: emp.employee_code,
        name: emp.candidate_name,
        designation: emp.designation || '',
        department: emp.department || '',
        location: emp.joining_place || ''
      }));

      setEmployees(formatted);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'employeeName') {
      const selected = employees.find(emp => emp.name === value);
      if (selected) {
        setFormData(prev => ({
          ...prev,
          employeeName: value,
          employeeId: selected.code || '',
          designation: selected.designation || '',
          department: selected.department || '',
          jobLocation: selected.location || ''
        }));
        return;
      }
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const setLeaveLists = (data = []) => {
    const pending = [];
    const approved = [];
    const rejected = [];

    data.forEach(item => {
      const st = (item.approvalStatus || item.status || '').toLowerCase();
      if (st === 'approved') approved.push(item);
      else if (st === 'rejected') rejected.push(item);
      else pending.push(item);
    });

    setPendingLeaves(pending);
    setApprovedLeaves(approved);
    setRejectedLeaves(rejected);
  };

  const fetchLeaveData = async ({ showLoader = true, silent = false } = {}) => {
    if (leaveFetchInProgressRef.current) return;
    leaveFetchInProgressRef.current = true;

    if (showLoader) {
      setLoading(true);
      setTableLoading(true);
    }

    if (!silent) setError(null);

    try {
      const res = await fetchLeaveRequests({ limit: 500 });
      if (!res.success) throw new Error(res.error || 'Failed to fetch leave data');

      const processedData = (res.data || []).map((row) => {
        let displayDays = row.total_leaves ? `${row.total_leaves} ${row.total_leaves === 1 ? 'day' : 'days'}` : '';
        if (!displayDays && row.leave_from_date && row.leave_to_date) {
          displayDays = formatLeaveDays(row.leave_from_date, row.leave_to_date);
        }

        const status = row.approval_status || 'Pending';

        return {
          id: row.id,
          timestamp: row.timestamp || row.created_at,
          leaveRequestId: row.leave_request_no || '',
          requestedBy: row.requested_by || '',
          department: row.department || '',
          totalLeaves: displayDays,
          jobLocation: row.job_location || '',
          leaveFromDate: row.leave_from_date || '',
          leaveToDate: row.leave_to_date || '',
          leaveReason: row.leave_reason || '',
          remark: row.remark || '',
          imageUrl: row.image_url || '',
          approvalPlanned: row.approval_planned || '',
          approvalActual: row.approval_actual || '',
          approvalDelay: row.approval_delay || '',
          approvedBy: row.approved_by || '',
          approvalStatus: status,
          approvalRemarks: row.approval_remarks || '',
          serialNo: row.leave_request_no || '',
          employeeId: row.leave_request_no || '',
          employeeName: row.requested_by || '',
          startDate: row.leave_from_date || '',
          endDate: row.leave_to_date || '',
          days: displayDays,
          status: status,
        };
      });

      setLeaveLists(processedData);
      setError(null);
    } catch (error) {
      console.error('Error fetching leave data:', error);
      if (!silent) {
        setError(error.message);
        toast.error(`Failed to load leave data: ${error.message}`);
      }
    } finally {
      leaveFetchInProgressRef.current = false;
      if (showLoader) {
        setLoading(false);
        setTableLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLeaveData();

    const syncLeaveData = () => fetchLeaveData({ showLoader: false, silent: true });
    const refreshTimer = window.setInterval(syncLeaveData, LEAVE_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', syncLeaveData);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', syncLeaveData);
    };
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchEmployees();
    }
  }, [showModal]);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();

  const scopedPendingLeaves = useMemo(
    () => pendingLeaves.filter(isOwnLeaveRecord),
    [pendingLeaves, isOwnLeaveRecord]
  );

  const scopedApprovedLeaves = useMemo(
    () => approvedLeaves.filter(isOwnLeaveRecord),
    [approvedLeaves, isOwnLeaveRecord]
  );

  const scopedRejectedLeaves = useMemo(
    () => rejectedLeaves.filter(isOwnLeaveRecord),
    [rejectedLeaves, isOwnLeaveRecord]
  );

  const matchesLeaveSearch = (item) =>
    !normalizedSearchTerm ||
    item.requestedBy?.toString().toLowerCase().includes(normalizedSearchTerm) ||
    item.employeeName?.toString().toLowerCase().includes(normalizedSearchTerm) ||
    item.employeeId?.toString().toLowerCase().includes(normalizedSearchTerm) ||
    item.leaveRequestId?.toString().toLowerCase().includes(normalizedSearchTerm) ||
    item.leaveReason?.toString().toLowerCase().includes(normalizedSearchTerm) ||
    item.department?.toString().toLowerCase().includes(normalizedSearchTerm);

  const filteredPendingLeaves = useMemo(
    () => scopedPendingLeaves.filter(matchesLeaveSearch),
    [scopedPendingLeaves, normalizedSearchTerm]
  );

  const filteredApprovedLeaves = useMemo(
    () => scopedApprovedLeaves.filter(matchesLeaveSearch),
    [scopedApprovedLeaves, normalizedSearchTerm]
  );

  const filteredRejectedLeaves = useMemo(
    () => scopedRejectedLeaves.filter(matchesLeaveSearch),
    [scopedRejectedLeaves, normalizedSearchTerm]
  );

  useEffect(() => {
    setVisibleLimit(LEAVE_PAGE_SIZE);
  }, [activeTab, normalizedSearchTerm]);

  const displayedPendingLeaves = useMemo(
    () => filteredPendingLeaves.slice(0, visibleLimit),
    [filteredPendingLeaves, visibleLimit]
  );

  const displayedApprovedLeaves = useMemo(
    () => filteredApprovedLeaves.slice(0, visibleLimit),
    [filteredApprovedLeaves, visibleLimit]
  );

  const displayedRejectedLeaves = useMemo(
    () => filteredRejectedLeaves.slice(0, visibleLimit),
    [filteredRejectedLeaves, visibleLimit]
  );

  const currentDisplayList = 
    activeTab === 'approved' 
      ? displayedApprovedLeaves 
      : activeTab === 'rejected' 
        ? displayedRejectedLeaves 
        : displayedPendingLeaves;

  const currentFilteredTotal = 
    activeTab === 'approved' 
      ? filteredApprovedLeaves.length 
      : activeTab === 'rejected' 
        ? filteredRejectedLeaves.length 
        : filteredPendingLeaves.length;

  const getCurrentApproverName = () => {
    return (
      currentUser?.name ||
      currentUser?._displayName ||
      currentUser?.username ||
      currentUser?.Username ||
      'Authorized Approver'
    );
  };

  const handleLeaveAction = async (action, targetItem = null) => {
    const itemToProcess = targetItem || selectedRow;
    if (!itemToProcess) {
      toast.error('Please select a leave request');
      return;
    }

    const actionStatus = action === 'accept' ? 'Approved' : 'Rejected';
    const approvalRemark = window.prompt(`Enter remarks for ${actionStatus}`, itemToProcess.approvalRemarks || '');
    if (approvalRemark === null) return;

    setActionInProgress(action);
    setLoading(true);

    try {
      const finalFromDate = editableDates.from ? editableDates.from : itemToProcess.startDate;
      const finalToDate = editableDates.to ? editableDates.to : itemToProcess.endDate;
      const approverName = getCurrentApproverName();

      const res = await updateLeaveStatus({
        id: itemToProcess.id,
        leaveRequestNo: itemToProcess.leaveRequestId || itemToProcess.serialNo,
        status: actionStatus,
        approvedBy: approverName,
        remarks: approvalRemark,
        fromDate: finalFromDate,
        toDate: finalToDate,
      });

      if (res.success) {
        toast.success(`Leave ${action === 'accept' ? 'approved' : 'rejected'} for ${itemToProcess.requestedBy || 'employee'}`);
        
        // Auto-Trigger WhatsApp Notification to Employee
        if (action === 'accept') {
          triggerLeaveApprovalNotification({
            employeeName: itemToProcess.requestedBy || itemToProcess.employeeName || 'Employee',
            employeePhone: itemToProcess.mobile || itemToProcess.phone || '+919876543210',
            designation: itemToProcess.department || itemToProcess.designation || 'Staff',
            approverName: approverName,
            leaveType: itemToProcess.leaveReason || 'Leave',
            fromDate: formatDateToDDMMYYYY(finalFromDate),
            toDate: formatDateToDDMMYYYY(finalToDate),
            days: itemToProcess.totalLeaves || itemToProcess.days || '1 Day',
            reason: itemToProcess.leaveReason || itemToProcess.remark || 'Personal leave',
            remarks: approvalRemark || 'Approved',
          });
        } else {
          triggerLeaveRejectionNotification({
            employeeName: itemToProcess.requestedBy || itemToProcess.employeeName || 'Employee',
            employeePhone: itemToProcess.mobile || itemToProcess.phone || '+919876543210',
            designation: itemToProcess.department || itemToProcess.designation || 'Staff',
            approverName: approverName,
            leaveType: itemToProcess.leaveReason || 'Leave',
            fromDate: formatDateToDDMMYYYY(finalFromDate),
            toDate: formatDateToDDMMYYYY(finalToDate),
            days: itemToProcess.totalLeaves || itemToProcess.days || '1 Day',
            reason: itemToProcess.leaveReason || itemToProcess.remark || 'Personal leave',
            remarks: approvalRemark || 'Operational requirements',
          });
        }

        setSelectedRow(null);
        setEditableDates({ from: '', to: '' });
        fetchLeaveData({ showLoader: false, silent: true });
      } else {
        throw new Error(res.error || 'Update failed');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to ${action} leave: ${error.message}`);
    } finally {
      setLoading(false);
      setActionInProgress(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        requested_by: formData.employeeName,
        department: formData.department,
        job_location: formData.jobLocation,
        leave_from_date: formData.fromDate,
        leave_to_date: formData.toDate,
        leave_reason: formData.reason,
        remark: formData.remark,
        image_url: formData.imageUrl,
        approval_status: 'Pending'
      };

      const res = await createLeaveRequest(payload);
      if (res.success) {
        toast.success('Leave request submitted successfully!');

        // Auto-Trigger WhatsApp Alert to Manager
        triggerLeaveRequestNotification({
          employeeName: formData.employeeName,
          employeeId: formData.employeeId || 'EMP',
          designation: formData.designation || formData.department || 'Staff',
          jobLocation: formData.jobLocation || 'Piramal Petroleum',
          managerName: 'HR Manager',
          leaveType: formData.reason || 'Leave Application',
          fromDate: formatDateToDDMMYYYY(formData.fromDate),
          toDate: formatDateToDDMMYYYY(formData.toDate),
          days: formatLeaveDays(formData.fromDate, formData.toDate),
          reason: formData.reason || 'Personal work',
          remark: formData.remark || 'Submitted for approval',
          lrNo: res.data?.leave_request_no || `LR-${Date.now().toString().slice(-5)}`,
          approvalLink: `${getAppBaseUrl()}/leave-management`,
        });

        setFormData({
          employeeId: '',
          employeeName: '',
          designation: '',
          department: '',
          jobLocation: '',
          fromDate: '',
          toDate: '',
          reason: '',
          remark: '',
          imageUrl: ''
        });
        setShowModal(false);
        fetchLeaveData({ showLoader: false, silent: true });
      } else {
        toast.error('Failed to submit: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Something went wrong!');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return {
          pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
        };
      case 'rejected':
        return {
          pill: 'bg-rose-500/10 text-rose-700 border-rose-200/80',
          dot: 'bg-rose-500',
          icon: <AlertCircle size={12} className="text-rose-600 shrink-0" />
        };
      default:
        return {
          pill: 'bg-amber-500/10 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500',
          icon: <Clock size={12} className="text-amber-600 shrink-0" />
        };
    }
  };

  const statusTabs = [
    { label: 'Pending Leaves', value: 'pending', count: scopedPendingLeaves.length, dot: 'bg-amber-500' },
    { label: 'Approved Leaves', value: 'approved', count: scopedApprovedLeaves.length, dot: 'bg-emerald-500' },
    { label: 'Rejected Leaves', value: 'rejected', count: scopedRejectedLeaves.length, dot: 'bg-rose-500' },
  ];

  return (
    <div className="p-3 sm:p-5 space-y-3 bg-[#f8fafc] min-h-screen text-xs antialiased text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Top Action Bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs shadow-indigo-500/20">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Leave Management</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  {scopedPendingLeaves.length} Pending Actions
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Employee leave requests, review & 1-click approvals</p>
            </div>
          </div>

          {/* Action Buttons & View Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher */}
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

            {/* Sync Button */}
            <button
              onClick={() => fetchLeaveData()}
              disabled={tableLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={12} className={tableLoading ? "animate-spin text-indigo-600" : "text-slate-500"} />
              <span>{tableLoading ? "Syncing..." : "Sync"}</span>
            </button>

            {/* Apply Leave Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shadow-indigo-600/20 cursor-pointer"
            >
              <Plus size={14} />
              <span>Apply Leave Request</span>
            </button>
          </div>
        </div>

        {/* Segmented Status Tabs (Linear / SaaS Style) */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  setSelectedRow(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-white text-slate-900 border-slate-300 shadow-2xs font-bold ring-1 ring-slate-900/5"
                    : "bg-transparent border-transparent text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${tab.dot}`}></span>
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? "bg-slate-100 text-slate-800 font-bold" : "bg-slate-200/60 text-slate-600"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-white border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by employee name, LR number, reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Selection Action Toolbar (Approve / Reject Selected) */}
            {selectedRow && activeTab === 'pending' && !shouldShowOnlyOwnLeaves ? (
              <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200/80 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-900">
                  Selected: <span className="font-mono">{selectedRow.leaveRequestId || selectedRow.serialNo}</span>
                </span>
                <button
                  onClick={() => handleLeaveAction('accept')}
                  disabled={loading}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Check size={12} />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleLeaveAction('rejected')}
                  disabled={loading}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Clear Selection"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500">
                Viewing <span className="font-bold text-slate-800 font-mono">{currentFilteredTotal}</span> requests
              </div>
            )}
          </div>
        </div>

        {/* VIEW 1: MODERN SAAS DATA TABLE */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto max-h-[calc(100vh-310px)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-slate-500 sticky top-0 z-20 border-b border-slate-200/80 backdrop-blur-xs">
                <tr className="text-[11px] font-semibold uppercase tracking-wider">
                  {!shouldShowOnlyOwnLeaves && activeTab === 'pending' && (
                    <th className="py-3 px-4 w-10 text-center">Select</th>
                  )}
                  <th className="py-3 px-4 whitespace-nowrap min-w-[190px]">Employee / Requester</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[100px]">LR Number</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Leave Duration</th>
                  <th className="py-3 px-4 min-w-[160px]">Reason & Remarks</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[100px]">Status</th>
                  {activeTab !== 'pending' && (
                    <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Approved By</th>
                  )}
                  <th className="py-3 px-4 whitespace-nowrap min-w-[80px]">Doc</th>
                  {!shouldShowOnlyOwnLeaves && activeTab === 'pending' && (
                    <th className="py-3 px-4 whitespace-nowrap min-w-[140px] text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-normal">
                {tableLoading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-semibold text-xs text-slate-600">Loading leave records...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentDisplayList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <AlertCircle size={20} />
                        </div>
                        <p className="font-bold text-sm text-slate-700">No {activeTab} leave requests found</p>
                        <p className="text-xs text-slate-400">Try searching another employee or clearing filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentDisplayList.map((item, idx) => {
                    const badge = getStatusBadge(item.approvalStatus || item.status);
                    const gradient = getAvatarGradient(item.requestedBy || item.employeeName);
                    const initials = getInitials(item.requestedBy || item.employeeName);
                    const isSelected = selectedRow?.id === item.id || selectedRow?.serialNo === item.serialNo;

                    return (
                      <tr 
                        key={item.id || item.serialNo || idx} 
                        className={`hover:bg-slate-50/70 transition-colors group ${isSelected ? 'bg-indigo-50/40' : ''}`}
                      >
                        {/* Checkbox */}
                        {!shouldShowOnlyOwnLeaves && activeTab === 'pending' && (
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedRow(null);
                                  setEditableDates({ from: '', to: '' });
                                } else {
                                  setSelectedRow(item);
                                  setEditableDates({ from: item.startDate || '', to: item.endDate || '' });
                                }
                              }}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Employee Name & Dept */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-[11px] shadow-2xs shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-xs hover:text-indigo-700 transition-colors block">
                                {item.requestedBy || item.employeeName || "Unnamed Employee"}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <Building2 size={10} className="text-slate-400" />
                                <span>{item.department || "General"}</span>
                                {item.jobLocation && (
                                  <>
                                    <span>•</span>
                                    <span>{item.jobLocation}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* LR Number */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                            {item.leaveRequestId || item.serialNo || "-"}
                          </span>
                        </td>

                        {/* Leave Duration */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                              <Calendar size={11} className="text-slate-400" />
                              <span>{formatDateToDDMMYYYY(item.startDate)}</span>
                              <ArrowRight size={10} className="text-slate-400" />
                              <span>{formatDateToDDMMYYYY(item.endDate)}</span>
                            </div>
                            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.2 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                              {item.days || item.totalLeaves || "1 day"}
                            </span>
                          </div>
                        </td>

                        {/* Reason & Remarks */}
                        <td className="py-2.5 px-4">
                          <div className="max-w-[200px]">
                            <p className="text-[11px] text-slate-800 font-medium truncate" title={item.leaveReason}>
                              {item.leaveReason || "-"}
                            </p>
                            {item.remark && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5" title={item.remark}>
                                Remark: {item.remark}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${badge.pill}`}>
                            {badge.icon}
                            <span>{item.approvalStatus || item.status || "Pending"}</span>
                          </span>
                        </td>

                        {/* Approved By (if approved/rejected) */}
                        {activeTab !== 'pending' && (
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div>
                              <span className="font-medium text-slate-800 text-xs block">{item.approvedBy || "-"}</span>
                              {item.approvalRemarks && (
                                <span className="text-[10px] text-slate-500 block max-w-[120px] truncate" title={item.approvalRemarks}>
                                  {item.approvalRemarks}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Document */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {item.imageUrl ? (
                            <a
                              href={item.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold transition-colors"
                            >
                              <FileText size={11} />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        {!shouldShowOnlyOwnLeaves && activeTab === 'pending' && (
                          <td className="py-2.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleLeaveAction('accept', item)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Quick Approve"
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleLeaveAction('rejected', item)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Quick Reject"
                              >
                                <X size={12} />
                                <span>Reject</span>
                              </button>
                              <button
                                title="Share 1-Click Approval Link on WhatsApp"
                                onClick={() => {
                                  const shareUrl = `${getAppBaseUrl()}/quick-leave?lr=${item.leaveRequestId || item.serialNo}&id=${item.id}`;
                                  const text = `*Leave Request Approval Needed*\n\n` +
                                    `*LR No:* ${item.leaveRequestId || item.serialNo}\n` +
                                    `*Employee:* ${item.requestedBy || item.employeeName}\n` +
                                    `*Dates:* ${formatDateToDDMMYYYY(item.startDate)} to ${formatDateToDDMMYYYY(item.endDate)} (${item.days || item.totalLeaves})\n` +
                                    `*Reason:* ${item.leaveReason || '-'}\n\n` +
                                    `👉 *Click to Approve / Reject in 1-Click:* ${shareUrl}`;
                                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition"
                              >
                                <Share2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* VIEW 2: MODERN SAAS CANDIDATE CARDS GRID */
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-310px)]">
            {tableLoading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold text-xs text-slate-600">Loading leave cards...</p>
              </div>
            ) : currentDisplayList.length === 0 ? (
              <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <AlertCircle size={24} />
                <p className="font-bold text-sm text-slate-700">No {activeTab} leave requests</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {currentDisplayList.map((item, idx) => {
                  const badge = getStatusBadge(item.approvalStatus || item.status);
                  const gradient = getAvatarGradient(item.requestedBy || item.employeeName);
                  const initials = getInitials(item.requestedBy || item.employeeName);

                  return (
                    <div 
                      key={item.id || item.serialNo || idx} 
                      className="bg-white rounded-xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-sm transition-all p-3.5 flex flex-col justify-between space-y-3"
                    >
                      {/* Card Top */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-xs">
                                {item.requestedBy || item.employeeName || "Unnamed"}
                              </h3>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span>{item.department || "General"}</span>
                                {item.jobLocation && <span>• {item.jobLocation}</span>}
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {item.leaveRequestId || item.serialNo || "-"}
                          </span>
                        </div>

                        {/* Dates & Reason */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Leave Period:</span>
                            <span className="font-bold text-slate-800">
                              {formatDateToDDMMYYYY(item.startDate)} → {formatDateToDDMMYYYY(item.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Duration:</span>
                            <span className="font-bold text-indigo-700">{item.days || item.totalLeaves || "1 day"}</span>
                          </div>
                          <div className="text-xs pt-1">
                            <span className="text-slate-500 block mb-0.5">Reason:</span>
                            <p className="text-slate-800 bg-slate-50 p-2 rounded-lg text-[11px] line-clamp-2">
                              {item.leaveReason || "No reason specified"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Status & Actions */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${badge.pill}`}>
                          {badge.icon}
                          <span>{item.approvalStatus || item.status || "Pending"}</span>
                        </span>

                        {!shouldShowOnlyOwnLeaves && activeTab === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleLeaveAction('accept', item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <Check size={11} /> Approve
                            </button>
                            <button
                              onClick={() => handleLeaveAction('rejected', item)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <X size={11} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom Pagination */}
        {currentFilteredTotal > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500 font-medium">
              Showing <span className="text-slate-900 font-bold">{Math.min(visibleLimit, currentFilteredTotal)}</span> of{" "}
              <span className="text-slate-900 font-bold">{currentFilteredTotal}</span> {activeTab} requests
            </p>

            {visibleLimit < currentFilteredTotal && (
              <button
                type="button"
                onClick={() => setVisibleLimit((limit) => limit + LEAVE_PAGE_SIZE)}
                className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
              >
                Load More Records
              </button>
            )}
          </div>
        )}
      </div>

      {/* Apply New Leave Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Calendar size={14} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Apply Leave Request</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee Name *</label>
                <select
                  name="employeeName"
                  value={formData.employeeName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  required
                  disabled={employeesLoading}
                >
                  <option value="">
                    {employeesLoading ? 'Loading employees...' : 'Select Employee'}
                  </option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.name}>{employee.name} ({employee.code || 'No Code'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="Department..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Location *</label>
                  <input
                    type="text"
                    name="jobLocation"
                    value={formData.jobLocation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="Location / Plant..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Leave From Date *</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Leave To Date *</label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              {formData.fromDate && formData.toDate && (
                <div className="bg-indigo-50/80 border border-indigo-100 p-2.5 rounded-xl">
                  <p className="text-xs text-indigo-900 font-semibold flex items-center justify-between">
                    <span>Total Calculated Leave Duration:</span>
                    <span className="font-bold text-indigo-700 font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {formatLeaveDays(formData.fromDate, formData.toDate)}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Taking Leave *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="State the reason for leave request..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks (Optional)</label>
                <textarea
                  name="remark"
                  value={formData.remark}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-xs disabled:opacity-60 cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Leave Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
