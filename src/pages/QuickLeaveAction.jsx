import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Calendar, User, MapPin, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, updateLeaveStatus } from '../services/supabaseService';
import { 
  triggerLeaveApprovalNotification, 
  triggerLeaveRejectionNotification 
} from '../services/whatsappService';

const QuickLeaveAction = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leaveId = searchParams.get('id');
  const leaveRequestNo = searchParams.get('lr');
  const initialAction = searchParams.get('action'); // 'Approved' or 'Rejected'

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leave, setLeave] = useState(null);
  const [approverName, setApproverName] = useState('Manager');
  const [remarks, setRemarks] = useState('');
  const [completed, setCompleted] = useState(false);
  const [finalStatus, setFinalStatus] = useState('');

  const formatDateToDDMMYYYY = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
    } catch (e) {}
    return String(dateVal);
  };

  useEffect(() => {
    // Check if user is logged in to auto-fill approver name
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.Name || u.name) setApproverName(u.Name || u.name);
      }
    } catch (e) {}

    fetchLeaveDetails();
  }, [leaveId, leaveRequestNo]);

  const fetchLeaveDetails = async () => {
    if (!leaveId && !leaveRequestNo) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from('leave_requests').select('*');
      if (leaveId) {
        query = query.eq('id', leaveId);
      } else if (leaveRequestNo) {
        query = query.eq('leave_request_no', leaveRequestNo);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      setLeave(data);
      if (data.approval_status && data.approval_status !== 'Pending') {
        setCompleted(true);
        setFinalStatus(data.approval_status);
      }
    } catch (err) {
      console.error('Error fetching leave details:', err);
      toast.error('Failed to load leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status) => {
    if (!leave) return;
    try {
      setSubmitting(true);
      const res = await updateLeaveStatus({
        id: leave.id,
        leaveRequestNo: leave.leave_request_no,
        status: status,
        approvedBy: approverName || 'Manager',
        remarks: remarks || '',
      });

      if (res.success) {
        toast.success(`Leave request ${status.toLowerCase()} successfully!`);
        setFinalStatus(status);
        setCompleted(true);

        // Auto-Trigger WhatsApp Notification to Employee
        const notificationPayload = {
          employeeName: leave.requested_by || 'Employee',
          employeePhone: leave.mobile || leave.phone || '',
          designation: leave.department || 'Staff',
          approverName: approverName || 'Manager',
          leaveType: leave.leave_reason || 'Leave',
          fromDate: formatDateToDDMMYYYY(leave.leave_from_date),
          toDate: formatDateToDDMMYYYY(leave.leave_to_date),
          days: leave.total_leaves ? `${leave.total_leaves} Day${Number(leave.total_leaves) > 1 ? 's' : ''}` : '1 Day',
          reason: leave.leave_reason || leave.remark || 'Personal leave',
          remarks: remarks || status,
        };

        if (status === 'Approved') {
          triggerLeaveApprovalNotification(notificationPayload);
        } else if (status === 'Rejected') {
          triggerLeaveRejectionNotification(notificationPayload);
        }
      } else {
        toast.error(res.error || 'Failed to update leave request');
      }
    } catch (err) {
      console.error('Action error:', err);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-300">Loading leave request...</p>
        </div>
      </div>
    );
  }

  if (!leave) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-6 text-center text-white space-y-4 shadow-xl">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Leave Request Not Found</h2>
          <p className="text-sm text-slate-400">The leave request link might be invalid or expired.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl transition"
          >
            Go to HRMS Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-200">HRMS WhatsApp Quick Action</span>
            <h1 className="text-xl font-bold">Leave Request: {leave.leave_request_no}</h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              leave.approval_status === 'Approved'
                ? 'bg-emerald-500 text-white'
                : leave.approval_status === 'Rejected'
                ? 'bg-rose-500 text-white'
                : 'bg-amber-400 text-slate-900 animate-pulse'
            }`}
          >
            {leave.approval_status || 'Pending'}
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-slate-200">
          {/* Employee Info Card */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
                {leave.requested_by?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{leave.requested_by}</h3>
                <p className="text-xs text-slate-400">{leave.department || 'Department'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-700/50">
              <div>
                <span className="text-slate-400 block">From:</span>
                <span className="font-semibold text-slate-200">{leave.leave_from_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">To:</span>
                <span className="font-semibold text-slate-200">{leave.leave_to_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Days:</span>
                <span className="font-semibold text-amber-400">{leave.total_leaves ? `${leave.total_leaves} Days` : 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Location:</span>
                <span className="font-semibold text-slate-200">{leave.job_location || 'N/A'}</span>
              </div>
            </div>

            {leave.leave_reason && (
              <div className="pt-2 border-t border-slate-700/50">
                <span className="text-xs text-slate-400 block">Reason:</span>
                <p className="text-xs text-slate-300 mt-0.5 bg-slate-800/80 p-2 rounded-lg">{leave.leave_reason}</p>
              </div>
            )}

            {leave.remark && (
              <div>
                <span className="text-xs text-slate-400 block">Remark:</span>
                <p className="text-xs text-slate-300 mt-0.5">{leave.remark}</p>
              </div>
            )}
          </div>

          {/* If already actioned */}
          {completed ? (
            <div className={`p-4 rounded-xl border text-center space-y-2 ${
              finalStatus === 'Approved'
                ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-600/50 text-rose-300'
            }`}>
              {finalStatus === 'Approved' ? (
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
              ) : (
                <XCircle className="w-12 h-12 mx-auto text-rose-400" />
              )}
              <h3 className="font-bold text-lg">Leave {finalStatus}</h3>
              <p className="text-xs text-slate-300">
                Processed by {leave.approved_by || approverName}
              </p>
              {leave.approval_remarks && (
                <p className="text-xs italic text-slate-400">"{leave.approval_remarks}"</p>
              )}
            </div>
          ) : (
            /* Action Controls */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Approver Name</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any comment or remark..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  disabled={submitting}
                  onClick={() => handleAction('Approved')}
                  className="flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Approve</span>
                </button>

                <button
                  disabled={submitting}
                  onClick={() => handleAction('Rejected')}
                  className="flex items-center justify-center space-x-2 py-3 px-4 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-rose-900/30 transition disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer link to portal */}
          <div className="pt-2 text-center">
            <button
              onClick={() => navigate('/leave-management')}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
            >
              Open Full Leave Management System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickLeaveAction;
