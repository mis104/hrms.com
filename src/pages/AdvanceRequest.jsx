import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Building2,
  DollarSign,
  FileText,
  User,
  MapPin,
  CheckCircle2,
  Loader2,
  X,
  History,
  ArrowLeft,
  Briefcase,
  Car,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import { triggerAdvanceRequestNotification } from '../services/whatsappService';
import { getAppBaseUrl } from '../utils/urlHelper';

const AdvanceRequest = ({ isModal = false, onClose }) => {
  const navigate = useNavigate();

  // Get current logged-in employee
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : {};
  const employeeName =
    user.Name || user.name || user.displayName || user.Username || 'Employee';

  const [employeeDept, setEmployeeDept] = useState(
    user.department || user.Department || user.joining_place || user.designation || ''
  );

  useEffect(() => {
    let isMounted = true;
    const fetchDept = async () => {
      if (!employeeName || employeeName === 'Employee') return;
      try {
        const { data } = await supabase
          .from('joining_fms')
          .select('joining_place, designation')
          .or(`candidate_name.ilike.%${employeeName}%,name_as_per_aadhar.ilike.%${employeeName}%`)
          .limit(1)
          .maybeSingle();

        if (isMounted && data) {
          const detected = data.joining_place || data.designation || '';
          if (detected) setEmployeeDept(detected);
        }
      } catch (e) {}
    };
    fetchDept();
    return () => { isMounted = false; };
  }, [employeeName]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [formData, setFormData] = useState({
    salesPersonName: employeeName,
    fromLocation: '',
    toLocation: '',
    startDate: todayStr,
    endDate: todayStr,
    travelType: '',
    advanceAmount: '',
    visitCompanyName: '',
    remarks: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const travelOptions = [
    'Train',
    'Flight',
    'Bus',
    'Rental Car',
    'Bike',
    'Taxi',
    'Other',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const formatDisplayDate = (isoStr) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const getNextSerialNo = async () => {
    try {
      const { data, error } = await supabase
        .from('advance')
        .select('serial_no')
        .order('id', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        let maxNum = 0;
        data.forEach((r) => {
          const match = String(r.serial_no || '').match(/AD-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        return `AD-${String(maxNum + 1).padStart(3, '0')}`;
      }
    } catch (e) {
      console.warn('Failed to get max serial_no, fallback:', e);
    }
    return `AD-${String(Math.floor(Math.random() * 900) + 100)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fromLocation.trim()) {
      toast.error('Please enter From Location');
      return;
    }
    if (!formData.toLocation.trim()) {
      toast.error('Please enter To Location');
      return;
    }
    if (!formData.travelType) {
      toast.error('Please select Travel Type');
      return;
    }
    if (!formData.advanceAmount || Number(formData.advanceAmount) <= 0) {
      toast.error('Please enter valid Advance Amount');
      return;
    }
    if (!formData.visitCompanyName.trim()) {
      toast.error('Please enter Visit Company Name');
      return;
    }

    setSubmitting(true);

    try {
      const nextSerial = await getNextSerialNo();
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const formattedTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const payload = {
        timestamp: formattedTimestamp,
        serial_no: nextSerial,
        person_name: formData.salesPersonName.trim(),
        from_location: formData.fromLocation.trim(),
        to_location: formData.toLocation.trim(),
        start_date: formatDisplayDate(formData.startDate),
        end_date: formatDisplayDate(formData.endDate),
        travel_type: formData.travelType,
        advance: Number(formData.advanceAmount),
        company_name: formData.visitCompanyName.trim(),
        remarks: formData.remarks.trim(),
        planned: formattedTimestamp,
        actual: '',
        delay: '',
        status: 'Pending',
        remarks1: '',
        approved_by: '',
      };

      const { data, error } = await supabase
        .from('advance')
        .insert([payload])
        .select();

      if (error) throw error;

      toast.success(`Advance request submitted (${nextSerial})!`);
      setSubmittedData({ ...payload, id: data?.[0]?.id });

      // Auto-trigger WhatsApp notification to Neha Garg / Sales Head HODs
      triggerAdvanceRequestNotification({
        personName: payload.person_name,
        fromLocation: payload.from_location,
        toLocation: payload.to_location,
        travelType: payload.travel_type,
        startDate: payload.start_date,
        endDate: payload.end_date,
        advance: payload.advance,
        companyName: payload.company_name,
        remarks: payload.remarks,
        approvedLink: `${getAppBaseUrl()}/quick-advance?serial=${encodeURIComponent(nextSerial)}&id=${data?.[0]?.id}`,
        department: employeeDept || user.department || "Sales Head",
      }).catch((err) => {
        console.warn("Advance notification dispatch notice:", err);
      });
    } catch (err) {
      console.error('Error submitting advance request:', err);
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    setFormData({
      salesPersonName: employeeName,
      fromLocation: '',
      toLocation: '',
      startDate: todayStr,
      endDate: todayStr,
      travelType: '',
      advanceAmount: '',
      visitCompanyName: '',
      remarks: '',
    });
  };

  const goToHistory = () => {
    if (onClose) onClose();
    navigate('/ta-da?tab=advance');
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedData) {
    return (
      <div className={`${isModal ? 'p-3 sm:p-6 h-full overflow-y-auto flex flex-col justify-start sm:justify-center' : 'max-w-4xl mx-auto p-4 sm:p-6'}`}>
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center p-6 sm:p-12 animate-fadeIn my-auto">
          <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            Advance Request Submitted!
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Reference Serial No:{' '}
            <span className="font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full text-base">
              {submittedData.serial_no}
            </span>
          </p>

          <div className="bg-slate-50 rounded-2xl p-6 text-left max-w-lg mx-auto mb-8 space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Employee</span>
              <span className="font-bold text-slate-800">{submittedData.person_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Route</span>
              <span className="font-bold text-slate-800">
                {submittedData.from_location} → {submittedData.to_location}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Duration</span>
              <span className="font-bold text-slate-800">
                {submittedData.start_date} to {submittedData.end_date}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Travel Type</span>
              <span className="font-bold text-slate-800">{submittedData.travel_type}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Advance Amount</span>
              <span className="font-bold text-teal-700 text-base">₹{submittedData.advance}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Visit Company</span>
              <span className="font-bold text-slate-800">{submittedData.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Status</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs">
                {submittedData.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-md"
            >
              Submit Another Request
            </button>
            <button
              onClick={goToHistory}
              className="px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition"
            >
              View in TA & DA Bills
            </button>
            {isModal && (
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MAIN FORM CONTENT
  const formContent = (
    <div className={`w-full bg-white ${isModal ? 'h-full flex flex-col overflow-hidden' : 'rounded-2xl shadow-xl border border-slate-200 overflow-hidden'}`}>
      {/* Header Banner */}
      <div className="shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 p-4 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            Advance Request
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm mt-0.5">
            Submit your travel advance request
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToHistory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold backdrop-blur-md transition cursor-pointer"
          >
            <History size={16} />
            History
          </button>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700/60 text-white text-xs sm:text-sm font-bold border border-teal-400/30">
            <User size={15} />
            {employeeName}
          </span>
          {isModal && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition ml-1 cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className={`p-4 sm:p-7 space-y-4 sm:space-y-5 ${isModal ? 'flex-1 overflow-y-auto overscroll-contain' : ''}`}>
        {/* Sales Person Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Sales Person Name
          </label>
          <div className="relative">
            <input
              type="text"
              name="salesPersonName"
              value={formData.salesPersonName}
              readOnly
              disabled
              className="w-full h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
            />
          </div>
        </div>

        {/* Row 1: From & To Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              From Location <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="fromLocation"
                value={formData.fromLocation}
                onChange={handleChange}
                placeholder="Enter departure location"
                required
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              To Location <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="toLocation"
                value={formData.toLocation}
                onChange={handleChange}
                placeholder="Enter destination location"
                required
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Start Date & End Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </div>
        </div>

        {/* Row 3: Travel Type & Advance Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Travel Type <span className="text-rose-500">*</span>
            </label>
            <select
              name="travelType"
              value={formData.travelType}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 cursor-pointer"
            >
              <option value="">Select travel type</option>
              {travelOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">₹</span>
              Advance Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="advanceAmount"
              value={formData.advanceAmount}
              onChange={handleChange}
              placeholder="Enter advance amount"
              min="1"
              step="1"
              required
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </div>
        </div>

        {/* Row 4: Visit Company Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Building2 size={14} className="text-slate-400" />
            Visit Company Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="visitCompanyName"
            value={formData.visitCompanyName}
            onChange={handleChange}
            placeholder="Enter company name to visit"
            required
            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
          />
        </div>

        {/* Row 5: Remarks */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Remarks
          </label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            placeholder="Enter any additional remarks"
            rows={3}
            className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className={isModal ? "sticky bottom-0 -mx-4 -mb-4 sm:-mx-7 sm:-mb-7 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-slate-100 z-10 shadow-xs" : "pt-2"}>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:opacity-60 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Submitting Request...
              </>
            ) : (
              'Submit Advance Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );

  // If used as modal
  if (isModal) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden animate-fadeIn">
        {formContent}
      </div>
    );
  }

  // Standalone Page Layout
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-4 transition"
        >
          <ArrowLeft size={16} /> Back
        </button>
        {formContent}
      </div>
    </div>
  );
};

export default AdvanceRequest;
