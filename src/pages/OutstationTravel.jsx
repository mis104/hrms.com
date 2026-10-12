import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Sparkles,
  Trash2,
  Upload,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';

const OutstationTravel = ({ isModal = false, onClose }) => {
  const navigate = useNavigate();

  // Get current logged-in user
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : {};
  const employeeName = user.Name || user.name || user.displayName || user.Username || 'Employee';

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [formData, setFormData] = useState({
    personName: employeeName,
    travelDate: todayStr,
    fromLocation: '',
    toLocation: '',
    vehicleType: '',
    travelReceipt: '',
    accommodationType: '',
    stayDays: '',
    stayBill: '',
    foodDate: todayStr,
    foodBill: '',
    localTravelType: '',
    localTravelReceipt: '',
    returnDate: '',
    returnTicket: '',
    advanceAmount: '',
  });

  const [uploadingField, setUploadingField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // File Input Refs for dual Camera & Gallery upload
  const fileRefs = {
    travelReceiptCamera: useRef(null),
    travelReceiptGallery: useRef(null),
    stayBillCamera: useRef(null),
    stayBillGallery: useRef(null),
    foodBillCamera: useRef(null),
    foodBillGallery: useRef(null),
    localTravelReceiptCamera: useRef(null),
    localTravelReceiptGallery: useRef(null),
    returnTicketCamera: useRef(null),
    returnTicketGallery: useRef(null),
  };

  const vehicleOptions = ['Train', 'Flight', 'Bus', 'Rental Car', 'Bike', 'Taxi', 'Other'];
  const localTravelOptions = ['Auto', 'Taxi', 'Rental Car', 'Bus', 'Metro', 'Other'];

  // Clock for "Current Date & Time" badge
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setCurrentTimeStr(now.toLocaleDateString('en-US', options).replace(',', ' at'));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Upload image to Cloudinary
  const handleImageUpload = async (file, fieldName) => {
    if (!file) return;

    setUploadingField(fieldName);
    const toastId = toast.loading(`Uploading ${fieldName}...`);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'hrms_unsigned');

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dhbtn1ecx';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (!data.secure_url) throw new Error('Cloudinary upload failed');

      setFormData((prev) => ({ ...prev, [fieldName]: data.secure_url }));
      toast.success('Image uploaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image. Please try again.', { id: toastId });
    } finally {
      setUploadingField(null);
    }
  };

  // Handle Form Submission to Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fromLocation.trim() || !formData.toLocation.trim()) {
      toast.error('Please enter From and To locations');
      return;
    }

    if (!formData.vehicleType) {
      toast.error('Please select a vehicle type');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Submitting travel information to Supabase...');

    try {
      // 1. Get next serial number TA-xxx
      const { count, error: countErr } = await supabase
        .from('outstation_traveling')
        .select('*', { count: 'exact', head: true });

      const nextIndex = (count || 0) + 1;
      const serialNo = `TA-${String(nextIndex).padStart(3, '0')}`;

      // Current timestamp formatted
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestampFormatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const insertPayload = {
        serial_no: serialNo,
        timestamp: timestampFormatted,
        name: formData.personName.trim(),
        from_location: formData.fromLocation.trim(),
        to_location: formData.toLocation.trim(),
        vehicle_type: formData.vehicleType,
        stay_date: formData.stayDays ? String(formData.stayDays).trim() : '',
        accommadation_type: formData.accommodationType ? formData.accommodationType.trim() : '',
        travel_date: formData.travelDate,
        stay_bill: formData.stayBill || '',
        fooding_date: formData.foodDate || '',
        fooding_bill: formData.foodBill || '',
        travel_receipt: formData.travelReceipt || '',
        local_travel_type: formData.localTravelType || '',
        local_travel_receipt: formData.localTravelReceipt || '',
        return_date: formData.returnDate || '',
        return_ticket: formData.returnTicket || '',
        advance_amount: Number(formData.advanceAmount) || 0,
        status: 'Pending',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('outstation_traveling')
        .insert([insertPayload])
        .select('id, serial_no')
        .single();

      if (error) throw error;

      toast.success(`Travel Information Submitted! Serial: ${serialNo}`, { id: toastId });
      setSubmittedData({
        serialNo: data?.serial_no || serialNo,
        personName: formData.personName,
        route: `${formData.fromLocation} ➔ ${formData.toLocation}`,
        travelDate: formData.travelDate,
        vehicleType: formData.vehicleType,
        advanceAmount: formData.advanceAmount || '0',
      });
    } catch (err) {
      console.error('Outstation travel submission error:', err);
      toast.error(err.message || 'Failed to submit travel information', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      personName: employeeName,
      travelDate: todayStr,
      fromLocation: '',
      toLocation: '',
      vehicleType: '',
      travelReceipt: '',
      accommodationType: '',
      stayDays: '',
      stayBill: '',
      foodDate: todayStr,
      foodBill: '',
      localTravelType: '',
      localTravelReceipt: '',
      returnDate: '',
      returnTicket: '',
      advanceAmount: '',
    });
    setSubmittedData(null);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  // Reusable Dual-Upload Component (Camera & Gallery)
  const renderUploadBox = (label, fieldName, cameraRef, galleryRef) => {
    const isUploading = uploadingField === fieldName;
    const value = formData[fieldName];

    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs sm:text-sm font-bold text-slate-800">{label}</label>
          {value && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={12} />
              Attached
            </span>
          )}
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraRef}
          onChange={(e) => handleImageUpload(e.target.files?.[0], fieldName)}
        />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={galleryRef}
          onChange={(e) => handleImageUpload(e.target.files?.[0], fieldName)}
        />

        {value ? (
          <div className="h-[50px] rounded-2xl border border-slate-200 bg-white px-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 group">
                <img src={value} alt={label} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPreviewImage(value)}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                >
                  <Eye size={14} />
                </button>
              </div>
              <span className="text-xs font-bold text-slate-800 truncate">Image attached</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Retake"
              >
                <Camera size={14} />
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, [fieldName]: '' }))}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative h-[50px] w-full rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-white/90 hover:bg-teal-50/20 px-3 flex items-center justify-between transition group shadow-2xs">
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 w-full text-teal-700 text-xs font-bold">
                <Loader2 size={16} className="animate-spin" />
                <span>Uploading to Cloudinary...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-slate-500 group-hover:text-teal-700 transition">
                  <Upload size={17} className="text-slate-400 group-hover:text-teal-600 transition" />
                  <span className="text-xs font-semibold">{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 text-[11px] font-bold hover:bg-teal-100 transition cursor-pointer"
                    title="Camera"
                  >
                    <Camera size={13} />
                    <span>Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition cursor-pointer"
                    title="Gallery"
                  >
                    <ImageIcon size={13} />
                    <span>Gallery</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={isModal ? "w-full h-full flex flex-col overflow-hidden" : "min-h-screen bg-[#f3f7f5] pb-12 pt-2 sm:pt-4"}>
      <div className={isModal ? "w-full h-full flex flex-col overflow-hidden" : "mx-auto max-w-5xl px-3 sm:px-6"}>
        {/* Top Back button for standalone page */}
        {!isModal && (
          <button
            type="button"
            onClick={handleClose}
            className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        )}

        {/* ================= SUCCESS STATE ================= */}
        {submittedData ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xl animate-in zoom-in-95 duration-200 m-auto max-w-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-8 ring-teal-50/50 mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Travel Information Recorded!</h2>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Your Outstation travel details have been saved to Supabase and are now live in TA &amp; DA.
            </p>

            <div className="my-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial No</p>
                <p className="text-sm font-black text-slate-900">{submittedData.serialNo}</p>
              </div>
              <div className="rounded-2xl bg-teal-50/60 border border-teal-200 p-3">
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Travel Date</p>
                <p className="text-sm font-black text-teal-800">{submittedData.travelDate}</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Route</p>
                <p className="text-xs font-bold text-slate-800 truncate">{submittedData.route}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Submit Another Travel
              </button>
              {isModal ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white shadow-md transition cursor-pointer"
                >
                  Done &amp; Close
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/ta-da')}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-xs font-black text-white shadow-md transition cursor-pointer"
                >
                  View in TA &amp; DA
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ================= MAIN FORM CONTAINER ================= */
          <div className={isModal ? "w-full h-full flex flex-col overflow-hidden bg-[#f4faf7]/60" : "overflow-hidden rounded-3xl bg-[#f4faf7]/60 shadow-xl border border-slate-200/80"}>
            {/* Header Banner */}
            <div className="shrink-0 relative bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 px-5 py-4 sm:px-6 sm:py-5 text-white shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black tracking-tight sm:text-2xl flex items-center gap-2">
                    <span>Travel Information</span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      Outstation
                    </span>
                  </h1>
                  <p className="mt-0.5 text-xs text-white/80 font-medium">
                    Record your travel details and expenses
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-md shadow-xs border border-white/10">
                    <MapPin size={13} className="text-emerald-300" />
                    <span className="truncate max-w-[120px]">{employeeName}</span>
                  </div>
                  {isModal && (
                    <button
                      type="button"
                      onClick={handleClose}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-5">
              {/* Row 1: Person Name & Travel Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Person Name
                  </label>
                  <input
                    type="text"
                    name="personName"
                    value={formData.personName}
                    readOnly
                    className="w-full h-[50px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs sm:text-sm font-bold text-slate-700 outline-none cursor-not-allowed shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Travel Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="travelDate"
                    value={formData.travelDate}
                    onChange={handleChange}
                    className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Row 2: From Location & To Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    From Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fromLocation"
                    value={formData.fromLocation}
                    onChange={handleChange}
                    placeholder="Enter departure location"
                    className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    To Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="toLocation"
                    value={formData.toLocation}
                    onChange={handleChange}
                    placeholder="Enter destination location"
                    className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Vehicle Type & Travel Receipt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Vehicle Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                    required
                  >
                    <option value="">Select vehicle type</option>
                    {vehicleOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {renderUploadBox(
                  'Upload travel receipt',
                  'travelReceipt',
                  fileRefs.travelReceiptCamera,
                  fileRefs.travelReceiptGallery
                )}
              </div>

              {/* Row 4: Accommodation Details */}
              <div className="rounded-2xl bg-white/70 border border-slate-200/90 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Accommodation Type
                    </label>
                    <input
                      type="text"
                      name="accommodationType"
                      value={formData.accommodationType}
                      onChange={handleChange}
                      placeholder="Enter accommodation type"
                      className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Stay Days
                    </label>
                    <input
                      type="number"
                      name="stayDays"
                      min="0"
                      value={formData.stayDays}
                      onChange={handleChange}
                      placeholder="Enter number of days"
                      className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                    />
                  </div>
                </div>

                {renderUploadBox(
                  'Upload stay bill image',
                  'stayBill',
                  fileRefs.stayBillCamera,
                  fileRefs.stayBillGallery
                )}
              </div>

              {/* Row 5: Food Date & Food Bill */}
              <div className="rounded-2xl bg-white/70 border border-slate-200/90 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
                  <Utensils size={14} />
                  <span>Food Entry 1</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Food Date
                    </label>
                    <input
                      type="date"
                      name="foodDate"
                      value={formData.foodDate}
                      onChange={handleChange}
                      className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                    />
                  </div>

                  {renderUploadBox(
                    'Upload food bill',
                    'foodBill',
                    fileRefs.foodBillCamera,
                    fileRefs.foodBillGallery
                  )}
                </div>
              </div>

              {/* Row 6: Local Travel Type & Local Travel Receipt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Local Travel Type
                  </label>
                  <select
                    name="localTravelType"
                    value={formData.localTravelType}
                    onChange={handleChange}
                    className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                  >
                    <option value="">Select local travel type</option>
                    {localTravelOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {renderUploadBox(
                  'Upload local travel receipt',
                  'localTravelReceipt',
                  fileRefs.localTravelReceiptCamera,
                  fileRefs.localTravelReceiptGallery
                )}
              </div>

              {/* Row 7: Return Journey (Return Date & Return Ticket) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Return Date
                  </label>
                  <input
                    type="date"
                    name="returnDate"
                    value={formData.returnDate}
                    onChange={handleChange}
                    className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                  />
                </div>

                {renderUploadBox(
                  'Upload return ticket',
                  'returnTicket',
                  fileRefs.returnTicketCamera,
                  fileRefs.returnTicketGallery
                )}
              </div>

              {/* Row 8: Advance Amount */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Advance Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    name="advanceAmount"
                    value={formData.advanceAmount}
                    onChange={handleChange}
                    placeholder="Enter advance amount details"
                    className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                  />
                  <Wallet size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Current Date & Time display matching user screenshot */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Current Date &amp; Time
                </p>
                <p className="text-sm sm:text-base font-black text-emerald-950 mt-1">
                  {currentTimeStr || 'Loading...'}
                </p>
              </div>

              {/* Submit Button */}
              <div className={isModal ? "sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 z-10" : "pt-2"}>
                <button
                  type="submit"
                  disabled={submitting || !!uploadingField}
                  className="w-full h-12 sm:h-14 flex items-center justify-center gap-2 rounded-2xl bg-[#00897b] hover:bg-[#00796b] active:scale-[0.99] text-sm sm:text-base font-black text-white shadow-md hover:shadow-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Submitting to Supabase...</span>
                    </>
                  ) : (
                    <span>Submit Travel Information</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Lightbox Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X size={18} />
            </button>
            <img src={previewImage} alt="Preview" className="max-h-[85vh] w-auto object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

export default OutstationTravel;
