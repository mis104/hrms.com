import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Send,
  CheckCircle2,
  Car,
  Calendar,
  FileText,
  Sparkles,
  X,
  Camera,
  Image as ImageIcon,
  Trash2,
  Eye,
  Loader2,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Search,
  Check,
  ChevronRight,
  Info,
  Upload,
  Gauge,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import { getUserRole } from '../utils/authRole';

const LocalTravel = ({ isModal = false, onClose, initialTab = 'in' }) => {
  const navigate = useNavigate();

  // Get current logged-in user
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : {};
  const employeeName = user.Name || user.name || user.displayName || user.Username || 'Employee';
  // Admin sees every employee's travel; everyone else only their own.
  const isAdmin = getUserRole(user) === 'admin';

  const todayStr = new Date().toISOString().split('T')[0];

  // Active Tab: 'in' | 'out'
  const [activeTab, setActiveTab] = useState(initialTab);

  // --- Travel IN State ---
  const [inFormData, setInFormData] = useState({
    personName: employeeName,
    travelDate: todayStr,
    fromLocation: '',
    toLocation: '',
    vehicleType: '',
    mtrNumber: '',
    mtrPic: '',
    remarks: '',
  });

  const [submittingIn, setSubmittingIn] = useState(false);
  const [submittedInSerial, setSubmittedInSerial] = useState(null);
  const [uploadingInPic, setUploadingInPic] = useState(false);

  // --- Travel OUT State ---
  const [pendingList, setPendingList] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [filterMyTrips, setFilterMyTrips] = useState(true);
  const [selectedTravel, setSelectedTravel] = useState(null);

  const [outFormData, setOutFormData] = useState({
    returnDate: todayStr,
    outVehicleType: '',
    outMtrNumber: '',
    totalKm: '',
    outMtrPic: '',
    vehicleAmount: '',
    remarks: '',
  });

  const [submittingOut, setSubmittingOut] = useState(false);
  const [submittedOutData, setSubmittedOutData] = useState(null);
  const [uploadingOutPic, setUploadingOutPic] = useState(false);

  // Lightbox Preview Image
  const [previewImage, setPreviewImage] = useState(null);

  // Input Refs for Camera and Gallery
  const cameraInInputRef = useRef(null);
  const galleryInInputRef = useRef(null);
  const cameraOutInputRef = useRef(null);
  const galleryOutInputRef = useRef(null);

  const vehicleOptions = ['Bike', 'Car', 'Bus', 'Auto', 'Train', 'Other'];

  // Fetch Pending Travel records from Supabase
  const fetchPendingTravels = async (silent = false) => {
    if (!silent) setLoadingPending(true);
    try {
      let query = supabase
        .from('travel_in_out')
        .select('*')
        .order('id', { ascending: false })
        .limit(200);

      // Non-admin users only ever see their OWN travel entries; admin sees all.
      if (!isAdmin && employeeName) {
        query = query.ilike('person_name', `%${employeeName}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter rows where return_date is null or empty OR actual is null or empty
      const pending = (data || []).filter(
        (row) => !row.return_date || String(row.return_date).trim() === '' || !row.actual
      );
      setPendingList(pending);
    } catch (err) {
      console.error('Pending travel fetch failed:', err);
      if (!silent) toast.error('Failed to load pending travel entries');
    } finally {
      if (!silent) setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchPendingTravels();
  }, []);

  useEffect(() => {
    if (initialTab === 'out') {
      setActiveTab('out');
    }
  }, [initialTab]);

  // Handle Travel IN input change
  const handleInChange = (e) => {
    const { name, value } = e.target;
    setInFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Travel OUT input change + auto-compute KM
  const handleOutChange = (e) => {
    const { name, value } = e.target;

    setOutFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-compute totalKm when outMtrNumber changes
      if (name === 'outMtrNumber' && selectedTravel) {
        const inMtr = Number(String(selectedTravel.in_vehicle_mtr_number || '').replace(/[^0-9.]/g, ''));
        const outMtr = Number(String(value || '').replace(/[^0-9.]/g, ''));

        if (!isNaN(inMtr) && !isNaN(outMtr) && outMtr >= inMtr && inMtr > 0) {
          updated.totalKm = String(Math.round((outMtr - inMtr) * 10) / 10);
        }
      }

      return updated;
    });
  };

  // Upload image to Cloudinary (Camera / Gallery)
  const handleImageUpload = async (file, type = 'in') => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (type === 'in') setUploadingInPic(true);
    else setUploadingOutPic(true);

    const toastId = toast.loading('Uploading vehicle meter image...');

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dhbtn1ecx';
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'hrms_unsigned';

      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: uploadData,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || 'Upload failed');
      }

      const data = await res.json();
      const imageUrl = data.secure_url;

      if (type === 'in') {
        setInFormData((prev) => ({ ...prev, mtrPic: imageUrl }));
      } else {
        setOutFormData((prev) => ({ ...prev, outMtrPic: imageUrl }));
      }

      toast.success('Meter photo uploaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error(err.message || 'Failed to upload photo', { id: toastId });
    } finally {
      if (type === 'in') {
        setUploadingInPic(false);
        if (cameraInInputRef.current) cameraInInputRef.current.value = '';
        if (galleryInInputRef.current) galleryInInputRef.current.value = '';
      } else {
        setUploadingOutPic(false);
        if (cameraOutInputRef.current) cameraOutInputRef.current.value = '';
        if (galleryOutInputRef.current) galleryOutInputRef.current.value = '';
      }
    }
  };

  // Select a travel to Mark OUT
  const handleSelectTravelForOut = (travel) => {
    setSelectedTravel(travel);
    setOutFormData({
      returnDate: todayStr,
      outVehicleType: travel.in_vehicle_type || 'Bike',
      outMtrNumber: '',
      totalKm: '',
      outMtrPic: '',
      vehicleAmount: '',
      remarks: '',
    });
  };

  // Submit Travel IN
  const handleSubmitIn = async (e) => {
    e.preventDefault();

    if (!inFormData.personName.trim()) {
      toast.error('Please enter person name');
      return;
    }
    if (!inFormData.fromLocation.trim()) {
      toast.error('Please enter departure location');
      return;
    }
    if (!inFormData.toLocation.trim()) {
      toast.error('Please enter destination location');
      return;
    }
    if (!inFormData.vehicleType) {
      toast.error('Please select vehicle type');
      return;
    }

    setSubmittingIn(true);
    const toastId = toast.loading('Submitting travel IN information...');

    try {
      // 1. Generate next Serial Number TI-xxx
      const { data: latestRows } = await supabase
        .from('travel_in_out')
        .select('serial_no')
        .order('id', { ascending: false })
        .limit(1);

      let nextNum = 759;
      if (latestRows && latestRows.length > 0 && latestRows[0]?.serial_no) {
        const match = String(latestRows[0].serial_no).match(/TI-(\d+)/i);
        if (match) {
          nextNum = Number(match[1]) + 1;
        }
      }
      const serialNo = `TI-${String(nextNum).padStart(3, '0')}`;

      // 2. Format Dates
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const formattedTimestamp = `${dd}-${mm}-${yyyy} ${hh}:${min}`;

      let formattedTravelDate = inFormData.travelDate;
      if (inFormData.travelDate.includes('-')) {
        const parts = inFormData.travelDate.split('-');
        if (parts[0].length === 4) {
          formattedTravelDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // 3. Insert into Supabase table travel_in_out
      const payload = {
        serial_no: serialNo,
        person_name: inFormData.personName.trim(),
        date: formattedTravelDate,
        from_location: inFormData.fromLocation.trim(),
        to_location: inFormData.toLocation.trim(),
        in_vehicle_type: inFormData.vehicleType,
        in_vehicle_mtr_number: inFormData.mtrNumber.trim(),
        in_vehicle_mtr_pic: inFormData.mtrPic || '',
        in_remarks: inFormData.remarks.trim(),
        timestamp: formattedTimestamp,
        planned: formattedTimestamp,
        total_running_km: 0,
        in_vehicle_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insErr } = await supabase.from('travel_in_out').insert([payload]);
      if (insErr) throw insErr;

      toast.success(`Travel IN recorded! Serial: ${serialNo}`, { id: toastId });
      setSubmittedInSerial(serialNo);
      fetchPendingTravels(true);
    } catch (err) {
      console.error('Local travel submit error:', err);
      toast.error(err.message || 'Failed to submit travel information', { id: toastId });
    } finally {
      setSubmittingIn(false);
    }
  };

  // Submit Travel OUT
  const handleSubmitOut = async (e) => {
    e.preventDefault();

    const tripToUpdate = selectedTravel || filteredPending[0] || pendingList[0];
    if (!tripToUpdate) {
      toast.error('Please select an active journey first');
      return;
    }

    setSubmittingOut(true);
    const toastId = toast.loading('Submitting complete travel information...');

    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const formattedActual = `${dd}-${mm}-${yyyy} ${hh}:${min}`;

      let formattedReturnDate = outFormData.returnDate || todayStr;
      if (formattedReturnDate.includes('-')) {
        const parts = formattedReturnDate.split('-');
        if (parts[0].length === 4) {
          formattedReturnDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // Calculate Running KM
      let finalKm = Number(outFormData.totalKm) || 0;
      if (!finalKm && outFormData.outMtrNumber && tripToUpdate.in_vehicle_mtr_number) {
        const inM = Number(String(tripToUpdate.in_vehicle_mtr_number).replace(/[^0-9.]/g, ''));
        const outM = Number(String(outFormData.outMtrNumber).replace(/[^0-9.]/g, ''));
        if (!isNaN(inM) && !isNaN(outM) && outM >= inM) {
          finalKm = Math.round((outM - inM) * 10) / 10;
        }
      }

      const updatePayload = {
        return_date: formattedReturnDate,
        actual: formattedActual,
        out_vehicle_type: outFormData.outVehicleType || tripToUpdate.in_vehicle_type || 'Vehicle',
        out_vehicle_mtr_number: outFormData.outMtrNumber ? String(outFormData.outMtrNumber).trim() : '',
        vehical_mtr_pic: outFormData.outMtrPic || '',
        total_running_km: finalKm,
        vehicle_amount: Number(outFormData.vehicleAmount) || 0,
        remarks: outFormData.remarks ? outFormData.remarks.trim() : '',
        updated_at: new Date().toISOString(),
      };

      const { error: updErr } = await supabase
        .from('travel_in_out')
        .update(updatePayload)
        .eq('id', tripToUpdate.id);

      if (updErr) throw updErr;

      toast.success(`Journey completed! Serial: ${tripToUpdate.serial_no}`, { id: toastId });
      setSubmittedOutData({
        serialNo: tripToUpdate.serial_no,
        personName: tripToUpdate.person_name,
        route: `${tripToUpdate.from_location} ➔ ${tripToUpdate.to_location}`,
        totalKm: finalKm,
        returnDate: formattedReturnDate,
      });

      // Refresh pending list
      fetchPendingTravels(true);
      setSelectedTravel(null);
    } catch (err) {
      console.error('Travel OUT submit error:', err);
      toast.error(err.message || 'Failed to complete journey', { id: toastId });
    } finally {
      setSubmittingOut(false);
    }
  };

  const handleResetIn = () => {
    setInFormData({
      personName: employeeName,
      travelDate: todayStr,
      fromLocation: '',
      toLocation: '',
      vehicleType: '',
      mtrNumber: '',
      mtrPic: '',
      remarks: '',
    });
    setSubmittedInSerial(null);
  };

  const handleResetOut = () => {
    setSelectedTravel(null);
    setSubmittedOutData(null);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  // Filter pending journeys
  const filteredPending = pendingList.filter((item) => {
    const pName = String(item.person_name || '').toLowerCase();
    const eName = employeeName.trim().toLowerCase();

    if (!isAdmin && filterMyTrips && eName && !pName.includes(eName) && !eName.includes(pName)) {
      return false;
    }

    if (!pendingSearch.trim()) return true;
    const q = pendingSearch.toLowerCase();
    return (
      pName.includes(q) ||
      String(item.serial_no || '').toLowerCase().includes(q) ||
      String(item.from_location || '').toLowerCase().includes(q) ||
      String(item.to_location || '').toLowerCase().includes(q)
    );
  });

  const myPendingCount = pendingList.filter((item) => {
    const pName = String(item.person_name || '').toLowerCase();
    const eName = employeeName.trim().toLowerCase();
    return pName.includes(eName) || eName.includes(pName);
  }).length;

  return (
    <div className={isModal ? "w-full h-full flex flex-col overflow-hidden" : "min-h-screen bg-[#f3f7f5] pb-12 pt-2 sm:pt-4"}>
      <div className={isModal ? "w-full h-full flex flex-col overflow-hidden" : "mx-auto max-w-5xl px-3 sm:px-6"}>
        {/* Top Navigation for standalone page */}
        {!isModal && (
          <button
            type="button"
            onClick={handleClose}
            className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        )}

        {/* ================= SUCCESS STATE: TRAVEL IN ================= */}
        {submittedInSerial && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xl animate-in zoom-in-95 duration-200 m-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50 mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Travel IN Information Submitted!</h2>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Your IN Travel details have been successfully recorded in the system.
            </p>
            <div className="my-5 inline-block rounded-2xl bg-slate-50 border border-slate-200 px-5 py-2.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Serial Number</p>
              <p className="text-lg font-black text-indigo-700 tracking-tight">{submittedInSerial}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-2">
              <button
                type="button"
                onClick={handleResetIn}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Submit Another Entry
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmittedInSerial(null);
                  setActiveTab('out');
                  fetchPendingTravels();
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-black text-white shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View Pending Trips</span>
                <ArrowRight size={14} />
              </button>
              {isModal && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white shadow-md transition cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= SUCCESS STATE: TRAVEL OUT ================= */}
        {submittedOutData && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xl animate-in zoom-in-95 duration-200 m-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50 mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Journey Marked OUT Completed!</h2>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Your Travel OUT details and distance calculation have been recorded successfully.
            </p>
            <div className="my-5 grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial No</p>
                <p className="text-sm font-black text-slate-900">{submittedOutData.serialNo}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200 p-3">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Running</p>
                <p className="text-sm font-black text-emerald-700">{submittedOutData.totalKm} km</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Route</p>
                <p className="text-xs font-bold text-slate-800 truncate">{submittedOutData.route}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-2">
              <button
                type="button"
                onClick={handleResetOut}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Mark Another Trip OUT
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
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white shadow-md transition cursor-pointer"
                >
                  View in TA &amp; DA
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= MAIN CONTAINER ================= */}
        {!submittedInSerial && !submittedOutData && (
          <div className={isModal ? "w-full h-full flex flex-col overflow-hidden bg-[#f4faf7]/60" : "overflow-hidden rounded-3xl bg-[#f4faf7]/60 shadow-xl border border-slate-200/80"}>
            {/* Header Banner */}
            <div className="shrink-0 relative bg-gradient-to-r from-[#113f38] via-[#14532d] to-[#0f4037] px-5 py-4 sm:px-6 sm:py-5 text-white shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black tracking-tight sm:text-2xl flex items-center gap-2">
                    <span>Local Travel Form</span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      Live
                    </span>
                  </h1>
                  <p className="mt-0.5 text-xs text-white/80 font-medium">
                    Travel IN / OUT meter readings &amp; expense calculation
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

              {/* Top Navigation Tabs: Travel IN vs Travel OUT */}
              <div className="mt-3.5 flex items-center gap-2 bg-black/20 p-1 rounded-2xl backdrop-blur-md border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('in');
                    setSelectedTravel(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'in'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Car size={15} />
                  <span>1. Travel IN (Start)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('out');
                    fetchPendingTravels(true);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                    activeTab === 'out'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>2. Mark OUT</span>
                  {pendingList.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'out' ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white animate-pulse'
                    }`}>
                      {pendingList.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Notification alert if pending journeys exist and on IN tab */}
            {activeTab === 'in' && pendingList.length > 0 && (
              <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <p className="text-xs font-bold text-amber-900 truncate">
                    You have <span className="underline">{pendingList.length}</span> active journey(s) to Mark OUT!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('out');
                    fetchPendingTravels(true);
                  }}
                  className="shrink-0 text-xs font-black text-amber-800 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Mark OUT Now</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* TAB CONTENT */}
            <div className={isModal ? "flex-1 overflow-y-auto overscroll-contain bg-[#f3f9f6]/50" : "bg-[#f3f9f6]/50"}>
              {/* ========================================================= */}
              {/* TAB 1: TRAVEL IN FORM                                     */}
              {/* ========================================================= */}
              {activeTab === 'in' && (
                <form onSubmit={handleSubmitIn} className={isModal ? "p-4 sm:p-6 space-y-4" : "p-5 sm:p-7 space-y-4"}>
                  <div>
                    <h3 className="text-sm font-black text-emerald-900 tracking-tight mb-0.5">
                      Start Journey (Travel IN Details)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Fill starting point, vehicle type, and starting meter reading / photo.
                    </p>
                  </div>

                  {/* Person Name */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Person Name <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      name="personName"
                      value={inFormData.personName}
                      onChange={handleInChange}
                      placeholder="Enter employee name"
                      className="w-full h-[48px] rounded-2xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/60 shadow-2xs outline-none transition"
                      required
                    />
                  </div>

                  {/* Travel Date */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Travel Date <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="date"
                      name="travelDate"
                      value={inFormData.travelDate}
                      onChange={handleInChange}
                      className="w-full h-[48px] rounded-2xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/60 shadow-2xs outline-none transition"
                      required
                    />
                  </div>

                  {/* From Location & To Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                        From Location <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        name="fromLocation"
                        value={inFormData.fromLocation}
                        onChange={handleInChange}
                        placeholder="Enter departure location"
                        className="w-full h-[48px] rounded-2xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/60 shadow-2xs outline-none transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                        To Location <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        name="toLocation"
                        value={inFormData.toLocation}
                        onChange={handleInChange}
                        placeholder="Enter destination location"
                        className="w-full h-[48px] rounded-2xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/60 shadow-2xs outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Vehicle Type */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Vehicle Type <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      name="vehicleType"
                      value={inFormData.vehicleType}
                      onChange={handleInChange}
                      className="w-full h-[48px] rounded-2xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/60 shadow-2xs outline-none transition"
                      required
                    >
                      <option value="">Select vehicle type</option>
                      {vehicleOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* IN Meter Number & IN Meter Image (Matches User Screenshot Style) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                        Vehicle Meter Number (IN) <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        name="mtrNumber"
                        value={inFormData.mtrNumber}
                        onChange={handleInChange}
                        placeholder="Enter IN meter reading"
                        className="w-full h-[50px] rounded-2xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/60 shadow-2xs outline-none transition"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs sm:text-sm font-bold text-slate-800">
                          Vehicle Meter Image (IN)
                        </label>
                        {inFormData.mtrPic && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} />
                            Photo attached
                          </span>
                        )}
                      </div>

                      {/* Hidden inputs */}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={cameraInInputRef}
                        onChange={(e) => handleImageUpload(e.target.files?.[0], 'in')}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={galleryInInputRef}
                        onChange={(e) => handleImageUpload(e.target.files?.[0], 'in')}
                      />

                      {/* Dashed Box */}
                      {inFormData.mtrPic ? (
                        <div className="h-[50px] rounded-2xl border border-slate-200 bg-white px-3 flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 group">
                              <img src={inFormData.mtrPic} alt="Meter IN" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setPreviewImage(inFormData.mtrPic)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate">IN Meter attached</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => cameraInInputRef.current?.click()}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Retake"
                            >
                              <Camera size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setInFormData((prev) => ({ ...prev, mtrPic: '' }))}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-[50px] w-full rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white/90 hover:bg-emerald-50/20 px-3 flex items-center justify-between transition group shadow-2xs">
                          {uploadingInPic ? (
                            <div className="flex items-center justify-center gap-2 w-full text-emerald-700 text-xs font-bold">
                              <Loader2 size={16} className="animate-spin" />
                              <span>Uploading to Cloudinary...</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-slate-500 group-hover:text-emerald-700 transition">
                                <Upload size={17} className="text-slate-400 group-hover:text-emerald-600 transition" />
                                <span className="text-xs font-semibold">Upload IN meter image</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => cameraInInputRef.current?.click()}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                                  title="Camera"
                                >
                                  <Camera size={13} />
                                  <span>Camera</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => galleryInInputRef.current?.click()}
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
                  </div>

                  {/* IN Travel Remarks (Full width below) */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      IN Travel Remarks
                    </label>
                    <textarea
                      name="remarks"
                      rows={2}
                      value={inFormData.remarks}
                      onChange={handleInChange}
                      placeholder="Enter any additional remarks for IN travel"
                      className="w-full rounded-2xl border border-slate-200/90 bg-white p-3.5 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/60 shadow-2xs outline-none transition resize-none"
                    />
                  </div>

                  {/* Submit IN Button */}
                  <div className="pt-2 pb-2">
                    <button
                      type="submit"
                      disabled={submittingIn || uploadingInPic}
                      className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 text-sm font-black text-white shadow-md hover:shadow-lg active:scale-98 transition disabled:opacity-50 cursor-pointer"
                    >
                      {submittingIn ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Travel IN...</span>
                        </>
                      ) : (
                        <span>Submit IN Travel Information</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================= */}
              {/* TAB 2: MARK OUT (LIST OF PENDING OR OUT FORM)             */}
              {/* ========================================================= */}
              {/* ========================================================= */}
              {/* TAB 2: MARK OUT (DIRECTLY SHOWING MARK DONE FORM)         */}
              {/* ========================================================= */}
              {activeTab === 'out' && (
                <div className="bg-[#f0faf5] min-h-full">
                  {loadingPending && pendingList.length === 0 ? (
                    <div className="py-14 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={30} className="animate-spin text-teal-600" />
                      <p className="text-xs font-bold text-slate-500">Loading active journeys...</p>
                    </div>
                  ) : pendingList.length === 0 ? (
                    <div className="py-12 px-5 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 mb-3 border border-teal-100">
                        <CheckCircle2 size={30} />
                      </div>
                      <h4 className="text-sm font-black text-slate-800">No Open Travel IN Found</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        All journeys have already been completed (Marked OUT). Start a new journey whenever you travel.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('in')}
                        className="mt-4 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-black shadow-sm hover:bg-teal-800 transition cursor-pointer inline-flex items-center gap-2"
                      >
                        <Car size={15} />
                        <span>Start New Travel IN</span>
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const currentTravel = selectedTravel || filteredPending[0] || pendingList[0];

                      return (
                        <form onSubmit={handleSubmitOut} className={isModal ? "p-4 sm:p-6 space-y-4" : "p-5 sm:p-7 space-y-4"}>
                          {/* Trip Switcher if user has more than 1 pending trip */}
                          {filteredPending.length > 1 && (
                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Select Journey to Mark OUT ({filteredPending.length} Active):
                              </label>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {filteredPending.map((trip) => {
                                  const isCurrent = currentTravel?.id === trip.id;
                                  return (
                                    <button
                                      key={trip.id}
                                      type="button"
                                      onClick={() => handleSelectTravelForOut(trip)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition border cursor-pointer ${
                                        isCurrent
                                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      {trip.serial_no} ({trip.from_location} ➔ {trip.to_location})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Selected Active Journey Details Card */}
                          <div className="rounded-2xl bg-white border border-teal-100 p-3.5 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-black text-teal-800 shrink-0">
                                  {currentTravel.serial_no}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate">{currentTravel.person_name}</span>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                                <Clock size={11} />
                                <span>Travel IN Done</span>
                              </span>
                            </div>

                            {/* Route */}
                            <div className="flex items-center gap-2 text-xs font-bold text-teal-950 bg-teal-50/50 p-2 rounded-xl border border-teal-100/60">
                              <span className="truncate">{currentTravel.from_location}</span>
                              <ArrowRight size={13} className="text-teal-600 shrink-0" />
                              <span className="truncate">{currentTravel.to_location}</span>
                            </div>

                            {/* Meta info */}
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 pt-1 border-t border-slate-100">
                              <span>Vehicle: <strong className="text-slate-800">{currentTravel.in_vehicle_type || 'Vehicle'}</strong></span>
                              <span>IN Meter: <strong className="text-teal-800 font-bold">{currentTravel.in_vehicle_mtr_number || 'N/A'}</strong></span>
                              {currentTravel.in_vehicle_mtr_pic && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(currentTravel.in_vehicle_mtr_pic)}
                                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye size={12} />
                                  <span>IN Pic</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* ========================================================= */}
                          {/* VEHICLE METER NUMBER (OUT) & VEHICLE METER IMAGE (OUT)    */}
                          {/* (EXACTLY MATCHING USER SCREENSHOT)                        */}
                          {/* ========================================================= */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
                            {/* Vehicle Meter Number (OUT) * */}
                            <div>
                              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                                Vehicle Meter Number (OUT) <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  name="outMtrNumber"
                                  value={outFormData.outMtrNumber}
                                  onChange={handleOutChange}
                                  placeholder="Enter OUT meter reading"
                                  className="w-full h-[50px] rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition"
                                  required
                                />
                                {currentTravel.in_vehicle_mtr_number && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    IN: {currentTravel.in_vehicle_mtr_number}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Vehicle Meter Image (OUT) */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                                  Vehicle Meter Image (OUT)
                                </label>
                                {outFormData.outMtrPic && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 size={12} />
                                    Photo attached
                                  </span>
                                )}
                              </div>

                              {/* Hidden file inputs for Camera and Gallery */}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                ref={cameraOutInputRef}
                                onChange={(e) => handleImageUpload(e.target.files?.[0], 'out')}
                              />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={galleryOutInputRef}
                                onChange={(e) => handleImageUpload(e.target.files?.[0], 'out')}
                              />

                              {/* Dashed Box matching user screenshot */}
                              {outFormData.outMtrPic ? (
                                <div className="h-[50px] rounded-2xl border border-slate-200 bg-white px-3 flex items-center justify-between shadow-2xs">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 group">
                                      <img src={outFormData.outMtrPic} alt="Meter OUT" className="h-full w-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImage(outFormData.outMtrPic)}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    </div>
                                    <span className="text-xs font-bold text-slate-800 truncate">Meter image attached</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => cameraOutInputRef.current?.click()}
                                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                      title="Retake with Camera"
                                    >
                                      <Camera size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setOutFormData((prev) => ({ ...prev, outMtrPic: '' }))}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                      title="Remove"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative h-[50px] w-full rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-white hover:bg-teal-50/20 px-3.5 flex items-center justify-between transition group shadow-2xs">
                                  {uploadingOutPic ? (
                                    <div className="flex items-center justify-center gap-2 w-full text-teal-700 text-xs font-bold">
                                      <Loader2 size={16} className="animate-spin" />
                                      <span>Uploading image...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className="flex items-center gap-2 text-slate-500 group-hover:text-teal-700 transition cursor-pointer flex-1"
                                        onClick={() => galleryOutInputRef.current?.click()}
                                      >
                                        <Upload size={17} className="text-slate-400 group-hover:text-teal-600 transition" />
                                        <span className="text-xs font-semibold">Upload OUT meter image</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => cameraOutInputRef.current?.click()}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 text-[11px] font-bold hover:bg-teal-100 transition cursor-pointer"
                                          title="Take photo using camera"
                                        >
                                          <Camera size={13} />
                                          <span>Camera</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => galleryOutInputRef.current?.click()}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition cursor-pointer"
                                          title="Choose from gallery"
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
                          </div>

                          {/* OUT Travel Remarks (MATCHING USER SCREENSHOT) */}
                          <div className="pt-1">
                            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                              OUT Travel Remarks
                            </label>
                            <textarea
                              name="remarks"
                              rows={3}
                              value={outFormData.remarks}
                              onChange={handleOutChange}
                              placeholder="Enter any additional remarks for OUT travel"
                              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 shadow-2xs outline-none transition resize-none"
                            />
                          </div>

                          {/* Submit Complete Travel Information Button (MATCHING USER SCREENSHOT) */}
                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={submittingOut || uploadingOutPic}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition disabled:opacity-50 cursor-pointer"
                            >
                              {submittingOut ? (
                                <>
                                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Submitting Travel Information...</span>
                                </>
                              ) : (
                                <span>Submit Complete Travel Information</span>
                              )}
                            </button>
                          </div>
                        </form>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Image Preview Lightbox */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition cursor-pointer"
              >
                <X size={18} />
              </button>
              <img
                src={previewImage}
                alt="Meter preview"
                className="max-h-[80vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalTravel;
