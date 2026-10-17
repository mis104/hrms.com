import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Calendar, Clock, CheckCircle, AlertCircle, Filter, Sparkles, ChevronRight, Download, Share2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { fetchLeaveRequests, createLeaveRequest, supabase } from '../services/supabaseService';
import { triggerLeaveRequestNotification } from '../services/whatsappService';
import { getAppBaseUrl } from '../utils/urlHelper';

const LEAVE_PAGE_SIZE = 50;


const LeaveRequest = () => {
  const employeeId = localStorage.getItem("employeeId");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : {};
  const isAdmin = (user.Admin || user.admin || '').toString().trim().toLowerCase() === 'yes';
  const [tableLoading, setTableLoading] = useState(false);
  const [leavesData, setLeavesData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [requestedByFilter, setRequestedByFilter] = useState(isAdmin ? 'all' : (user.Name || ''));
  const [visibleLimit, setVisibleLimit] = useState(LEAVE_PAGE_SIZE);
  const [employeeDetailsLoading, setEmployeeDetailsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const leaveFetchInProgressRef = useRef(false);
  const employeeDetailsLoadedRef = useRef(false);
  const employeeFetchInProgressRef = useRef(false);
  const [formData, setFormData] = useState({
    employeeId: employeeId,
    employeeName: user.Name || '',
    designation: '',
    department: '',
    jobLocation: '',
    fromDate: '',
    toDate: '',
    halfDay: '',
    reason: '',
    remark: '',
    imageUrl: ''
  });


  const departmentOptions = [
    'Sales Head',
    'MDO',
    'HR',
    'Sales',
    'Digital Marketing',
    'Accounts',
    'Plants',
    'Directors'
  ];
  // Fetch employee data including designation from Supabase joining_fms table
  const fetchEmployeeData = async () => {
    if (employeeDetailsLoadedRef.current || employeeFetchInProgressRef.current) {
      return;
    }

    try {
      employeeFetchInProgressRef.current = true;
      setEmployeeDetailsLoading(true);
      const userName = user.Name || user.name || '';
      if (!userName) return;

      const { data, error } = await supabase
        .from('joining_fms')
        .select('employee_code, candidate_name, name_as_per_aadhar, designation, joining_place')
        .or(`candidate_name.ilike.%${userName}%,name_as_per_aadhar.ilike.%${userName}%`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const emp = data[0];
        setFormData(prev => ({
          ...prev,
          employeeId: emp.employee_code || prev.employeeId,
          designation: emp.designation || prev.designation,
          jobLocation: emp.joining_place || prev.jobLocation
        }));
        employeeDetailsLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Error fetching employee data from Supabase:', error);
    } finally {
      employeeFetchInProgressRef.current = false;
      setEmployeeDetailsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: uploadData }
      );
      const cloudinaryData = await cloudinaryRes.json();
      if (!cloudinaryData.secure_url) throw new Error("Upload failed");

      setFormData(prev => ({
        ...prev,
        imageUrl: cloudinaryData.secure_url
      }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  const handleRequestedByChange = (e) => {
    setRequestedByFilter(e.target.value);
  };

  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return '';

    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      return `${day}-${month}-${dateValue.getFullYear()}`;
    }

    const rawValue = dateValue.toString().trim();
    if (!rawValue) return '';

    // If Excel serial number
    if (!isNaN(Number(rawValue)) && Number(rawValue) > 20000 && Number(rawValue) < 60000) {
      const jsDate = new Date(Math.round((Number(rawValue) - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        const d = String(jsDate.getUTCDate()).padStart(2, '0');
        const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
        const y = jsDate.getUTCFullYear();
        return `${d}-${m}-${y}`;
      }
    }

    // Handle full ISO datetime strings
    if (rawValue.includes('T') || rawValue.includes('Z')) {
      const parsedDate = new Date(rawValue);
      if (!isNaN(parsedDate.getTime())) {
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        return `${day}-${month}-${parsedDate.getFullYear()}`;
      }
    }

    // Match YYYY-MM-DD
    const isoMatch = rawValue.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[3].padStart(2, '0')}-${isoMatch[2].padStart(2, '0')}-${isoMatch[1]}`;
    }

    // Match DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = rawValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
      const month = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
      const year = dmyMatch[3];
      return `${day}-${month}-${year}`;
    }

    const parsedDate = new Date(rawValue);
    if (isNaN(parsedDate.getTime())) return rawValue;

    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${parsedDate.getFullYear()}`;
  };

  const parseSheetDate = (dateValue) => {
    const formattedDate = formatDateToDDMMYYYY(dateValue);
    if (!formattedDate || !formattedDate.includes('-')) return null;
    const [day, month, year] = formattedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  };


  const calculateDays = (startDateStr, endDateStr) => {
    const startDate = parseSheetDate(startDateStr);
    const endDate = parseSheetDate(endDateStr);
    if (!startDate || !endDate) return 0;

    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDOB = (dateString) => formatDateToDDMMYYYY(dateString);

  // Function to parse date string in DD/MM/YYYY format
  const parseDate = (dateStr) => {
    if (!dateStr) return null;

    return parseSheetDate(dateStr);
  };

  // Check if a date falls within a specific month and year
  const isDateInSelectedPeriod = (dateStr, monthIndex, year) => {
    if (!dateStr || monthIndex === 'all') return true;

    const date = parseDate(dateStr);
    if (!date) return false;

    return date.getMonth() === parseInt(monthIndex) && date.getFullYear() === parseInt(year);
  };

  const isDateInSelectedYear = (dateStr, year) => {
    if (!dateStr) return false;
    const date = parseDate(dateStr);
    if (!date) return false;
    return date.getFullYear() === parseInt(year);
  };

  const formatSheetTimestamp = () => {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  };

  const formatLeaveDays = (fromDate, toDate, halfDay = '') => {
    const days = halfDay ? 0.5 : calculateDays(fromDate, toDate);
    if (!days) return '';
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };

  const hasSheetValue = (value) =>
    value !== null && value !== undefined && value.toString().trim() !== '';

  const normalizeApprovalStatus = (status) => {
    const value = status?.toString().trim().toLowerCase();
    if (value === 'approved' || value === 'approve') return 'approved';
    if (value === 'rejected' || value === 'reject') return 'rejected';
    return '';
  };

  const getApprovalStatus = (row) => {
    const approvalStatus = normalizeApprovalStatus(row[15]);
    if (approvalStatus) return approvalStatus;
    if (hasSheetValue(row[11]) && !hasSheetValue(row[12])) return 'Pending';
    return '';
  };

  const getNextLeaveRequestNo = (rows) => {
    const maxNo = rows
      .slice(LEAVE_DATA_START_INDEX)
      .reduce((max, row) => {
        const match = row[1]?.toString().match(/LR-?(\d+)/i);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);

    return `LR-${String(maxNo + 1).padStart(2, '0')}`;
  };

  const mapLeaveRow = (row, index) => {
    let displayDays = row[4] || '';
    if (displayDays && !isNaN(Number(displayDays))) {
      const num = Number(displayDays);
      displayDays = `${num} ${num === 1 ? 'day' : 'days'}`;
    } else if (!displayDays) {
      displayDays = formatLeaveDays(row[6], row[7]);
    }

    return {
      id: index + 1,
      timestamp: row[0] || '',
      leaveRequestId: row[1] || '',
      requestedBy: row[2] || '',
      department: row[3] || '',
      totalLeaves: displayDays,
      jobLocation: row[5] || '',
      leaveFromDate: row[6] || '',
      leaveToDate: row[7] || '',
      leaveReason: row[8] || '',
      remark: row[9] || '',
      imageUrl: row[10] || '',
      approvalPlanned: row[11] || '',
      approvalActual: row[12] || '',
      approvalDelay: row[13] || '',
      approvedBy: row[14] || '',
      approvalStatus: row[15] || '',
      approvalRemarks: row[16] || '',
      serialNo: row[1] || '',
      employeeId: row[1] || '',
      employeeName: row[2] || '',
      startDate: row[6] || '',
      endDate: row[7] || '',
      reason: row[8] || '',
      days: displayDays,
      status: getApprovalStatus(row),
      approvalPending: hasSheetValue(row[11]) && !hasSheetValue(row[12]),
      appliedDate: row[0] || '',
    };
  };

  const processLeaveRows = (rows) => {
    const currentUserName = user.Name?.toString().trim().toLowerCase();
    return rows
      .map((row, index) => mapLeaveRow(row, index))
      .filter((item) =>
        isAdmin || item.employeeName?.toString().trim().toLowerCase() === currentUserName
      );
  };

  const fetchLeaveData = async () => {
    if (leaveFetchInProgressRef.current) {
      return;
    }

    leaveFetchInProgressRef.current = true;
    setTableLoading(true);
    setError(null);

    try {
      const res = await fetchLeaveRequests({
        limit: 500,
        requestedBy: isAdmin ? (requestedByFilter === 'all' ? null : requestedByFilter) : (user.Name || null),
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch leave data');
      }

      const processedData = (res.data || []).map((row, index) => {
        let displayDays = row.total_leaves ? `${row.total_leaves} ${row.total_leaves === 1 ? 'day' : 'days'}` : '';
        if (!displayDays && row.leave_from_date && row.leave_to_date) {
          displayDays = formatLeaveDays(row.leave_from_date, row.leave_to_date);
        }

        return {
          id: row.id,
          timestamp: row.timestamp || row.created_at,
          leaveRequestId: row.leave_request_no || `LR-${index + 1}`,
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
          approvalStatus: row.approval_status || 'Pending',
          approvalRemarks: row.approval_remarks || '',
          serialNo: row.leave_request_no || `LR-${index + 1}`,
          employeeId: row.leave_request_no || '',
          employeeName: row.requested_by || '',
          startDate: row.leave_from_date || '',
          endDate: row.leave_to_date || '',
          reason: row.leave_reason || '',
          days: displayDays,
          status: row.approval_status || 'Pending',
          approvalPending: (row.approval_status || 'Pending').toLowerCase() === 'pending',
          appliedDate: row.timestamp || row.created_at,
        };
      });

      setLeavesData(processedData);

    } catch (error) {
      console.error('Error fetching leave data:', error);
      setError(error.message);
      toast.error(`Failed to load leave data: ${error.message}`);
    } finally {
      leaveFetchInProgressRef.current = false;
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [requestedByFilter]);

  useEffect(() => {
    if (showModal) {
      fetchEmployeeData();
    }
  }, [showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeName || !formData.department || !formData.jobLocation || !formData.fromDate || !formData.toDate || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const halfDayRemark = formData.halfDay ? `${formData.halfDay}${formData.remark ? ` - ${formData.remark}` : ''}` : formData.remark;
      const rawDays = formData.halfDay ? 0.5 : calculateDays(formData.fromDate, formData.toDate);

      const res = await createLeaveRequest({
        requested_by: formData.employeeName,
        department: formData.department || formData.designation,
        total_leaves: rawDays || 1,
        job_location: formData.jobLocation || '',
        leave_from_date: formatDOB(formData.fromDate),
        leave_to_date: formatDOB(formData.toDate),
        leave_reason: formData.reason,
        remark: halfDayRemark,
        image_url: formData.imageUrl || null,
      });

      if (res.success && res.data) {
        const created = res.data;
        const optimisticLeave = {
          id: created.id,
          timestamp: created.timestamp || new Date().toISOString(),
          leaveRequestId: created.leave_request_no,
          requestedBy: created.requested_by,
          department: created.department,
          totalLeaves: `${rawDays} ${rawDays === 1 ? 'day' : 'days'}`,
          jobLocation: created.job_location,
          leaveFromDate: created.leave_from_date,
          leaveToDate: created.leave_to_date,
          leaveReason: created.leave_reason,
          remark: created.remark,
          imageUrl: created.image_url,
          approvalStatus: 'Pending',
          serialNo: created.leave_request_no,
          employeeName: created.requested_by,
          startDate: created.leave_from_date,
          endDate: created.leave_to_date,
          reason: created.leave_reason,
          days: `${rawDays} ${rawDays === 1 ? 'day' : 'days'}`,
          status: 'Pending',
          approvalPending: true,
          appliedDate: created.timestamp,
        };

        setLeavesData((prev) => [optimisticLeave, ...prev]);
        toast.success('Leave Request submitted successfully!');

        // Generate WhatsApp 1-click Approval Link
        const appBaseUrl = getAppBaseUrl();
        const shareUrl = `${appBaseUrl}/quick-leave?lr=${created.leave_request_no}&id=${created.id}`;
        
        // Auto-Trigger WhatsApp alert via Maytapi Gateway
        triggerLeaveRequestNotification({
          employeeName: formData.employeeName,
          employeeId: employeeId || 'EMP',
          designation: formData.designation || formData.department || 'Staff',
          jobLocation: formData.jobLocation || 'Plant Location',
          department: formData.department || formData.designation,
          leaveType: formData.reason || 'Leave Application',
          fromDate: formatDOB(formData.fromDate),
          toDate: formatDOB(formData.toDate),
          days: `${rawDays} ${rawDays === 1 ? 'day' : 'days'}`,
          reason: formData.reason || 'Personal work',
          remark: halfDayRemark || 'Submitted for approval',
          lrNo: created.leave_request_no,
          approvalLink: shareUrl,
        });

        const whatsappMsg = `*Leave Request Application*\n\n` +
          `*LR No:* ${created.leave_request_no}\n` +
          `*Employee:* ${formData.employeeName}\n` +
          `*Department:* ${formData.department || formData.designation}\n` +
          `*Dates:* ${formatDOB(formData.fromDate)} to ${formatDOB(formData.toDate)} (${rawDays} Days)\n` +
          `*Reason:* ${formData.reason}\n\n` +
          `👉 *1-Click Manager Approval Link:*\n${shareUrl}`;

        const openWA = window.confirm(`Leave request submitted successfully (${created.leave_request_no})!\n\nDo you want to send the 1-click Approval Link to Manager on WhatsApp?`);
        if (openWA) {
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
        }

        setFormData({
          employeeId: employeeId,
          employeeName: user.Name || '',
          designation: formData.designation || '',
          department: formData.department || '',
          jobLocation: formData.jobLocation || '',
          fromDate: '',
          toDate: '',
          halfDay: '',
          reason: '',
          remark: '',
          imageUrl: ''
        });
        setShowModal(false);
        fetchLeaveData();
      } else {
        toast.error('Failed to submit: ' + (res.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Insert error:', error);
      toast.error('Something went wrong!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLeave = async (request) => {
    const lrTitle = request.leaveRequestId || 'this leave request';
    const empTitle = request.requestedBy || request.employeeName || '';
    if (!window.confirm(`Are you sure you want to delete ${lrTitle}${empTitle ? ` for ${empTitle}` : ''}?`)) {
      return;
    }

    try {
      const toastId = toast.loading('Deleting leave request...');
      let query = supabase.from('leave_requests').delete();

      if (request.id) {
        query = query.eq('id', request.id);
      } else if (request.leaveRequestId) {
        query = query.eq('leave_request_no', request.leaveRequestId);
      } else {
        throw new Error('No record ID found to delete');
      }

      const { error: delError } = await query;
      if (delError) throw delError;

      toast.success(`${lrTitle} deleted successfully!`, { id: toastId });
      setLeavesData((prev) => prev.filter((item) => item.id !== request.id && item.leaveRequestId !== request.leaveRequestId));
    } catch (err) {
      console.error('Delete leave error:', err);
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const hasSubmittedToday = useMemo(() => {
    const today = new Date();
    const todayStr = formatDateToDDMMYYYY(today);
    const currentUserName = user.Name?.toString().toLowerCase().trim();

    if (!currentUserName) {
      return false;
    }

    return leavesData.some(leave => {
      // Case-insensitive employee name comparison
      if (!leave.timestamp || !leave.employeeName ||
        leave.employeeName.toString().toLowerCase().trim() !== currentUserName) {
        return false;
      }

      // Extract date part from timestamp (M/D/YYYY H:M:S format from sheet)
      return formatDateToDDMMYYYY(leave.timestamp) === todayStr;
    });
  }, [leavesData, user.Name]);

  // Generate year options (current year and previous 5 years)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }

    return years;
  };

  const yearOptions = getYearOptions();

  const requestedByOptions = useMemo(() => {
    if (!isAdmin) {
      return user.Name ? [user.Name] : [];
    }

    return [...new Set(
      leavesData
        .map((leave) => leave.requestedBy || leave.employeeName)
        .filter(Boolean)
    )].sort();
  }, [isAdmin, leavesData, user.Name]);

  const matchesRequestedByFilter = (leave) =>
    requestedByFilter === 'all' || (leave.requestedBy || leave.employeeName) === requestedByFilter;

  const visibleLeaves = useMemo(() => (
    isAdmin
      ? leavesData
      : leavesData.filter((leave) =>
        leave.employeeName?.toString().trim().toLowerCase() === user.Name?.toString().trim().toLowerCase()
      )
  ), [isAdmin, leavesData, user.Name]);

  const parseLeaveDaysValue = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;

    const normalized = value.toString().trim().toLowerCase();
    if (!normalized) return 0;
    if (/^1\s*\/\s*2/.test(normalized)) return 0.5;

    const numberMatch = normalized.match(/\d+(?:\.\d+)?/);
    let days = numberMatch ? Number(numberMatch[0]) : 0;
    const hasHalf = /half|haf|hanf|1\s*\/\s*2/.test(normalized);

    if (hasHalf && !normalized.includes('0.5')) {
      days += 0.5;
    }

    return Number.isFinite(days) ? days : 0;
  };

  const getLeaveDayCount = (leave) => {
    const daysFromColumnE = parseLeaveDaysValue(leave.totalLeaves || leave.days);
    return daysFromColumnE || calculateDays(leave.startDate, leave.endDate);
  };

  const formatLeaveCount = (value) =>
    Number.isInteger(value) ? value : Number(value.toFixed(1));

  // Generate month options for the dropdown
  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

  const filteredLeaveRequests = useMemo(() => visibleLeaves.filter(leave => {
    const requestedByMatch = matchesRequestedByFilter(leave);
    const matchesYear = selectedMonth === 'all'
      ? (
        isDateInSelectedYear(leave.startDate, selectedYear) ||
        isDateInSelectedYear(leave.endDate, selectedYear) ||
        (!leave.startDate && !leave.endDate)
      )
      : (
        isDateInSelectedPeriod(leave.startDate, selectedMonth, selectedYear) ||
        isDateInSelectedPeriod(leave.endDate, selectedMonth, selectedYear)
      );

    return requestedByMatch && matchesYear;
  }), [visibleLeaves, selectedMonth, selectedYear, requestedByFilter]);

  useEffect(() => {
    setVisibleLimit(LEAVE_PAGE_SIZE);
  }, [selectedMonth, selectedYear, requestedByFilter]);

  const displayedLeaveRequests = useMemo(
    () => filteredLeaveRequests.slice(0, visibleLimit),
    [filteredLeaveRequests, visibleLimit]
  );

  const leaveDaySummary = useMemo(() => filteredLeaveRequests.reduce(
    (summary, leave) => {
      const dayCount = getLeaveDayCount(leave);
      const status = leave.status?.toString().toLowerCase();

      summary.total += dayCount;

      if (status === 'approved') {
        summary.approved += dayCount;
      } else if (status === 'pending') {
        summary.pending += dayCount;
      } else if (status === 'rejected') {
        summary.rejected += dayCount;
      }

      return summary;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 }
  ), [filteredLeaveRequests]);

  const leaveSummaryCards = useMemo(() => ([
    { label: 'Paid Leave', value: leaveDaySummary.total, subtext: 'Total leave days', icon: Calendar, iconClass: 'text-navy', bgClass: 'bg-indigo-100' },
    { label: 'Approved Leave', value: leaveDaySummary.approved, subtext: 'Approved leave days', icon: CheckCircle, iconClass: 'text-green-600', bgClass: 'bg-green-100' },
    { label: 'Pending Leave', value: leaveDaySummary.pending, subtext: 'Pending leave days', icon: Clock, iconClass: 'text-yellow-600', bgClass: 'bg-yellow-100' },
    { label: 'Rejected Leave', value: leaveDaySummary.rejected, subtext: 'Rejected leave days', icon: AlertCircle, iconClass: 'text-red-600', bgClass: 'bg-red-100' },
  ]), [leaveDaySummary]);

  const getStatusMeta = (status) => {
    const value = status?.toString().trim().toLowerCase();
    if (value === 'approved') {
      return {
        label: 'Approved',
        icon: CheckCircle,
        cardClass: 'bg-green-50 border-green-200',
        badgeClass: 'bg-green-100 text-green-800 border-green-200',
        iconClass: 'text-green-600',
      };
    }
    if (value === 'rejected') {
      return {
        label: 'Rejected',
        icon: AlertCircle,
        cardClass: 'bg-red-50 border-red-200',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        iconClass: 'text-red-600',
      };
    }
    return {
      label: 'Pending',
      icon: Clock,
      cardClass: 'bg-yellow-50 border-yellow-200',
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      iconClass: 'text-yellow-600',
    };
  };

  const DetailItem = ({ label, value, className = '' }) => (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900 break-words">{value || '-'}</p>
    </div>
  );

  const selectedLeaveStatusMeta = selectedLeaveRequest ? getStatusMeta(selectedLeaveRequest.status) : null;
  const SelectedLeaveStatusIcon = selectedLeaveStatusMeta?.icon;

  const handleDownloadExcel = () => {
    if (!filteredLeaveRequests || filteredLeaveRequests.length === 0) {
      toast.error("No data available to download");
      return;
    }

    const exportData = filteredLeaveRequests.map((leave, index) => ({
      "S.No": index + 1,
      "Leave Request ID": leave.leaveRequestId || leave.id,
      "Requested By": leave.requestedBy || leave.employeeName,
      "Department": leave.department,
      "Job Location": leave.jobLocation,
      "Total Leaves (Days)": leave.days,
      "Leave From Date": formatDOB(leave.startDate),
      "Leave To Date": formatDOB(leave.endDate),
      "Leave Reason": leave.reason,
      "Remark": leave.remark,
      "Applied Date": formatDOB(leave.appliedDate),
      "Approval Status": leave.status,
      "Approved By": leave.approvedBy,
      "Approval Remarks": leave.approvalRemarks,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Requests");
    
    XLSX.writeFile(workbook, `Leave_Requests_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  return (
    <div className="page-content min-h-screen bg-[#f4f7fb] px-4 pb-24 pt-5 text-slate-950 sm:p-6">
      <div className="w-full space-y-5 lg:max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Employee Self Service</p>
            <h1 className="text-2xl font-black text-slate-950">Leave Request & Application</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={handleDownloadExcel}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-900 shadow-sm hover:bg-slate-50 transition"
              >
                <Download size={14} className="mr-2 text-slate-600" />
                Download Excel
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-5 text-xs font-black text-white shadow-md hover:bg-slate-800 transition"
            >
              <Plus size={15} className="mr-2" />
              Apply Leave
            </button>
          </div>
        </div>

        {/* 1. TOP SUMMARY STATS */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400">Total Leave Days</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{formatLeaveCount(leaveDaySummary.total)}</h3>
            <p className="text-[10px] font-semibold text-slate-500">All applied leaves</p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-emerald-600">Approved Days</p>
            <h3 className="mt-1 text-2xl font-black text-emerald-800">{formatLeaveCount(leaveDaySummary.approved)}</h3>
            <p className="text-[10px] font-semibold text-emerald-600">Approved by manager</p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-amber-600">Pending Days</p>
            <h3 className="mt-1 text-2xl font-black text-amber-800">{formatLeaveCount(leaveDaySummary.pending)}</h3>
            <p className="text-[10px] font-semibold text-amber-600">Awaiting approval</p>
          </div>

          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-rose-600">Rejected Days</p>
            <h3 className="mt-1 text-2xl font-black text-rose-800">{formatLeaveCount(leaveDaySummary.rejected)}</h3>
            <p className="text-[10px] font-semibold text-rose-600">Not approved</p>
          </div>
        </div>

        {/* 2. FILTER BAR */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={15} className="text-slate-500" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-700">Filter History</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter by Month</label>
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              >
                {monthOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Requested By</label>
              <select
                value={requestedByFilter}
                onChange={handleRequestedByChange}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              >
                {isAdmin && <option value="all">All Employees</option>}
                {requestedByOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. LEAVE REQUESTS HISTORY TABLE */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">Leave Requests History</h2>
            <span className="text-xs text-slate-500 font-bold">
              Showing {Math.min(visibleLimit, filteredLeaveRequests.length)} of {filteredLeaveRequests.length} records
            </span>
          </div>

          <div className="p-4">
            {tableLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
              </div>
            ) : filteredLeaveRequests.length > 0 ? (
              <div className="space-y-3">
                {displayedLeaveRequests.map((request) => {
                  const statusMeta = getStatusMeta(request.status);
                  const StatusIcon = statusMeta.icon;

                  return (
                    <article
                      key={request.leaveRequestId || request.id}
                      className={`rounded-xl border p-4 shadow-sm transition ${statusMeta.cardClass}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-sm text-slate-950">{request.leaveRequestId || 'LR'}</span>
                            <span className="font-bold text-xs text-slate-700">• {request.requestedBy || request.employeeName}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusMeta.badgeClass}`}>
                              <StatusIcon size={12} className={statusMeta.iconClass} />
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 font-semibold">
                            📅 {formatDOB(request.startDate)} to {formatDOB(request.endDate)} &nbsp;|&nbsp; ⏳ {request.days || '-'} &nbsp;|&nbsp; 🏢 {request.department} ({request.jobLocation || 'N/A'})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {request.imageUrl && (
                            <a
                              href={request.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                            >
                              Image
                              <ChevronRight size={13} />
                            </a>
                          )}

                          <button
                            title="Share on WhatsApp"
                            onClick={() => {
                              const shareUrl = `${getAppBaseUrl()}/quick-leave?lr=${request.leaveRequestId}&id=${request.id}`;
                              const text = `*Leave Request Approval Needed*\n\n` +
                                `*LR No:* ${request.leaveRequestId}\n` +
                                `*Employee:* ${request.requestedBy || request.employeeName}\n` +
                                `*Dates:* ${formatDOB(request.startDate)} to ${formatDOB(request.endDate)} (${request.days})\n` +
                                `*Reason:* ${request.reason || '-'}\n\n` +
                                `👉 *1-Click Approval Link:* ${shareUrl}`;
                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-emerald-200 transition"
                          >
                            <Share2 size={15} />
                          </button>

                          {isAdmin && (
                            <button
                              title="Delete Leave Request"
                              onClick={() => handleDeleteLeave(request)}
                              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs pt-2 border-t border-slate-200/60">
                        <div>
                          <span className="font-bold text-slate-500">Reason: </span>
                          <span className="text-slate-800">{request.reason || '-'}</span>
                        </div>
                        {request.remark && (
                          <div>
                            <span className="font-bold text-slate-500">Remark: </span>
                            <span className="text-slate-800">{request.remark}</span>
                          </div>
                        )}
                        {request.approvedBy && (
                          <div>
                            <span className="font-bold text-slate-500">Processed By: </span>
                            <span className="text-slate-800">{request.approvedBy} ({formatDOB(request.approvalActual)})</span>
                          </div>
                        )}
                        {request.approvalRemarks && (
                          <div>
                            <span className="font-bold text-slate-500">Approval Remark: </span>
                            <span className="text-slate-800">{request.approvalRemarks}</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}

                {visibleLimit < filteredLeaveRequests.length && (
                  <div className="pt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleLimit((limit) => limit + LEAVE_PAGE_SIZE)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Load More ({filteredLeaveRequests.length - visibleLimit} remaining)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p>No leave requests found for the selected filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. POPUP MODAL: New Leave Application Form */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-slate-50/80 shrink-0">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  New Leave Application Form
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Fill in details below to submit for manager approval</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 overflow-y-auto" autoComplete="off">
              {/* Row 1: 3 columns */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Employee Name *</label>
                  <input
                    type="text"
                    name="employeeName"
                    value={formData.employeeName}
                    onChange={handleInputChange}
                    className="w-full h-9 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full h-9 border border-slate-200 rounded-lg px-2 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    required
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Job Location *</label>
                  <input
                    type="text"
                    name="jobLocation"
                    value={formData.jobLocation}
                    onChange={handleInputChange}
                    placeholder="e.g. Raipur / Site"
                    className="w-full h-9 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Row 2: 4 columns */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Date From *</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    className="w-full h-9 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Date To *</label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    className="w-full h-9 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Days (Auto)</label>
                  <input
                    type="text"
                    value={formatLeaveDays(formData.fromDate, formData.toDate, formData.halfDay) || '0 days'}
                    className="w-full h-9 border border-slate-200 rounded-lg px-2.5 text-xs font-bold bg-amber-50 text-amber-900 focus:outline-none"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Leave Type</label>
                  <select
                    name="halfDay"
                    value={formData.halfDay}
                    onChange={handleInputChange}
                    className="w-full h-9 border border-slate-200 rounded-lg px-2 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                  >
                    <option value="">Full Day</option>
                    <option value="1st Half">1st Half (0.5 Day)</option>
                    <option value="2nd Half">2nd Half (0.5 Day)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Reason + Remark side by side */}
              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Reason for Taking Leave *</label>
                  <input
                    type="text"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="w-full h-9 border border-slate-200 rounded-lg px-2.5 text-xs font-medium bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    placeholder="Enter reason for leave..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Attach Image (Optional)</label>
                  <label className="flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition">
                    {uploadingImage ? 'Uploading...' : formData.imageUrl ? '✓ Attached' : '+ Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Remark (Optional)</label>
                <input
                  type="text"
                  name="remark"
                  value={formData.remark}
                  onChange={handleInputChange}
                  className="w-full h-9 border border-slate-200 rounded-lg px-2.5 text-xs font-medium bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                  placeholder="Enter any additional remark..."
                />
              </div>

              {/* Submit Bar */}
              <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs font-black text-white shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Leave Application'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeaveRequest;

