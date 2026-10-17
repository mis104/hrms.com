import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  User,
  Megaphone,
  LogOut,
  Camera,
  Fingerprint,
  Wallet,
  Briefcase,
  ClipboardList,
  Users,
  FolderKanban,
  Package,
  Gift,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  Play,
  Share2,
  ThumbsUp,
  X,
  Car,
  Route,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { useHrmsNotifications } from '../hooks/useHrmsNotifications';
import { supabase } from '../services/supabaseClient';
import LocalTravel from './LocalTravel';
import OutstationTravel from './OutstationTravel';
import AdvanceRequest from './AdvanceRequest';

const FEED_REFRESH_INTERVAL_MS = 3 * 60 * 1000;
const FEED_CACHE_KEY = 'employee_mobile_feed_cache_v2';
const FEED_CACHE_TTL_MS = 10 * 60 * 1000;
const MOBILE_ATTENDANCE_CACHE_KEY = 'employee_mobile_latest_attendance_cache_v1';
const MOBILE_ATTENDANCE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MARK_ATTENDANCE_DATA_CACHE_KEY = 'mark_attendance_data_cache_v1';
const MARK_ATTENDANCE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CONTACTS_CACHE_KEY = 'employee_mobile_contacts_cache_v1';
const CONTACTS_CACHE_TTL_MS = 10 * 60 * 1000;
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const normalize = (value) => (value || '').toString().trim();

const readCachedList = (key, maxAgeMs) => {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (!cached || !Array.isArray(cached.data)) return [];
    if (Date.now() - Number(cached.savedAt || 0) > maxAgeMs) return [];
    return cached.data;
  } catch {
    return [];
  }
};

const writeCachedList = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Cache is only for faster paint; ignore storage quota/private mode failures.
  }
};

const readCachedObject = (key, maxAgeMs) => {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (!cached || Date.now() - Number(cached.savedAt || 0) > maxAgeMs) return null;
    return cached.data || null;
  } catch {
    return null;
  }
};

const readInitialAttendanceRows = () => {
  const markAttendanceCache = readCachedObject(MARK_ATTENDANCE_DATA_CACHE_KEY, MARK_ATTENDANCE_CACHE_TTL_MS);
  if (Array.isArray(markAttendanceCache?.attendanceData) && markAttendanceCache.attendanceData.length) {
    return markAttendanceCache.attendanceData;
  }
  return readCachedList(MOBILE_ATTENDANCE_CACHE_KEY, MOBILE_ATTENDANCE_CACHE_TTL_MS);
};

