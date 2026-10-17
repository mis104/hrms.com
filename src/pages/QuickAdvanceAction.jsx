import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  MapPin,
  DollarSign,
  Car,
  Building2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';

const QuickAdvanceAction = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const advanceId = searchParams.get('id');
  const serialNo = searchParams.get('serial') || searchParams.get('sr') || searchParams.get('sn');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [advance, setAdvance] = useState(null);
  const [approverName, setApproverName] = useState('Approver');
  const [remarks, setRemarks] = useState('');
  const [completed, setCompleted] = useState(false);
  const [finalStatus, setFinalStatus] = useState('');

  useEffect(() => {
    // Auto-fill approver name if user is logged into HRMS portal
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.Name || u.name) setApproverName(u.Name || u.name);
      }
    } catch (e) {}

    fetchAdvanceDetails();
  }, [advanceId, serialNo]);

  const fetchAdvanceDetails = async () => {
    if (!advanceId && !serialNo) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from('advance').select('*');
      if (advanceId) {
        query = query.eq('id', advanceId);
      } else if (serialNo) {
        query = query.eq('serial_no', serialNo);
      }

      const { data, error } = await query.single();
      if (error) throw error;

      setAdvance(data);
      if (data.status && data.status.toLowerCase() !== 'pending') {
        setCompleted(true);
        setFinalStatus(data.status);
      }
    } catch (err) {
      console.error('Error fetching advance details:', err);
      toast.error('Failed to load advance request');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status) => {
    if (!advance) return;
    try {
      setSubmitting(true);
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const actualTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const { error } = await supabase
        .from('advance')
        .update({
          status: status,
          remarks1: remarks.trim() || status,
          approved_by: approverName.trim() || 'Approver',
          actual: actualTimestamp,
        })
        .eq('id', advance.id);

      if (error) throw error;

      toast.success(`Advance request ${status.toLowerCase()} successfully!`);
      setFinalStatus(status);
      setCompleted(true);
      setAdvance((prev) => ({
        ...prev,
        status: status,
        remarks1: remarks.trim() || status,
        approved_by: approverName.trim() || 'Approver',
      }));
    } catch (err) {
      console.error('Advance action error:', err);
      toast.error(err.message || 'An error occurred while updating advance request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-300">Loading advance request...</p>
        </div>
      </div>
    );
  }

  if (!advance) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-6 text-center text-white space-y-4 shadow-xl">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Advance Request Not Found</h2>
          <p className="text-sm text-slate-400">The advance request link might be invalid or expired.</p>
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
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-200">
              HRMS WhatsApp Quick Action
            </span>
            <h1 className="text-xl font-bold">Advance Request: {advance.serial_no || `#${advance.id}`}</h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              advance.status === 'Approved'
                ? 'bg-emerald-500 text-white'
                : advance.status === 'Rejected'
                ? 'bg-rose-500 text-white'
                : 'bg-amber-400 text-slate-900 animate-pulse'
            }`}
          >
            {advance.status || 'Pending'}
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-slate-200">
          {/* Employee & Travel Info Card */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
                {advance.person_name?.charAt(0) || 'E'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">{advance.person_name}</h3>
                <p className="text-xs text-slate-400">{advance.company_name || 'Piramal Petroleum'}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Requested</span>
                <span className="text-base font-extrabold text-amber-400">₹{advance.advance || '0'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-700/50">
              <div>
                <span className="text-slate-400 block flex items-center gap-1">
                  <MapPin size={12} className="text-rose-400" /> From Location:
                </span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{advance.from_location || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-400" /> To Location:
                </span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{advance.to_location || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block flex items-center gap-1">
                  <Calendar size={12} className="text-amber-400" /> Start Date:
                </span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{advance.start_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block flex items-center gap-1">
                  <Calendar size={12} className="text-amber-400" /> End Date:
                </span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{advance.end_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block flex items-center gap-1">
                  <Car size={12} className="text-sky-400" /> Travel Type:
                </span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{advance.travel_type || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block flex items-center gap-1">
                  <Building2 size={12} className="text-indigo-400" /> Visit Company:
                </span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{advance.company_name || 'N/A'}</span>
              </div>
            </div>

            {advance.remarks && (
              <div className="pt-2 border-t border-slate-700/50">
                <span className="text-xs text-slate-400 block flex items-center gap-1">
                  <FileText size={12} /> Remarks:
                </span>
                <p className="text-xs text-slate-300 mt-1 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/30">
                  {advance.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Action Result / Feedback */}
          {completed ? (
            <div
              className={`p-5 rounded-xl border text-center space-y-2 ${
                finalStatus === 'Approved'
                  ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-600/50 text-rose-300'
              }`}
            >
              {finalStatus === 'Approved' ? (
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
              ) : (
                <XCircle className="w-12 h-12 mx-auto text-rose-400" />
              )}
              <h3 className="font-bold text-lg">Advance {finalStatus}</h3>
              <p className="text-xs text-slate-300">
                Processed by {advance.approved_by || approverName}
              </p>
              {advance.remarks1 && (
                <p className="text-xs italic text-slate-400">"{advance.remarks1}"</p>
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

          {/* Footer Portal Link */}
          <div className="pt-2 text-center">
            <button
              onClick={() => navigate('/ta-da')}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
            >
              Open Full TA/DA System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickAdvanceAction;