const parseTimeToMinutes = (value) => {
  if (!value) return null;
  const match = value.toString().trim().match(/^(\d{1,2})[:.](\d{1,2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getMonthIndex = (monthName) =>
  monthNames.findIndex((month) => month.toLowerCase() === normalize(monthName).toLowerCase());

const parseAttendanceDate = (value, monthName = '') => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const rawValue = value.toString().trim();
  if (rawValue.includes('T') && rawValue.includes(':')) {
    const date = new Date(rawValue);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const isoMatch = rawValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = rawValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
    const hour = Number(slashMatch[4] || 0);
    const minute = Number(slashMatch[5] || 0);
    const secondPart = Number(slashMatch[6] || 0);
    const namedMonthIndex = getMonthIndex(monthName);

    if (namedMonthIndex !== -1) {
      if (second - 1 === namedMonthIndex) return new Date(year, second - 1, first, hour, minute, secondPart);
      if (first - 1 === namedMonthIndex) return new Date(year, first - 1, second, hour, minute, secondPart);
    }

    if (first > 12) return new Date(year, second - 1, first, hour, minute, secondPart);
    if (second > 12) return new Date(year, first - 1, second, hour, minute, secondPart);
    return new Date(year, second - 1, first, hour, minute, secondPart);
  }

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatAttendanceDateValue = (value) => {
  const date = parseAttendanceDate(value);
  if (!date) return normalize(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatAttendanceTimeValue = (value) => {
  const date = parseAttendanceDate(value);
  if (date) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const rawValue = normalize(value);
  if (!rawValue) return '';
  if (rawValue.includes(':')) return rawValue.split(/\s+/).pop().substring(0, 5);
  return rawValue;
};

const attendanceDateKey = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const buildOutstationAttendanceRows = (rawAttendance = []) => {
  const grouped = {};

  rawAttendance.forEach((entry) => {
    const employeeName = normalize(entry.personName || entry.person_name || entry.employeeName || entry.name);
    if (!employeeName) return;

    const status = entry.inDate ? 'IN' : entry.outDate ? 'OUT' : normalize(entry.status).toUpperCase();
    const dateValue = entry.inDate || entry.outDate || entry.dateTime || entry.date_and_time || entry.timestampe || entry.timestamp || entry.date || entry.time;
    const dateObj = parseAttendanceDate(dateValue);
    if (!dateObj) return;

    const key = `${employeeName.toLowerCase()}_${attendanceDateKey(dateObj)}`;
    if (!grouped[key]) {
      grouped[key] = {
        employeeName,
        dateObj,
        date: formatAttendanceDateValue(dateValue),
        month: monthNames[dateObj.getMonth()],
        year: String(dateObj.getFullYear()),
        day: dateObj.getDate(),
        inTime: '',
        outTime: '',
        status: '',
      };
    }

    const timeValue = entry.time || dateValue;
    const timeStr = formatAttendanceTimeValue(timeValue);

    if (status === 'IN') {
      if (!grouped[key].inTime || timeStr < grouped[key].inTime) {
        grouped[key].inTime = timeStr;
      }
    }

    if (status === 'OUT') {
      if (!grouped[key].outTime || timeStr > grouped[key].outTime) {
        grouped[key].outTime = timeStr;
      }
    }

    if (!grouped[key].status) {
      grouped[key].status = grouped[key].inTime || grouped[key].outTime ? 'PRESENT' : (status || 'PRESENT');
    }
  });

  return Object.values(grouped)
    .map((item) => ({ ...item, status: item.inTime || item.outTime ? 'PRESENT' : item.status }))
    .sort((a, b) => b.dateObj - a.dateObj);
};

const getDriveImageUrl = (url, size) => {
  if (!url) return null;

  // Cloudinary Optimization
  if (url.includes("cloudinary.com")) {
    if (size) {
      return url.replace("/upload/", `/upload/w_${size},q_auto,f_auto/`);
    }
    return url.replace("/upload/", `/upload/q_auto,f_auto/`);
  }

  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}${size ? `&sz=w${size}` : ""}`;
  }
  return url;
};

const formatTime = (value) => normalize(value) || '-';

const formatWorkingDuration = (inTimeValue, outTimeValue) => {
  const inTime = parseTimeToMinutes(inTimeValue);
  const outTime = parseTimeToMinutes(outTimeValue);

  if (inTime === null || outTime === null) return '-';

  let diff = outTime - inTime;
  if (diff < 0) diff += 24 * 60;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getFeedNotificationId = (row, index) => {
  const date = row[0] || '';
  const sms = row[2] || '';
  const smsType = row[3] || 'Feed';
  const name = row[4] || '';
  const stableText = [date, smsType, name, sms].map(normalize).join('|');
  return `feed-${index + 2}-${stableText}`;
};

const getJoiningHeaderIndex = (headers, names, fallbackIndex = -1) => {
  const searchNames = names.map((name) => name.toLowerCase());
  const index = headers.findIndex((header) => {
    const value = header?.toString().trim().toLowerCase();
    return value && searchNames.some((name) => value === name || value.includes(name));
  });
  return index === -1 ? fallbackIndex : index;
};

const buildEmployeeContacts = (rawData = []) => {
  let headerRowIndex = -1;
  let headers = [];

  for (let index = 0; index < rawData.length; index += 1) {
    const row = rawData[index];
    if (!Array.isArray(row)) continue;

    const normalizedRow = row.map((cell) => cell?.toString().trim().toLowerCase());
    const idIndex = normalizedRow.findIndex((cell) =>
      cell && (cell === 'id' || cell.includes('joining id') || cell.includes('indent number') || cell.includes('employee id'))
    );
    const nameIndex = normalizedRow.findIndex((cell) =>
      cell && (cell.includes('candidate name') || cell.includes('candiate name') || cell.includes('name as per aadhar') || cell.includes('employee name'))
    );

    if (idIndex !== -1 && nameIndex !== -1) {
      headerRowIndex = index;
      headers = row.map((header) => header?.toString().trim());
      break;
    }
  }

  if (headerRowIndex === -1) return [];

  const idxId = getJoiningHeaderIndex(headers, ['Joining ID', 'Indent Number', 'Employee ID', 'ID'], 5);
  const idxName = getJoiningHeaderIndex(headers, ['Name As Per Aadhar', 'Candidate Name', 'Candiate Name', 'Employee Name'], 10);
  const idxDept = getJoiningHeaderIndex(headers, ['Department', 'Location'], 2);
  const idxDesignation = getJoiningHeaderIndex(headers, ['Designation'], 14);
  const idxPhoto = getJoiningHeaderIndex(headers, ["Candidate's Photo", 'Candidate Photo', 'Photo', 'Profile Pic'], 18);
  const idxMobile = getJoiningHeaderIndex(headers, ['Contact No', 'Mobile No.', 'Mobile No', 'Phone', 'Contact Number'], 23);
  const idxStatus = getJoiningHeaderIndex(headers, ['Status'], 8);

  const uniqueContacts = new Map();

  rawData.slice(headerRowIndex + 1).forEach((row, index) => {
    if (!Array.isArray(row)) return;

    const name = normalize(row[idxName]);
    const mobileNo = normalize(row[idxMobile]);
    if (!name || !mobileNo) return;

    const key = `${name.toLowerCase()}-${mobileNo.replace(/\D/g, '')}`;
    if (uniqueContacts.has(key)) return;

    uniqueContacts.set(key, {
      id: normalize(row[idxId]) || key,
      name,
      mobileNo,
      department: normalize(row[idxDept]),
      designation: normalize(row[idxDesignation]),
      photo: normalize(row[idxPhoto]),
      status: normalize(row[idxStatus]),
      rowIndex: headerRowIndex + index + 2,
    });
  });

  return Array.from(uniqueContacts.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const summarizeRows = (rows) => rows.reduce((summary, item) => {
  const status = normalize(item.status).toUpperCase();
  const inTimeMinutes = parseTimeToMinutes(item.inTime);
  const outTimeMinutes = parseTimeToMinutes(item.outTime);
  const inTimeStr = item.inTime ? item.inTime.toString().trim() : '';
  const outTimeStr = item.outTime ? item.outTime.toString().trim() : '';
  const hasInTime = inTimeStr !== '' && inTimeStr !== '-';
  const hasOutTime = outTimeStr !== '' && outTimeStr !== '-';

  const isLateIn = hasInTime && inTimeMinutes !== null && inTimeMinutes > 9 * 60 + 15;
  const isEarlyOut = hasOutTime && outTimeMinutes !== null && outTimeMinutes < 18 * 60;

  if (status === 'P' || status === 'PRESENT') {
    summary.present += 1;
  } else if (status === 'A' || status === 'ABSENT') {
    summary.absent += 1;
  } else if (status === 'WO' || status === 'HOLIDAY') {
    summary.holiday += 1;
  } else if (status === 'HD' || status === 'HALF DAY') {
    summary.late += 1;
  }
  
  if ((status === 'P' || status === 'PRESENT') && (isLateIn || isEarlyOut)) {
    summary.late += 1;
  }

  return summary;
}, { present: 0, absent: 0, holiday: 0, late: 0 });

const EmployeeMobileHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();
  const initialAttendanceData = useMemo(
    () => readInitialAttendanceRows(),
    []
  );
  const initialFeedData = useMemo(() => readCachedList(FEED_CACHE_KEY, FEED_CACHE_TTL_MS), []);
  const initialContacts = useMemo(() => readCachedList(CONTACTS_CACHE_KEY, CONTACTS_CACHE_TTL_MS), []);
  const [attendanceData, setAttendanceData] = useState(initialAttendanceData);
  const [loading, setLoading] = useState(initialAttendanceData.length === 0);
  const [newJoiners, setNewJoiners] = useState(initialFeedData);
  const [feedLoading, setFeedLoading] = useState(initialFeedData.length === 0);
  const [contacts, setContacts] = useState(initialContacts);
  const [contactsLoading, setContactsLoading] = useState(initialContacts.length === 0);
  const [showContacts, setShowContacts] = useState(false);
  const [showLocalTravelModal, setShowLocalTravelModal] = useState(false);
  const [showOutstationModal, setShowOutstationModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [localTravelTab, setLocalTravelTab] = useState('in');
  const [activeTravelRow, setActiveTravelRow] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [contactSearch, setContactSearch] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const { notifications, notificationsLoading, unreadCount, markNotificationRead } = useHrmsNotifications({ showToast: true });

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : {};
  const employeeName = user?.Name || user?.name || user?.Username || 'Employee';

  const [profilePic, setProfilePic] = useState(user?.profilePic || "");
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const clockId = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(clockId);
  }, []);

  // Fetch active travel entry for logged-in employee (pending Travel OUT)
  useEffect(() => {
    let isMounted = true;
    const checkActiveTravel = async () => {
      try {
        const { data, error } = await supabase
          .from('travel_in_out')
          .select('id, person_name, return_date, actual')
          .order('id', { ascending: false })
          .limit(50);

        if (!error && data && isMounted) {
          const eName = employeeName.trim().toLowerCase();
          const myActive = data.find((r) => {
            const isPending = !r.return_date || String(r.return_date).trim() === '' || !r.actual;
            if (!isPending) return false;
            const pName = String(r.person_name || '').toLowerCase();
            return pName.includes(eName) || eName.includes(pName);
          });
          setActiveTravelRow(myActive || null);
        }
      } catch (e) {
        console.warn('Active travel check error:', e);
      }
    };

    checkActiveTravel();
    return () => { isMounted = false; };
  }, [employeeName, showLocalTravelModal]);

  const fetchContacts = async ({ silent = false } = {}) => {
    try {
      if (!silent) setContactsLoading(true);
      const { data, error } = await supabase
        .from('joining_fms')
        .select('id, employee_code, candidate_name, name_as_per_aadhar, designation, joining_place, mobile_no, candidate_photo, leave')
        .order('candidate_name', { ascending: true });

      if (error) throw error;

      const parsedContacts = (data || [])
        .filter((row) => {
          const isLeaving = (row.leave || '').trim().toLowerCase() === 'yes';
          const name = (row.candidate_name || row.name_as_per_aadhar || '').trim();
          return !isLeaving && name && name.toLowerCase() !== 'employee name';
        })
        .map((row) => ({
          id: row.employee_code || String(row.id),
          name: (row.candidate_name || row.name_as_per_aadhar || '').trim(),
          designation: (row.designation || '').trim(),
          department: (row.joining_place || '').trim(),
          mobileNo: (row.mobile_no || '').trim(),
          photo: (row.candidate_photo || '').trim(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setContacts(parsedContacts);
      writeCachedList(CONTACTS_CACHE_KEY, parsedContacts);
    } catch (error) {
      console.error('Employee contacts fetch from Supabase failed:', error);
      if (!silent) toast.error('Failed to load contacts');
    } finally {
      if (!silent) setContactsLoading(false);
    }
  };

  useEffect(() => {
    if (showContacts) {
      fetchContacts();
    }
  }, [showContacts]);

  useEffect(() => {
    const feedId = new URLSearchParams(location.search).get('feed');
    if (!feedId || feedLoading) return undefined;

    const timer = window.setTimeout(() => {
      const targetElement = [...document.querySelectorAll('[data-feed-notification-id]')]
        .find((element) => element.dataset.feedNotificationId === feedId);

      if (!targetElement) return;
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('ring-4', 'ring-rose-200');
      window.setTimeout(() => {
        targetElement.classList.remove('ring-4', 'ring-rose-200');
      }, 2200);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [feedLoading, location.search, newJoiners.length]);

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPic(true);
    const toastId = toast.loading("Uploading profile picture...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const cloudinaryData = await cloudinaryRes.json();
      
      if (!cloudinaryData.secure_url) throw new Error("Upload failed");
      const newPicUrl = cloudinaryData.secure_url;

      // Update profile picture in Supabase users table
      if (user?.id) {
        await supabase.from("users").update({ profile: newPicUrl }).eq("id", user.id);
      } else if (user?.username || user?.Username) {
        await supabase.from("users").update({ profile: newPicUrl }).ilike("username", (user.username || user.Username).trim());
      }

      // Also update in joining_fms if matching candidate_name
      if (employeeName && employeeName !== 'Employee') {
        await supabase.from("joining_fms").update({ candidate_photo: newPicUrl }).ilike("candidate_name", employeeName.trim());
      }

      setProfilePic(newPicUrl);
      
      const updatedUser = { ...user, profilePic: newPicUrl };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      toast.success("Profile picture updated!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile picture", { id: toastId });
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    let isMounted = true;
    let feedRequestRunning = false;

    const fetchJoiners = async ({ silent = false } = {}) => {
      if (feedRequestRunning) return;
      feedRequestRunning = true;

      try {
        if (!silent) setFeedLoading(true);

        const { data: raw, error } = await supabase
          .from('onboard_and_status')
          .select('id, date, image, sms, sms_type, name, designation')
          .order('id', { ascending: false });

        if (error) throw error;
        if (!isMounted) return;

        if (Array.isArray(raw) && raw.length > 0) {
          const processed = raw.map((row) => ({
            id: row.id,
            date: row.date || "",
            candidatePhoto: row.image || "",
            sms: row.sms || "",
            smsType: row.sms_type || "Announcement",
            name: row.name || "",
            designation: row.designation || "",
            notificationId: `feed-${row.id}-${row.date}|${row.sms_type}|${row.name}|${row.sms}`,
          })).filter(item => item.sms || item.candidatePhoto);

          writeCachedList(FEED_CACHE_KEY, processed);
          React.startTransition(() => setNewJoiners(processed));
        } else {
          writeCachedList(FEED_CACHE_KEY, []);
          setNewJoiners([]);
        }
      } catch (e) {
        console.error("Failed to fetch feed from Supabase:", e);
      } finally {
        feedRequestRunning = false;
        if (isMounted) {
          setFeedLoading(false);
        }
      }
    };

    const refreshFeed = () => fetchJoiners({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFeed();
      }
    };

    fetchJoiners({ silent: initialFeedData.length > 0 });

    const intervalId = window.setInterval(refreshFeed, FEED_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshFeed);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshFeed);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialFeedData.length]);

  useEffect(() => {
    let isMounted = true;

    const fetchAttendanceData = async () => {
      try {
        let query = supabase
          .from('attendance')
          .select('id, person_name, date_and_time, timestampe, date, time, status, month_name, year_name')
          .order('id', { ascending: false });

        if (employeeName && employeeName !== 'Employee') {
          query = query.ilike('person_name', `%${employeeName.trim()}%`);
        } else {
          query = query.limit(500);
        }

        const { data: supaRows, error } = await query;
        if (error) throw error;

        let rawRows = supaRows || [];

        // If specific employee name returned nothing (e.g. name format variation), fetch latest rows to match
        if (rawRows.length === 0 && employeeName && employeeName !== 'Employee') {
          const fallbackRes = await supabase
            .from('attendance')
            .select('id, person_name, date_and_time, timestampe, date, time, status, month_name, year_name')
            .order('id', { ascending: false })
            .limit(500);
          rawRows = fallbackRes.data || [];
        }

        const processedRows = buildOutstationAttendanceRows(rawRows);

        writeCachedList(MOBILE_ATTENDANCE_CACHE_KEY, processedRows);
        if (isMounted) React.startTransition(() => setAttendanceData(processedRows));
      } catch (error) {
        console.error('Employee mobile attendance fetch from Supabase failed:', error);
        if (isMounted) setAttendanceData((current) => (current.length ? current : []));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAttendanceData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchAttendanceData();
    };

    window.addEventListener('focus', fetchAttendanceData);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', fetchAttendanceData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [employeeName]);

  const userRows = useMemo(() => {
    const userName = normalize(employeeName).toLowerCase();
    return attendanceData.filter((item) =>
      normalize(item.employeeName).toLowerCase() === userName ||
      normalize(item.employeeName).toLowerCase().includes(userName)
    );
  }, [attendanceData, employeeName]);

  const todayAttendanceRecord = useMemo(() => {
    const todayKey = attendanceDateKey(now);
    return userRows
      .map((item) => ({ ...item, _dateObj: parseAttendanceDate(item.date, item.month) }))
      .filter((item) => item._dateObj && attendanceDateKey(item._dateObj) === todayKey)
      .sort((a, b) => b._dateObj - a._dateObj)[0];
  }, [userRows, now]);

  const currentMonthRows = useMemo(() => {
    return userRows.filter((item) => {
      const date = parseAttendanceDate(item.date, item.month);
      return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }, [userRows, now]);

  const monthSummary = useMemo(() => summarizeRows(currentMonthRows), [currentMonthRows]);
  const firstName = employeeName.split(' ')[0] || 'Employee';
  const greetingLabel = useMemo(() => {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [now]);
  const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDate = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' });
  const attendanceCardRecord = todayAttendanceRecord || null;
  const attendanceStatusLabel = attendanceCardRecord?.inTime
    ? attendanceCardRecord?.outTime
      ? 'Checked Out'
      : 'Checked In'
    : 'Not Checked In';
  const attendanceActionLabel = attendanceCardRecord?.inTime && !attendanceCardRecord?.outTime ? 'Check Out' : 'Check In';
  const dayGoalHours = 8;
  const latestWorkingDuration = formatWorkingDuration(attendanceCardRecord?.inTime, attendanceCardRecord?.outTime);
  const latestWorkingMinutes = latestWorkingDuration === '-'
    ? 0
    : latestWorkingDuration.split(':').reduce((total, value, index) => total + Number(value || 0) * (index === 0 ? 60 : 1), 0);
  const goalProgress = Math.min(100, Math.round((latestWorkingMinutes / (dayGoalHours * 60)) * 100));

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    logout();
    navigate('/login', { replace: true });
  };

  const handleNotificationClick = (item) => {
    markNotificationRead(item.id);
    if (item.targetPath) {
      setShowNotificationMenu(false);
      navigate(item.targetPath);
    }
  };

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) =>
      contact.name.toLowerCase().includes(query) ||
      contact.mobileNo.toLowerCase().includes(query) ||
      contact.designation.toLowerCase().includes(query) ||
      contact.department.toLowerCase().includes(query)
    );
  }, [contacts, contactSearch]);

  const handleQuickAction = (action) => {
    if (action.id === 'contacts') {
      setShowContacts(true);
      return;
    }
    if (action.label === 'Local Travel' || action.path === '/local-travel') {
      setLocalTravelTab(activeTravelRow ? 'out' : 'in');
      setShowLocalTravelModal(true);
      return;
    }
    if (action.label === 'Out Station Travel' || action.path === '/outstation-travel') {
      setShowOutstationModal(true);
      return;
    }
    if (action.label === 'Advance' || action.path === '/advance-request') {
      setShowAdvanceModal(true);
      return;
    }
    if (action.isUpcoming) {
      toast(`${action.label} form is coming soon!`, { icon: 'ℹ️' });
      return;
    }
    if (action.externalUrl) {
      window.open(action.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(action.path);
  };

  const quickActions = [
    { icon: Car, label: 'Local Travel', path: '/local-travel', badge: activeTravelRow ? '1 Active' : null, iconClass: 'bg-violet-50 text-violet-700 ring-violet-100' },
    { icon: Route, label: 'Out Station Travel', path: '/outstation-travel', iconClass: 'bg-sky-50 text-sky-700 ring-sky-100' },
    { icon: CreditCard, label: 'Advance', path: '/advance-request', iconClass: 'bg-teal-50 text-teal-700 ring-teal-100' },
    { icon: FileSpreadsheet, label: 'TA & DA Report', path: '/ta-da', iconClass: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
    { icon: Wallet, label: 'New System Development', externalUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfbs_I-HzZT2miZUS6Aacvu6qd5vxkkD12Of_QjOKEnEZkphg/viewform?usp=header', path: '/employee-mobile', iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    { icon: ClipboardList, label: 'HR Records', path: '/my-attendance', iconClass: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
    { icon: Fingerprint, label: 'Mark Attendance', path: '/mark-attendance', iconClass: 'bg-blue-50 text-blue-700 ring-blue-100' },
    { icon: FileText, label: 'Leave Request', path: '/leave-request', iconClass: 'bg-rose-50 text-rose-700 ring-rose-100' },
    { icon: CalendarDays, label: 'Leave History', path: '/leave-management', iconClass: 'bg-slate-100 text-slate-700 ring-slate-200' },
    { icon: User, label: 'My Profile', path: '/employee-profile', iconClass: 'bg-amber-50 text-amber-700 ring-amber-100' },
    { icon: Package, label: 'Company Assets', path: '/company-assets', iconClass: 'bg-teal-50 text-teal-700 ring-teal-100' },
    { icon: Briefcase, label: 'Alteration Form', externalUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSewFXJwJjtXErhqO_PoCLqIi-eH7i3Qau94LcnARJsgiwf2Lw/viewform?usp=publish-editor', path: '/employee-mobile', iconClass: 'bg-orange-50 text-orange-700 ring-orange-100' },
    { id: 'contacts', icon: Users, label: 'All Contacts', path: '/employee-mobile', iconClass: 'bg-cyan-50 text-cyan-700 ring-cyan-100' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-24 text-slate-950 lg:bg-[#f0f2f5] lg:pb-10">
      <div className="w-full px-4 pt-5 lg:max-w-[1480px] lg:px-8 lg:pt-8">
        <header className="hidden">
          <button
            type="button"
            onClick={() => !uploadingPic && fileInputRef.current?.click()}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Update profile picture"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
              {uploadingPic ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                </div>
              ) : profilePic ? (
                <img
                  src={getDriveImageUrl(profilePic, 150)}
                  alt="Profile"
                  decoding="async"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    if (!e.target.dataset.retried) {
                      e.target.dataset.retried = "true";
                      const match = profilePic.match(/\/d\/([a-zA-Z0-9_-]+)/) || profilePic.match(/id=([a-zA-Z0-9_-]+)/);
                      if (match && match[1]) {
                        e.target.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                      } else {
                        e.target.src = profilePic;
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100">
                  <User size={24} className="text-slate-700" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-slate-900">
                <Camera size={10} className="text-white" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{employeeName}</p>
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Employee Portal</p>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleProfilePicUpload} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotificationMenu((visible) => !visible)}
              className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <button type="button" onClick={handleLogout} className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]" aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>

          {showNotificationMenu ? (
            <div className="absolute right-0 top-14 z-40 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-black text-slate-950">Notifications</p>
                  <p className="text-[11px] font-bold text-slate-400">Birthdays, anniversaries and feed updates</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <Gift size={18} />
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto p-3">
                {notificationsLoading ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Checking notifications...</p>
                ) : notifications.length > 0 ? (
                  <div className="space-y-2">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                          item.read
                            ? 'bg-white ring-1 ring-slate-100 hover:bg-slate-50'
                            : 'bg-rose-50/70 ring-1 ring-rose-100 hover:bg-rose-50'
                        }`}
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-rose-600 ring-1 ring-rose-100">
                          {item.photo ? (
                            <img src={getDriveImageUrl(item.photo, 120)} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <Gift size={20} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            {!item.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /> : null}
                            <span className="block truncate text-sm font-black text-slate-900">{item.title}</span>
                          </span>
                          <span className="block truncate text-[11px] font-bold text-slate-500">
                            {item.message}
                          </span>
                          {item.dateLabel ? (
                            <span className="mt-0.5 block text-[10px] font-black uppercase tracking-wide text-rose-500">{item.dateLabel}</span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No notifications right now.</p>
                )}
              </div>
            </div>
          ) : null}
        </header>

        {/* Sub-sections */}
        {(() => {
          const renderAttendanceOverview = () => (
            <motion.section
              className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-[0_20px_45px_rgba(15,23,42,0.22)] border border-slate-800"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <span className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
              <span className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Attendance Overview</p>
                  <h1 className="mt-1 text-xl font-black leading-tight tracking-tight">{greetingLabel}, {firstName}</h1>
                  <p className="mt-0.5 text-xs font-semibold text-slate-300">{currentDate}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white ring-1 ring-white/20 backdrop-blur-md">
                  <Sparkles size={12} className="text-amber-300" />
                  {attendanceStatusLabel}
                </span>
              </div>

              <div className="relative z-10 mt-5 grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md text-cyan-300">
                      <Clock size={22} />
                    </div>
                    <div>
                      <p className="text-2xl font-black leading-none tracking-tight">{currentTime}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">Current time</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-2.5 ring-1 ring-white/10 text-[10px] font-bold text-slate-400">
                    <div>
                      <p className="text-slate-400">Worked</p>
                      <p className="mt-0.5 text-xs font-black text-white">{latestWorkingDuration}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Check In</p>
                      <p className="mt-0.5 text-xs font-black text-emerald-400">{formatTime(attendanceCardRecord?.inTime)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Check Out</p>
                      <p className="mt-0.5 text-xs font-black text-rose-300">{formatTime(attendanceCardRecord?.outTime)}</p>
                    </div>
                  </div>
                </div>

                <div className="relative grid h-20 w-20 place-items-center rounded-full border-4 border-indigo-400/30 bg-white/5 ring-1 ring-white/10 shadow-inner">
                  <div className="absolute inset-2 rounded-full border border-white/10" />
                  <div className="text-center">
                    <p className="text-lg font-black text-white">{goalProgress}%</p>
                    <p className="text-[9px] font-black uppercase leading-none text-indigo-300">Goal</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/mark-attendance')}
                className="relative z-10 mt-5 flex h-12 w-full items-center justify-between rounded-2xl bg-white hover:bg-slate-50 px-4 text-sm font-black text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.3)] transition-all cursor-pointer active:scale-[0.99]"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Fingerprint size={19} className="text-indigo-600" />
                  <span>{attendanceActionLabel}</span>
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-white">
                  <Play size={12} fill="currentColor" />
                </span>
              </button>
            </motion.section>
          );

          const renderQuickActions = (isDesktopView = false) => (
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-600" />
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Quick Actions</h2>
                  <span className="rounded-full bg-indigo-50 border border-indigo-100/80 px-2.5 py-0.5 text-[11px] font-black text-indigo-700">
                    {quickActions.length} Services
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/my-attendance')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>View records</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Active Journey Banner if user has an ongoing Travel IN */}
              {activeTravelRow && (
                <div className="mb-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-[1.5px] shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center justify-between gap-3 rounded-[15px] bg-white p-3 sm:p-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                        <Car size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-black text-amber-800">
                            {activeTravelRow.serial_no}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">Travel IN Done</span>
                        </div>
                        <p className="truncate text-xs font-black text-slate-900 mt-0.5">
                          {activeTravelRow.from_location} ➔ {activeTravelRow.to_location}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalTravelTab('out');
                        setShowLocalTravelModal(true);
                      }}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3.5 py-2 text-xs font-black text-white shadow-xs active:scale-95 transition cursor-pointer"
                    >
                      <span>Mark OUT</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              <div className={
                isDesktopView
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3.5"
                  : "grid grid-cols-2 gap-3"
              }>
                {quickActions.map((action, idx) => (
                  <motion.button
                    key={action.label}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    className={`group relative flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white px-3.5 text-left shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      isDesktopView ? "h-[74px]" : "h-[64px]"
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02 * idx, duration: 0.2 }}
                    aria-label={action.label}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 shadow-xs transition-transform duration-200 group-hover:scale-105 ${action.iconClass}`}>
                        <action.icon size={19} strokeWidth={2.4} />
                      </span>
                      <span className="min-w-0 pr-1">
                        <span className="block text-[12px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">
                          {action.label}
                        </span>
                        {action.badge ? (
                          <span className="mt-0.5 inline-block text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded-full animate-pulse">
                            {action.badge}
                          </span>
                        ) : action.isUpcoming ? (
                          <span className="mt-0.5 inline-block text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1 rounded">
                            Soon
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </motion.button>
                ))}
              </div>
            </section>
          );

          const renderTodayActivity = () => (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-black text-slate-950 tracking-tight">Today Activity &amp; Stats</h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/my-attendance')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  Details &rarr;
                </button>
              </div>
              <div className="rounded-[24px] border border-slate-200/90 bg-white p-4.5 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 shadow-xs">
                      <CheckCircle2 size={21} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{attendanceStatusLabel}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                        {attendanceCardRecord ? `${formatTime(attendanceCardRecord.inTime)} - ${formatTime(attendanceCardRecord.outTime)}` : 'No attendance record yet'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{latestWorkingDuration}</span>
                </div>
                <div className="mt-3.5 grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl bg-emerald-50/80 p-3 text-center ring-1 ring-emerald-100/80">
                    <p className="text-lg font-black text-emerald-700">{monthSummary.present}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Present</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50/80 p-3 text-center ring-1 ring-rose-100/80">
                    <p className="text-lg font-black text-rose-700">{monthSummary.absent}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Absent</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50/80 p-3 text-center ring-1 ring-amber-100/80">
                    <p className="text-lg font-black text-amber-700">{monthSummary.late}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Late</p>
                  </div>
                </div>
              </div>
            </section>
          );

          const renderCompanyUpdates = (isDesktopView = false) => (
            <section>
              <div className="mb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-sky-500" />
                  <h2 className="text-base font-black text-slate-950 tracking-tight">Company Updates</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                  {newJoiners.length} New
                </span>
              </div>
              
              {feedLoading ? (
                <div className="flex h-36 items-center justify-center rounded-[24px] bg-white border border-slate-200/80 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-100 border-t-slate-700"></div>
                </div>
              ) : newJoiners.length > 0 ? (
                <div className="space-y-6">
                  {/* Stories / Avatars Scroll */}
                  <motion.div 
                    className="flex w-full gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {newJoiners.slice(0, 10).map((person, idx) => (
                      <motion.div 
                        key={`story-${idx}`} 
                        className="flex flex-col items-center gap-1.5 shrink-0"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-white p-[2px] shadow-[0_10px_22px_rgba(15,23,42,0.08)] hover:scale-105 transition-transform">
                          {person.candidatePhoto ? (
                            <img 
                              src={getDriveImageUrl(person.candidatePhoto, 200)} 
                              alt="Story" 
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full rounded-full object-cover bg-gray-50" 
                              onError={(e) => {
                                if (!e.target.dataset.retried) {
                                  e.target.dataset.retried = "true";
                                  const match = person.candidatePhoto.match(/\/d\/([a-zA-Z0-9_-]+)/) || person.candidatePhoto.match(/id=([a-zA-Z0-9_-]+)/);
                                  if (match && match[1]) {
                                    e.target.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                                  } else {
                                    e.target.src = person.candidatePhoto;
                                  }
                                }
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-slate-100">
                              <Megaphone size={24} className="text-slate-600" />
                            </div>
                          )}
                        </div>
                        <span className="w-[68px] truncate text-center text-[10px] font-black text-slate-700">{person.smsType.split(' ')[0]}</span>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Feed Cards */}
                  <div className="flex flex-col gap-6">
                    {newJoiners.slice(0, 10).map((person, idx) => (
                      <motion.div 
                        key={`feed-${idx}`}
                        data-feed-notification-id={person.notificationId}
                        className="relative overflow-hidden rounded-[24px] border border-slate-200/90 bg-white pb-2 shadow-[0_10px_25px_rgba(15,23,42,0.05)] transition-all hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 + idx * 0.08 }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                              {person.candidatePhoto ? (
                                <img 
                                  src={getDriveImageUrl(person.candidatePhoto, 150)} 
                                  alt="Profile" 
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover" 
                                  onError={(e) => {
                                    if (!e.target.dataset.retried) {
                                      e.target.dataset.retried = "true";
                                      const match = person.candidatePhoto.match(/\/d\/([a-zA-Z0-9_-]+)/) || person.candidatePhoto.match(/id=([a-zA-Z0-9_-]+)/);
                                      if (match && match[1]) {
                                        e.target.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                                      } else {
                                        e.target.src = person.candidatePhoto;
                                      }
                                    }
                                  }}
                                />
                              ) : (
                                <Megaphone size={18} className="text-slate-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{person.name || "HR Updates"}</h3>
                              <p className="text-[11px] font-semibold text-slate-500">{person.designation || person.date}</p>
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600">
                            {person.smsType}
                          </div>
                        </div>

                        {/* Image */}
                        {person.candidatePhoto && (
                          <div className="flex w-full justify-center bg-slate-50 border-y border-slate-100 p-2 sm:p-3">
                            <img 
                              src={getDriveImageUrl(person.candidatePhoto, 800)} 
                              alt="Post" 
                              loading="lazy"
                              decoding="async"
                              className="h-auto w-full object-contain max-h-[520px] rounded-xl shadow-xs" 
                              onError={(e) => {
                                if (!e.target.dataset.retried) {
                                  e.target.dataset.retried = "true";
                                  const match = person.candidatePhoto.match(/\/d\/([a-zA-Z0-9_-]+)/) || person.candidatePhoto.match(/id=([a-zA-Z0-9_-]+)/);
                                  if (match && match[1]) {
                                    e.target.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                                  } else {
                                    e.target.src = person.candidatePhoto;
                                  }
                                }
                              }}
                            />
                          </div>
                        )}

                        {/* Caption / Message */}
                        <div className="px-5 pt-3 pb-2">
                          <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-slate-700">
                            {person.name && <span className="mr-2 font-bold text-slate-900">{person.name}</span>}
                            {person.sms}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">{person.date}</p>
                        </div>

                        <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-around">
                          {[
                            { icon: ThumbsUp, label: 'Like' },
                            { icon: MessageCircle, label: 'Comment' },
                            { icon: Share2, label: 'Share' },
                          ].map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer"
                            >
                              <action.icon size={15} />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] bg-white p-8 text-center border border-slate-200/80 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
                  <p className="text-sm font-bold text-slate-400">No new joiners or updates recently.</p>
                </div>
              )}
            </section>
          );

          return isDesktop ? (
            <div className="mt-5 space-y-7">
              {/* Top: Full-Width Spacious Quick Actions Command Grid */}
              {renderQuickActions(true)}

              {/* 2-Column Balanced Dashboard Workspace */}
              <div className="grid grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_430px] gap-8 items-start">
                {/* Left Column: Company Updates & Feed Posts */}
                <div className="min-w-0">
                  {renderCompanyUpdates(true)}
                </div>

                {/* Right Column: Sticky Personal Attendance & Stats Sidebar */}
                <div className="sticky top-6 space-y-6">
                  {renderAttendanceOverview()}
                  {renderTodayActivity()}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {renderAttendanceOverview()}
              {renderQuickActions(false)}
              {renderTodayActivity()}
              {renderCompanyUpdates(false)}
            </div>
          );
        })()}

      {showContacts &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/65 p-3 sm:p-4 pt-4 sm:pt-8 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-full max-w-md overflow-hidden rounded-[30px] bg-white shadow-2xl lg:max-w-xl"
            >
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500">Directory</p>
                  <h3 className="text-xl font-black text-slate-950">All Contacts</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">{contacts.length} employee contacts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContacts(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-500"
                  aria-label="Close contacts"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative mt-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(event) => setContactSearch(event.target.value)}
                  placeholder="Search name or number..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />
              </div>
            </div>

            <div className="max-h-[58dvh] space-y-3 overflow-y-auto p-4">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-600" />
                </div>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div
                    key={`${contact.id}-${contact.mobileNo}`}
                    className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-cyan-50 ring-1 ring-cyan-100">
                      {contact.photo ? (
                        <img
                          src={getDriveImageUrl(contact.photo, 160)}
                          alt={contact.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            if (!event.target.dataset.retried) {
                              event.target.dataset.retried = "true";
                              const match = contact.photo.match(/\/d\/([a-zA-Z0-9_-]+)/) || contact.photo.match(/id=([a-zA-Z0-9_-]+)/);
                              event.target.src = match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : contact.photo;
                            }
                          }}
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-lg font-black text-cyan-700">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-black text-slate-950">{contact.name}</h4>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
                        {contact.designation || contact.department || 'Employee'}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-black text-cyan-700">
                        <Phone size={13} />
                        {contact.mobileNo}
                      </p>
                    </div>
                    <a
                      href={`tel:${contact.mobileNo.replace(/\s+/g, '')}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"
                      aria-label={`Call ${contact.name}`}
                    >
                      <Phone size={17} />
                    </a>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-50 p-8 text-center">
                  <p className="text-sm font-black text-slate-500">No contacts found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Local Travel Information Modal */}
      {showLocalTravelModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/75 p-2 sm:p-4 md:p-6 pt-3 sm:pt-5 md:pt-6 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-4xl lg:max-w-5xl max-h-[94vh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200/80 animate-in fade-in-50 zoom-in-95 duration-150">
              <LocalTravel isModal initialTab={localTravelTab} onClose={() => setShowLocalTravelModal(false)} />
            </div>
          </div>,
          document.body
        )
      }

      {/* Out Station Travel Modal */}
      {showOutstationModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/75 p-2 sm:p-4 md:p-6 pt-3 sm:pt-5 md:pt-6 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-4xl lg:max-w-5xl max-h-[94vh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200/80 animate-in fade-in-50 zoom-in-95 duration-150">
              <OutstationTravel isModal onClose={() => setShowOutstationModal(false)} />
            </div>
          </div>,
          document.body
        )
      }

      {/* Advance Request Modal */}
      {showAdvanceModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/75 p-2 sm:p-4 md:p-6 pt-3 sm:pt-5 md:pt-6 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-4xl lg:max-w-5xl max-h-[94vh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200/80 animate-in fade-in-50 zoom-in-95 duration-150">
              <AdvanceRequest isModal onClose={() => setShowAdvanceModal(false)} />
            </div>
          </div>,
          document.body
        )
      }

      </div>
    </div>
  );
};

export default EmployeeMobileHome;
