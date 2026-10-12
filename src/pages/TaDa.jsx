import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  ExternalLink,
  FileText,
  Filter,
  RefreshCw,
  Route,
  Search,
  User,
  Wallet,
  X,
  Check,
  Plus,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import AdvanceRequest from './AdvanceRequest';
import { triggerAdvanceProcessedNotification } from '../services/whatsappService';

// ==========================================
// ENHANCED SEARCHABLE SINGLE-SELECT DROPDOWN
// ==========================================
const SearchableSelect = ({
  icon: Icon,
  value,
  onChange,
  options = [],
  allLabel = 'All',
  placeholder = 'Search...',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((opt) => String(opt).toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className={`relative ${open ? 'z-50' : 'z-10'}`} ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery('');
        }}
        className={`h-12 w-full rounded-xl border text-left text-sm font-semibold transition flex items-center justify-between pl-12 pr-4 outline-none cursor-pointer ${
          value
            ? 'border-indigo-500 bg-indigo-50/40 text-indigo-950 font-bold shadow-xs hover:border-indigo-600 focus:ring-4 focus:ring-indigo-100'
            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100'
        }`}
      >
        {Icon && (
          <Icon
            size={18}
            className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${
              value ? 'text-indigo-600' : 'text-slate-400'
            }`}
          />
        )}
        <span className="block truncate pr-2">{value || allLabel}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setOpen(false);
              }}
              className="p-1 rounded-md hover:bg-indigo-200/60 text-slate-400 hover:text-indigo-800 transition cursor-pointer"
              title="Clear"
            >
              <X size={15} />
            </span>
          )}
          <ChevronDown
            size={17}
            className={`pointer-events-none text-slate-400 transition-transform duration-200 ${
              open ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 max-h-64 w-full min-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fadeIn">
          {options.length > 5 && (
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-52 overflow-y-auto p-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 rounded-xl font-semibold transition cursor-pointer ${
                !value
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{allLabel}</span>
              {!value && <Check size={14} className="text-indigo-600" />}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">No matching options</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 rounded-xl font-semibold transition cursor-pointer ${
                    value === opt
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate text-left">{opt}</span>
                  {value === opt && <Check size={14} className="text-indigo-600 shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const OUTSTATION_SPREADSHEET_ID = '1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw';
const ADVANCE_SHEET_NAME = 'Advance';
const FMS_SHEET_NAME = 'FMS';
const BIKE_KM_RATE = 2.5;
const CAR_KM_RATE = 4.5;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pickValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const number = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
};

const getVehicleKmRate = (vehicleType) => {
  const normalized = String(vehicleType || '').toLowerCase();
  if (normalized.includes('bike')) return BIKE_KM_RATE;
  if (normalized.includes('car')) return CAR_KM_RATE;
  return 0;
};

const parseDateToObj = (value) => {
  if (!value) return null;
  const raw = value.toString().trim();
  if (!raw) return null;

  if (raw.includes('T') && raw.includes(':')) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const gvizMatch = raw.match(/^Date\((\d+),(\d+),(\d+)/i);
  if (gvizMatch) {
    return new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3]));
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
    return new Date(year, Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  }

  return null;
};

const formatDateValue = (value) => {
  const date = parseDateToObj(value);
  if (!date) return value ? String(value) : '-';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatDateObj = (date) => {
  if (!date) return '-';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatTimeValue = (value) => {
  if (!value) return '-';
  const raw = value.toString().trim();
  if (!raw) return '-';

  if (raw.includes('T') && raw.includes(':')) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  }

  if (raw.includes('/') && raw.includes(':')) {
    const parts = raw.split(' ');
    if (parts.length >= 2) return parts[1].substring(0, 5);
  }

  return raw;
};

const getMonthYear = (value) => {
  const date = parseDateToObj(value);
  if (!date) return { month: '', year: '', dateObj: null };
  return {
    month: MONTHS[date.getMonth()],
    year: String(date.getFullYear()),
    dateObj: date,
  };
};

const buildUrlLinks = (items) => items.filter((item) => item.url);

const parseGoogleSheetTable = (text, sheetLabel = 'sheet') => {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`Invalid ${sheetLabel} response`);
  }

  const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  if (payload.status && payload.status !== 'ok') {
    throw new Error(payload.errors?.[0]?.detailed_message || `Failed to read ${sheetLabel}`);
  }

  return (payload.table?.rows || []).map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return '';
      return cell.f ?? cell.v ?? '';
    })
  );
};

const fetchSheetRows = async (sheetName) => {
  const url = `https://docs.google.com/spreadsheets/d/${OUTSTATION_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&cb=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${sheetName} sheet HTTP error! status: ${response.status}`);

  const text = await response.text();
  return parseGoogleSheetTable(text, sheetName);
};

const normalizeFmsSheetRow = (row) => {
  const inVehicleType = row[5] || '';
  const outVehicleType = row[16] || '';
  const vehicleType = inVehicleType || outVehicleType;
  const totalRunningKm = parseNumber(row[7]);

  return {
    serialNo: row[1] || '',
    vehicleType,
    inVehicleType,
    outVehicleType,
    totalRunningKm,
    inProofUrl: row[8] || '',
    outProofUrl: row[18] || '',
    totalAmount: totalRunningKm * getVehicleKmRate(vehicleType),
  };
};

const fetchFmsRowsFromSheet = async () => {
  const rows = await fetchSheetRows(FMS_SHEET_NAME);
  return rows
    .filter((row) => {
      const personName = String(row?.[2] || '').trim();
      return personName && personName.toLowerCase() !== 'person name';
    })
    .map(normalizeFmsSheetRow);
};

const fetchAdvanceRowsFromSheet = async () => {
  return fetchSheetRows(ADVANCE_SHEET_NAME);
};

const normalizeAdvanceRow = (row) => {
  if (!Array.isArray(row)) return row || {};

  return {
    timestamp: row[0],
    serialNo: row[1],
    personName: row[2],
    fromLocation: row[3],
    toLocation: row[4],
    startDate: row[5],
    endDate: row[6],
    travelType: row[7],
    advance: row[8],
    companyName: row[9],
    remarks: row[10],
    planned: row[11],
    actual: row[12],
    delay: row[13],
    status: row[14],
    remarks1: row[15],
    approvedBy: row[16],
  };
};

const ProofLink = ({ url, label }) => {
  if (!url) return <span className="text-xs font-semibold text-slate-300">-</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
    >
      {label}
      <ExternalLink size={12} />
    </a>
  );
};

const getStatusClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('approved')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized.includes('rejected')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const sanitizeFileName = (value) =>
  String(value || 'all').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'all';

const TaDa = () => {
  const [visitRows, setVisitRows] = useState([]);
  const [travellingRows, setTravellingRows] = useState([]);
  const [advanceRows, setAdvanceRows] = useState([]);
  const [activeTab, setActiveTab] = useState('fms');
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceActionModal, setAdvanceActionModal] = useState({
    open: false,
    item: null,
    type: 'Approved',
    remarks: '',
    saving: false,
  });

  const handleOpenAdvanceAction = (item, type) => {
    setAdvanceActionModal({
      open: true,
      item,
      type,
      remarks: type === 'Approved' ? 'Approved' : 'Operational requirements',
      saving: false,
    });
  };

  const handleConfirmAdvanceAction = async () => {
    if (!advanceActionModal.item) return;
    setAdvanceActionModal((prev) => ({ ...prev, saving: true }));

    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const actualTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : {};
      const approverName = user.Name || user.name || user.displayName || 'Neha Garg';

      const target = advanceActionModal.item;
      const statusType = advanceActionModal.type;
      const remarksText = advanceActionModal.remarks.trim() || statusType;

      if (target.dbId) {
        const { error } = await supabase
          .from('advance')
          .update({
            status: statusType,
            remarks1: remarksText,
            approved_by: approverName,
            actual: actualTimestamp,
          })
          .eq('id', target.dbId);

        if (error) throw error;
      }

      setAdvanceRows((prev) =>
        prev.map((r) =>
          r.id === target.id
            ? {
                ...r,
                status: statusType,
                remarks1: remarksText,
                approvedBy: approverName,
                actualDate: actualTimestamp,
              }
            : r
        )
      );

      // Auto-trigger WhatsApp notification to 9201958125, 9321691120 + requester
      triggerAdvanceProcessedNotification({
        personName: target.employeeName,
        fromLocation: target.from,
        toLocation: target.to,
        travelType: target.vehicleType,
        startDate: target.startDate,
        endDate: target.endDate,
        advance: target.advanceAmount,
        remarks1: remarksText,
        status: statusType,
        approvedBy: approverName,
      }).catch((err) => console.warn('Advance WhatsApp notice:', err));

      toast.success(`Advance request marked as ${statusType}! WhatsApp alert sent.`);
      setAdvanceActionModal({ open: false, item: null, type: 'Approved', remarks: '', saving: false });
    } catch (err) {
      console.error('Advance action error:', err);
      toast.error('Action failed: ' + err.message);
      setAdvanceActionModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const fetchTaDaData = async () => {
    setLoading(true);
    setError(null);

    try {
      let visits = [];
      try {
        const { data: dbTravel, error: dbErr } = await supabase
          .from('travel_in_out')
          .select('id, serial_no, person_name, date, timestamp, actual, from_location, to_location, in_vehicle_type, out_vehicle_type, total_running_km, in_vehicle_amount, vehicle_amount, in_vehicle_mtr_pic, vehical_mtr_pic, remarks, in_remarks')
          .order('id', { ascending: false });

        if (!dbErr && dbTravel && dbTravel.length > 0) {
          visits = dbTravel.map((row) => {
            const dateSource = row.date || row.timestamp || '';
            const dateMeta = getMonthYear(dateSource);
            const totalRunningKm = Math.round(Number(row.total_running_km) || 0);
            const vehicleType = row.in_vehicle_type || row.out_vehicle_type || '';
            const calculatedAmount = Math.round(totalRunningKm * getVehicleKmRate(vehicleType));

            return {
              id: `visit-${row.id}`,
              source: 'FMS',
              serialNo: row.serial_no || '',
              employeeName: String(row.person_name || '').trim(),
              date: row.date || formatDateValue(dateSource),
              dateObj: dateMeta.dateObj,
              month: dateMeta.month,
              year: dateMeta.year,
              from: row.from_location || '',
              to: row.to_location || '',
              inTime: formatTimeValue(row.timestamp),
              outTime: formatTimeValue(row.actual || row.timestamp),
              vehicleType,
              totalRunningKm,
              kmRate: getVehicleKmRate(vehicleType),
              inVehicleAmount: Number(row.in_vehicle_amount) || calculatedAmount,
              outVehicleAmount: Number(row.vehicle_amount) || '',
              totalAmount: Number(row.in_vehicle_amount) || calculatedAmount,
              remarks: row.remarks || row.in_remarks || '',
              proofLinks: buildUrlLinks([
                { label: 'IN Proof', url: row.in_vehicle_mtr_pic },
                { label: 'OUT Proof', url: row.vehical_mtr_pic },
              ]),
            };
          });
        }
      } catch (sbError) {
        console.warn('Supabase travel_in_out fetch note:', sbError);
      }

      if (visits.length === 0) {
        let fmsSheetRows = [];
        try {
          fmsSheetRows = await fetchFmsRowsFromSheet();
        } catch (sheetError) {
          console.error('FMS sheet detail fetch failed:', sheetError);
        }

        const rawFmsRows = await fetchSheetRows('FMS').catch(() => []);
        visits = rawFmsRows
          .filter((row) => {
            const personName = String(row[2] || '').trim();
            return personName && personName.toLowerCase() !== 'person name';
          })
          .map((row, index) => {
            const fmsSheetRow = fmsSheetRows[index] || {};
            const dateSource = row[0] || row[13] || '';
            const dateMeta = getMonthYear(dateSource);
            const rawKm = fmsSheetRow.totalRunningKm || parseNumber(row[7]);
            const totalRunningKm = Math.round(rawKm);
            const vehicleType = row[5] || row[16] || fmsSheetRow.vehicleType || '';
            const calculatedAmount = Math.round(rawKm * getVehicleKmRate(vehicleType));
            
            const inProofUrl = row[8] || fmsSheetRow.inProofUrl;
            const outProofUrl = (row[18] || row[15]) || fmsSheetRow.outProofUrl;

            return {
              id: `visit-${index}`,
              source: 'FMS',
              serialNo: row[1] || fmsSheetRow.serialNo || `VIS-${String(index + 1).padStart(3, '0')}`,
              employeeName: String(row[2] || '').trim(),
              date: formatDateValue(dateSource),
              dateObj: dateMeta.dateObj,
              month: dateMeta.month,
              year: dateMeta.year,
              from: row[3] || '',
              to: row[4] || '',
              inTime: formatTimeValue(row[0]),
              outTime: formatTimeValue(row[13]),
              vehicleType,
              totalRunningKm,
              kmRate: getVehicleKmRate(vehicleType),
              inVehicleAmount: calculatedAmount,
              outVehicleAmount: '',
              totalAmount: calculatedAmount,
              remarks: row[10] || '',
              proofLinks: buildUrlLinks([
                { label: 'IN Proof', url: inProofUrl },
                { label: 'OUT Proof', url: outProofUrl },
              ]),
            };
          });
      }

      let travelling = [];
      try {
        const { data: dbOutstation, error: dbOutErr } = await supabase
          .from('outstation_traveling')
          .select('id, serial_no, name, timestamp, travel_date, return_date, from_location, to_location, vehicle_type, stay_date, advance_amount, stay_bill, fooding_bill, travel_receipt, local_travel_receipt, return_ticket')
          .order('id', { ascending: false });

        if (!dbOutErr && dbOutstation && dbOutstation.length > 0) {
          travelling = dbOutstation.map((row, index) => {
            const dateTime = row.travel_date || row.timestamp || '';
            const dateMeta = getMonthYear(dateTime);
            const advanceAmount = Number(row.advance_amount) || 0;
            const stayDay = parseNumber(row.stay_date);

            return {
              id: `travel-${row.id || index}`,
              source: 'Travelling',
              serialNo: row.serial_no || `TA-${String(index + 1).padStart(3, '0')}`,
              employeeName: String(row.name || '').trim(),
              date: formatDateValue(dateTime),
              dateObj: dateMeta.dateObj,
              month: dateMeta.month,
              year: dateMeta.year,
              from: row.from_location || '',
              to: row.to_location || '',
              inTime: formatTimeValue(row.timestamp),
              outTime: row.return_date ? formatDateValue(row.return_date) : '-',
              vehicleType: row.vehicle_type || '',
              stayDay: stayDay,
              advanceAmount,
              totalAmount: advanceAmount,
              proofLinks: buildUrlLinks([
                { label: 'Stay Bill', url: row.stay_bill },
                { label: 'Food Bill', url: row.fooding_bill },
                { label: 'Receipt', url: row.travel_receipt },
                { label: 'Local Receipt', url: row.local_travel_receipt },
                { label: 'Return Ticket', url: row.return_ticket },
              ]),
            };
          });
        }
      } catch (err) {
        console.warn('Supabase outstation_traveling fetch note:', err);
      }

      if (travelling.length === 0) {
        const rawTravellingRows = await fetchSheetRows('Travelling').catch(() => []);
        travelling = rawTravellingRows
          .filter((row) => {
            const personName = String(row[1] || '').trim();
            return personName && personName.toLowerCase() !== 'person name';
          })
          .map((row, index) => {
            const personName = row[1] || '';
            const dateTime = row[0] || '';
            const fromLocation = row[2] || '';
            const toLocation = row[3] || '';
            const vehicleType = row[4] || '';
            const stayDay = row[5] || '';
            
            const dateMeta = getMonthYear(dateTime);
            const advanceAmount = parseNumber(row[16]);

            return {
              id: `travel-${index}`,
              source: 'Travelling',
              serialNo: `TA-${String(index + 1).padStart(3, '0')}`,
              employeeName: String(personName).trim(),
              date: formatDateValue(dateTime),
              dateObj: dateMeta.dateObj,
              month: dateMeta.month,
              year: dateMeta.year,
              from: fromLocation,
              to: toLocation,
              inTime: formatTimeValue(dateTime),
              outTime: '-',
              vehicleType: vehicleType,
              stayDay: parseNumber(stayDay),
              advanceAmount,
              totalAmount: advanceAmount,
              proofLinks: buildUrlLinks([
                { label: 'Stay Bill', url: row[8] },
                { label: 'Food Bill', url: row[10] },
                { label: 'Receipt', url: row[11] },
              ]),
            };
          });
      }

      let advances = [];
      try {
        const { data: dbAdvance, error: dbAdvErr } = await supabase
          .from('advance')
          .select('id, serial_no, person_name, timestamp, start_date, end_date, planned, actual, delay, from_location, to_location, travel_type, advance, company_name, status, approved_by, remarks, remarks1')
          .order('id', { ascending: false });

        if (!dbAdvErr && dbAdvance && dbAdvance.length > 0) {
          advances = dbAdvance.map((row, index) => {
            const employeeName = String(row.person_name || '').trim();
            const dateSource = row.start_date || row.timestamp || row.planned || row.actual || '';
            const dateMeta = getMonthYear(dateSource);
            const advanceAmount = Number(row.advance) || 0;

            return {
              id: `advance-${row.id || index}`,
              dbId: row.id,
              rawData: row,
              source: 'Advance',
              serialNo: row.serial_no || `AD-${String(index + 1).padStart(3, '0')}`,
              employeeName,
              date: formatDateValue(dateSource),
              dateObj: dateMeta.dateObj,
              month: dateMeta.month,
              year: dateMeta.year,
              from: row.from_location || '',
              to: row.to_location || '',
              inTime: formatTimeValue(row.timestamp),
              outTime: '-',
              vehicleType: row.travel_type || '',
              startDate: formatDateValue(row.start_date),
              endDate: formatDateValue(row.end_date),
              plannedDate: formatDateValue(row.planned),
              actualDate: formatDateValue(row.actual),
              delay: row.delay || '',
              companyName: row.company_name || '',
              status: row.status || 'Pending',
              approvedBy: row.approved_by || '',
              remarks: row.remarks || '',
              remarks1: row.remarks1 || '',
              advanceAmount,
              totalAmount: advanceAmount,
              proofLinks: [],
            };
          });
        }
      } catch (sbAdvError) {
        console.warn('Supabase advance fetch note:', sbAdvError);
      }

      if (advances.length === 0) {
        let rawAdvanceRows = await fetchAdvanceRowsFromSheet().catch(() => []);

        advances = rawAdvanceRows
          .map(normalizeAdvanceRow)
          .filter((row) => {
            const personName = String(pickValue(row, ['personName', 'Person Name', 'employeeName', 'Employee Name']) || '').trim();
            return personName && personName.toLowerCase() !== 'person name';
          })
          .map((row, index) => {
            const employeeName = String(pickValue(row, ['personName', 'Person Name', 'employeeName', 'Employee Name']) || '').trim();
            const timestamp = pickValue(row, ['timestamp', 'Timestamp']);
            const startDate = pickValue(row, ['startDate', 'Start Date', 'fromDate']);
            const endDate = pickValue(row, ['endDate', 'End Date', 'toDate']);
            const planned = pickValue(row, ['planned', 'Planned']);
            const actual = pickValue(row, ['actual', 'Actual']);
            const dateSource = startDate || timestamp || planned || actual;
            const dateMeta = getMonthYear(dateSource);
            const advanceAmount = parseNumber(pickValue(row, ['advance', 'Advance', 'advanceAmount', 'Advance Amount']));

            return {
              id: `advance-${index}`,
              source: 'Advance',
              serialNo: pickValue(row, ['serialNo', 'Serial No', 'serial']) || `AD-${String(index + 1).padStart(3, '0')}`,
              employeeName,
              date: formatDateValue(dateSource),
              dateObj: dateMeta.dateObj,
              month: dateMeta.month,
              year: dateMeta.year,
              from: pickValue(row, ['fromLocation', 'From Location', 'from', 'From']),
              to: pickValue(row, ['toLocation', 'To Location', 'to', 'To']),
              inTime: formatTimeValue(timestamp),
              outTime: '-',
              vehicleType: pickValue(row, ['travelType', 'Travel Type', 'vehicleType']),
              startDate: formatDateValue(startDate),
              endDate: formatDateValue(endDate),
              plannedDate: formatDateValue(planned),
              actualDate: formatDateValue(actual),
              delay: pickValue(row, ['delay', 'Delay']),
              companyName: pickValue(row, ['companyName', 'Company Name', 'Compnay Name', 'company']),
              status: pickValue(row, ['status', 'Status']),
              approvedBy: pickValue(row, ['approvedBy', 'Approved by', 'Approved By']),
              remarks: pickValue(row, ['remarks', 'Remarks', 'Reamakrs', 'Reamarks']),
              remarks1: pickValue(row, ['remarks1', 'Remarks1', 'Remarks 1']),
              advanceAmount,
              totalAmount: advanceAmount,
              proofLinks: [],
            };
          });
      }

      setVisitRows(visits.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0)));
      setTravellingRows(travelling.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0)));
      setAdvanceRows(advances.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaDaData();
  }, []);

  const allRows = useMemo(() => [...visitRows, ...travellingRows, ...advanceRows], [visitRows, travellingRows, advanceRows]);
  const activeRows = activeTab === 'fms'
    ? visitRows
    : activeTab === 'travelling'
      ? travellingRows
      : advanceRows;

  const employeeOptions = useMemo(
    () => [...new Set(
      allRows
        .filter((item) => (!monthFilter || item.month === monthFilter) && (!yearFilter || item.year === yearFilter))
        .map((item) => item.employeeName)
        .filter(Boolean)
    )].sort(),
    [allRows, monthFilter, yearFilter]
  );
  const monthOptions = useMemo(
    () => [...new Set(allRows.map((item) => item.month).filter(Boolean))]
      .sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b)),
    [allRows]
  );
  const yearOptions = useMemo(
    () => [...new Set(allRows.map((item) => item.year).filter(Boolean))].sort(),
    [allRows]
  );
  const vehicleOptions = useMemo(
    () => [...new Set(allRows.map((item) => item.vehicleType).filter(Boolean))].sort(),
    [allRows]
  );

  const matchesFilters = (item, useEmployeeFilter = true) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      item.serialNo.toLowerCase().includes(search) ||
      item.employeeName.toLowerCase().includes(search) ||
      item.from.toLowerCase().includes(search) ||
      item.to.toLowerCase().includes(search) ||
      item.vehicleType.toLowerCase().includes(search) ||
      (item.companyName || '').toLowerCase().includes(search) ||
      (item.status || '').toLowerCase().includes(search) ||
      (item.approvedBy || '').toLowerCase().includes(search) ||
      (item.remarks || '').toLowerCase().includes(search) ||
      item.date.toLowerCase().includes(search);

    return matchesSearch &&
      (!useEmployeeFilter || !employeeFilter || item.employeeName === employeeFilter) &&
      (activeTab !== 'fms' || !vehicleFilter || item.vehicleType === vehicleFilter) &&
      (!monthFilter || item.month === monthFilter) &&
      (!yearFilter || item.year === yearFilter);
  };

  const filteredRows = activeRows.filter((item) => matchesFilters(item));

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Reset to first page when any filter or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, employeeFilter, vehicleFilter, monthFilter, yearFilter, rowsPerPage]);

  const totalRecords = filteredRows.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);

  const paginatedRows = useMemo(() => {
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  const summary = filteredRows.reduce((acc, item) => {
    acc.records += 1;
    acc.totalKm += item.totalRunningKm || 0;
    acc.totalAmount += item.totalAmount || 0;
    acc.stayDays += item.stayDay || 0;
    const status = String(item.status || '').toLowerCase();
    if (status.includes('approved')) acc.approved += 1;
    if (status.includes('rejected')) acc.rejected += 1;
    if (activeTab === 'advance' && !status.includes('approved') && !status.includes('rejected')) acc.pending += 1;
    return acc;
  }, { records: 0, totalKm: 0, totalAmount: 0, stayDays: 0, approved: 0, rejected: 0, pending: 0 });

  const downloadExcel = () => {
    const rows = filteredRows.map((item) => ({
      Source: item.source,
      'Serial No': item.serialNo,
      Date: item.date,
      'Employee Name': item.employeeName,
      From: item.from,
      To: item.to,
      'In Time': item.inTime,
      'Out Time': item.outTime,
      'Vehicle Type': item.vehicleType,
      'Start Date': item.startDate || '',
      'End Date': item.endDate || '',
      'Company Name': item.companyName || '',
      'Total Running KM': item.totalRunningKm || '',
      'Stay Days': item.stayDay || '',
      'In Vehicle Amount': item.inVehicleAmount || '',
      'Out Vehicle Amount': item.outVehicleAmount || '',
      'Advance Amount': item.advanceAmount || '',
      'Total Amount': item.totalAmount || '',
      Planned: item.plannedDate || '',
      Actual: item.actualDate || '',
      Delay: item.delay || '',
      Status: item.status || '',
      'Approved By': item.approvedBy || '',
      'Proof URLs': item.proofLinks.map((link) => `${link.label}: ${link.url}`).join(' | '),
      Remarks: item.remarks || '',
      Remarks1: item.remarks1 || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TA DA');
    XLSX.writeFile(workbook, `ta_da_${activeTab}_${monthFilter || 'all'}_${yearFilter || 'all'}.xlsx`);
  };

  // Employee-wise vehicle KM + amount from the filtered FMS rows.
  const downloadVehicleCount = () => {
    const vehicleTypes = [...new Set(filteredRows.map((item) => String(item.vehicleType || '').trim() || 'Unknown'))].sort();

    const byEmployee = {};
    filteredRows.forEach((item) => {
      const name = String(item.employeeName || '').trim();
      if (!name) return;
      const vt = String(item.vehicleType || '').trim() || 'Unknown';
      const km = Number(item.totalRunningKm) || 0;
      const amount = Number(item.totalAmount) || Number(item.inVehicleAmount) || 0;
      if (!byEmployee[name]) byEmployee[name] = { km: {}, amounts: {}, trips: 0 };
      byEmployee[name].km[vt] = (byEmployee[name].km[vt] || 0) + km;
      byEmployee[name].amounts[vt] = (byEmployee[name].amounts[vt] || 0) + amount;
      byEmployee[name].trips += 1;
    });

    const reportRows = Object.keys(byEmployee).sort().map((name) => {
      const row = { 'Employee Name': name };
      let totalKm = 0;
      vehicleTypes.forEach((vt) => {
        const km = Math.round(byEmployee[name].km[vt] || 0);
        row[`${vt} Km`] = km;
        totalKm += km;
      });
      row['Total Km'] = totalKm;
      row['Total Trips'] = byEmployee[name].trips;

      let totalAmount = 0;
      vehicleTypes.forEach((vt) => {
        const amount = Math.round(byEmployee[name].amounts[vt] || 0);
        row[`${vt} Amount`] = amount;
        totalAmount += amount;
      });
      row['Total Amount'] = totalAmount;
      return row;
    });

    const header = [
      'Employee Name',
      ...vehicleTypes.map((vt) => `${vt} Km`),
      'Total Km',
      'Total Trips',
      ...vehicleTypes.map((vt) => `${vt} Amount`),
      'Total Amount',
    ];

    const worksheet = XLSXStyle.utils.json_to_sheet(reportRows, { header });

    // Highlight the Total Trips and Total Amount columns (header + data).
    const totalKmCol = 1 + vehicleTypes.length;
    const totalTripsCol = 2 + vehicleTypes.length;
    const totalAmountCol = header.length - 1;
    const highlight = { fill: { fgColor: { rgb: 'FFF200' } }, font: { bold: true } };
    for (let r = 0; r <= reportRows.length; r++) {
      [totalKmCol, totalTripsCol, totalAmountCol].forEach((c) => {
        const ref = XLSXStyle.utils.encode_cell({ r, c });
        if (worksheet[ref]) {
          worksheet[ref].s = { ...(worksheet[ref].s || {}), ...highlight };
        }
      });
    }

    const workbook = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(workbook, worksheet, 'Vehicle Count');
    XLSXStyle.writeFile(workbook, `ta_da_vehicle_count_${monthFilter || 'all'}_${yearFilter || 'all'}.xlsx`);
  };

  const buildFmsKmSummary = (rows, includeEmployee) => {
    const summaryMap = rows.reduce((acc, item) => {
      const monthName = item.month || 'No Month';
      const yearName = item.year || '';
      const key = includeEmployee
        ? `${item.employeeName}__${monthName}__${yearName}`
        : `${monthName}__${yearName}`;

      if (!acc[key]) {
        acc[key] = {
          employeeName: item.employeeName,
          monthName: yearName ? `${monthName} ${yearName}` : monthName,
          totalKm: 0,
        };
      }

      acc[key].totalKm += item.totalRunningKm || 0;
      acc[key].amount = (acc[key].amount || 0) + (item.totalAmount || 0);
      return acc;
    }, {});

    return Object.values(summaryMap)
      .sort((a, b) => {
        const employeeSort = includeEmployee ? a.employeeName.localeCompare(b.employeeName) : 0;
        if (employeeSort !== 0) return employeeSort;
        return a.monthName.localeCompare(b.monthName);
      })
      .map((item) => ({
        ...item,
        amount: item.amount || 0,
      }));
  };

  const downloadFmsKmPdf = (reportType) => {
    const isAllReport = reportType === 'all';
    if (!isAllReport && !employeeFilter) {
      alert('Individual PDF ke liye pehle employee select karein.');
      return;
    }

    const reportRows = visitRows
      .filter((item) => matchesFilters(item, !isAllReport))
      .sort((a, b) => {
        if (isAllReport) {
          const nameSort = a.employeeName.localeCompare(b.employeeName);
          if (nameSort !== 0) return nameSort;
        }
        return (a.dateObj || 0) - (b.dateObj || 0);
      });

    if (reportRows.length === 0) {
      alert('Selected filters ke liye FMS report data nahi mila.');
      return;
    }

    const dates = reportRows.map((item) => item.dateObj).filter(Boolean).sort((a, b) => a - b);
    const summaryRows = buildFmsKmSummary(reportRows, isAllReport);
    const totalKm = reportRows.reduce((sum, item) => sum + (item.totalRunningKm || 0), 0);
    const totalAmount = reportRows.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const employeeLabel = isAllReport ? 'All Employees' : employeeFilter;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`TA & DA FMS ${isAllReport ? 'All' : 'Individual'} Report`, 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Employee: ${employeeLabel}`, 14, 23);
    doc.text(`Month: ${monthFilter || 'All Months'}   Year: ${yearFilter || 'All Years'}   Rate: Bike Rs. ${BIKE_KM_RATE}/KM, Car Rs. ${CAR_KM_RATE}/KM`, 14, 29);
    doc.text(`Start Date: ${formatDateObj(dates[0])}   End Date: ${formatDateObj(dates[dates.length - 1])}`, 14, 35);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total KM: ${totalKm}   Amount: Rs. ${totalAmount}`, 14, 41);

    autoTable(doc, {
      head: [isAllReport ? ['Employee', 'Month Name', 'Total KM', 'Amount'] : ['Month Name', 'Total KM', 'Amount']],
      body: summaryRows.map((item) => (
        isAllReport
          ? [item.employeeName, item.monthName, item.totalKm, `Rs. ${item.amount}`]
          : [item.monthName, item.totalKm, `Rs. ${item.amount}`]
      )),
      startY: 48,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [49, 46, 129], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    });

    autoTable(doc, {
      head: [['Date', 'Name', 'Vehicle Type', 'From', 'To', 'Unique Number', 'Total KM', 'Amount']],
      body: reportRows.map((item) => [
        item.date,
        item.employeeName,
        item.vehicleType || '-',
        item.from || '-',
        item.to || '-',
        item.serialNo,
        item.totalRunningKm || 0,
        `Rs. ${item.totalAmount || 0}`,
      ]),
      startY: (doc.lastAutoTable?.finalY || 48) + 8,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [6, 182, 212], textColor: 20 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`ta_da_fms_${isAllReport ? 'all' : sanitizeFileName(employeeFilter)}_${sanitizeFileName(monthFilter)}_${sanitizeFileName(yearFilter)}.pdf`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setEmployeeFilter('');
    setVehicleFilter('');
    setMonthFilter('');
    setYearFilter('');
  };

  return (
    <div className="space-y-5">
      <div className="relative z-[60] overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500" />
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Outstation FMS</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">TA & DA</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              FMS sheet se travel, allowance aur proof URL data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchTaDaData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {activeTab === 'fms' ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDownloadMenuOpen((open) => !open)}
                  disabled={filteredRows.length === 0 && visitRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={17} />
                  Download Report
                  <ChevronDown size={16} />
                </button>

                {downloadMenuOpen && (
                  <div className="absolute right-0 z-[70] mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        downloadExcel();
                      }}
                      disabled={filteredRows.length === 0}
                      className="block w-full px-4 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Full Data Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        downloadVehicleCount();
                      }}
                      disabled={filteredRows.length === 0}
                      className="block w-full px-4 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Vehicle Count (Bus/Car) Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        downloadFmsKmPdf('individual');
                      }}
                      className="block w-full px-4 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Individual KM PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        downloadFmsKmPdf('all');
                      }}
                      className="block w-full px-4 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      All Employees KM PDF
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={downloadExcel}
                disabled={filteredRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={17} />
                Download Excel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-700">Records</p>
            <FileText size={18} className="text-indigo-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-indigo-950">{summary.records}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              {activeTab === 'advance' ? 'Approved' : 'Running KM'}
            </p>
            <Route size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-950">
            {activeTab === 'advance' ? summary.approved : Math.round(summary.totalKm)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Amount</p>
            <Wallet size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-950">Rs. {Math.round(summary.totalAmount)}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">
              {activeTab === 'advance' ? 'Pending' : 'Stay Days'}
            </p>
            <CalendarDays size={18} className="text-sky-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-sky-950">
            {activeTab === 'advance' ? summary.pending : summary.stayDays}
          </p>
        </div>
      </div>

      <div className="relative z-30 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700">
              <Filter size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide text-slate-800">Filters</h2>
              <p className="text-xs font-semibold text-slate-400">Employee, month, year aur route search</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
          >
            Clear filters
          </button>
        </div>

        <div className={`grid gap-3 ${activeTab === 'fms' ? 'lg:grid-cols-[1.4fr_1fr_0.9fr_0.75fr_0.65fr]' : 'lg:grid-cols-[1.5fr_1fr_0.75fr_0.65fr]'}`}>
          <label className="relative block">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by employee, route, date, vehicle..."
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
            />
          </label>

          <SearchableSelect
            icon={User}
            value={employeeFilter}
            onChange={setEmployeeFilter}
            options={employeeOptions}
            allLabel="All Employees"
            placeholder="Search employee..."
          />

          {activeTab === 'fms' && (
            <SearchableSelect
              icon={Car}
              value={vehicleFilter}
              onChange={setVehicleFilter}
              options={vehicleOptions}
              allLabel="All Vehicles"
              placeholder="Search vehicle..."
            />
          )}

          <SearchableSelect
            icon={CalendarDays}
            value={monthFilter}
            onChange={setMonthFilter}
            options={monthOptions}
            allLabel="All Months"
            placeholder="Search month..."
          />

          <SearchableSelect
            icon={CalendarDays}
            value={yearFilter}
            onChange={setYearFilter}
            options={yearOptions}
            allLabel="All Years"
            placeholder="Search year..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('fms')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${activeTab === 'fms' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <Car size={16} />
              FMS Travel IN/OUT
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('travelling')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${activeTab === 'travelling' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <FileText size={16} />
              TA/DA Bills
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advance')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${activeTab === 'advance' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <Wallet size={16} />
              Advance
            </button>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-slate-500">{filteredRows.length} records shown</p>
            {activeTab === 'advance' && (
              <button
                type="button"
                onClick={() => setShowAdvanceModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 cursor-pointer"
              >
                <Plus size={15} />
                New Advance Request
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-sm font-bold text-slate-500">Loading TA/DA data...</p>
          </div>
        ) : error ? (
          <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="text-sm font-bold text-rose-700">Error: {error}</p>
            <button
              type="button"
              onClick={fetchTaDaData}
              className="mt-3 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            {activeTab === 'advance' ? (
              <table className="min-w-[1380px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-black">Start / End</th>
                    <th className="px-4 py-3 font-black">Employee</th>
                    <th className="px-4 py-3 font-black">Route</th>
                    <th className="px-4 py-3 font-black">Travel Type</th>
                    <th className="px-4 py-3 font-black">Advance</th>
                    <th className="px-4 py-3 font-black">Company</th>
                    <th className="px-4 py-3 font-black">Status</th>
                    <th className="px-4 py-3 font-black">Planned / Actual</th>
                    <th className="px-4 py-3 font-black">Approved By</th>
                    <th className="px-4 py-3 font-black">Remarks</th>
                    <th className="px-4 py-3 font-black text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="px-4 py-12 text-center text-sm font-semibold text-slate-400">
                        No advance records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{item.startDate || item.date}</p>
                          <p className="text-xs font-semibold text-slate-400">{item.endDate || '-'} - {item.serialNo}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.employeeName}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700">{item.from || '-'}</p>
                          <p className="text-xs font-semibold text-slate-400">to {item.to || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {item.vehicleType || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black text-slate-900">Rs. {item.advanceAmount || 0}</td>
                        <td className="px-4 py-3 font-medium text-slate-600 max-w-[190px] truncate" title={item.companyName || ''}>
                          {item.companyName || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getStatusClass(item.status)}`}>
                            {item.status || 'Pending'}
                          </span>
                          {item.delay ? <p className="mt-1 text-xs font-semibold text-slate-400">Delay: {item.delay}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700">{item.plannedDate || '-'}</p>
                          <p className="text-xs font-semibold text-slate-400">Actual: {item.actualDate || '-'}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{item.approvedBy || '-'}</td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <p className="truncate font-medium text-slate-600" title={item.remarks || ''}>{item.remarks || '-'}</p>
                          {item.remarks1 ? (
                            <p className="mt-1 truncate text-xs font-semibold text-slate-400" title={item.remarks1}>{item.remarks1}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenAdvanceAction(item, 'Approved')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                String(item.status).toLowerCase().includes('approved')
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 shadow-2xs'
                              }`}
                              title="Approve Advance Request"
                            >
                              <Check size={12} strokeWidth={2.5} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAdvanceAction(item, 'Rejected')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                String(item.status).toLowerCase().includes('rejected')
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 shadow-2xs'
                              }`}
                              title="Reject Advance Request"
                            >
                              <X size={12} strokeWidth={2.5} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-black">Date</th>
                    <th className="px-4 py-3 font-black">Employee</th>
                    <th className="px-4 py-3 font-black">From</th>
                    <th className="px-4 py-3 font-black">To</th>
                    <th className="px-4 py-3 font-black">Vehicle</th>
                    <th className="px-4 py-3 font-black">KM/Stay</th>
                    <th className="px-4 py-3 font-black">Amount</th>
                    <th className="px-4 py-3 font-black">Proof URLs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-sm font-semibold text-slate-400">
                        No TA/DA records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{item.date}</p>
                          <p className="text-xs font-semibold text-slate-400">{item.serialNo}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.employeeName}</td>
                        <td className="px-4 py-3 font-medium text-slate-600">{item.from || '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-600">{item.to || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {item.vehicleType || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {activeTab === 'fms' ? `${item.totalRunningKm || 0} KM` : `${item.stayDay || 0} day`}
                        </td>
                        <td className="px-4 py-3 font-black text-slate-900">Rs. {item.totalAmount || 0}</td>
                        <td className="px-4 py-3">
                          {item.proofLinks.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {item.proofLinks.map((link) => (
                                <ProofLink key={`${item.id}-${link.label}`} url={link.url} label={link.label} />
                              ))}
                            </div>
                          ) : (
                            <ProofLink />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Ultra-Low Egress Pagination Bar */}
            {filteredRows.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs">
                {/* Left: Entries info & Rows per page */}
                <div className="flex flex-wrap items-center gap-3 text-slate-600">
                  <span className="font-semibold">
                    Showing <strong className="text-slate-900">{totalRecords === 0 ? 0 : startIndex + 1}</strong> to{' '}
                    <strong className="text-slate-900">{endIndex}</strong> of{' '}
                    <strong className="text-slate-900">{totalRecords}</strong> entries
                  </span>
                  <div className="flex items-center gap-1.5 pl-3 border-l border-slate-300">
                    <span className="font-medium text-slate-500">Rows:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-800 outline-none focus:border-navy cursor-pointer"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Right: Page Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                    title="First page"
                  >
                    <ChevronsLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {pageNumbers.map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold">...</span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`h-8 min-w-[32px] px-2 rounded-lg font-bold transition text-xs cursor-pointer ${
                            currentPage === p
                              ? 'bg-navy text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                    title="Last page"
                  >
                    <ChevronsRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advance Request Modal */}
      {showAdvanceModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/75 p-2 sm:p-4 md:p-6 pt-3 sm:pt-5 md:pt-6 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200/80 animate-in fade-in-50 zoom-in-95 duration-150">
              <AdvanceRequest
                isModal
                onClose={() => {
                  setShowAdvanceModal(false);
                  fetchTaDaData();
                }}
              />
            </div>
          </div>,
          document.body
        )
      }

      {/* Advance Approve / Reject Confirmation Modal */}
      {advanceActionModal.open &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in-50 duration-150">
            <div className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white ${
                      advanceActionModal.type === 'Approved' ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {advanceActionModal.type === 'Approved' ? <Check size={18} /> : <X size={18} />}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {advanceActionModal.type === 'Approved'
                        ? 'Approve Advance Request'
                        : 'Reject Advance Request'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      WhatsApp confirmation will be sent to 9201958125, 9321691120 & employee
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAdvanceActionModal({ open: false, item: null, type: 'Approved', remarks: '', saving: false })
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {advanceActionModal.item && (
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Person Name:</span>
                    <span className="font-extrabold text-slate-900">{advanceActionModal.item.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Advance Amount:</span>
                    <span className="font-black text-emerald-700">Rs. {advanceActionModal.item.advanceAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Route:</span>
                    <span className="font-semibold text-slate-700">
                      {advanceActionModal.item.from} ➡️ {advanceActionModal.item.to}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Travel Type:</span>
                    <span className="font-semibold text-slate-700">{advanceActionModal.item.vehicleType || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Dates:</span>
                    <span className="font-semibold text-slate-700">
                      {advanceActionModal.item.startDate} to {advanceActionModal.item.endDate}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Comments
                </label>
                <textarea
                  rows={2}
                  value={advanceActionModal.remarks}
                  onChange={(e) =>
                    setAdvanceActionModal((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  placeholder={
                    advanceActionModal.type === 'Approved'
                      ? 'Approved for travel advance'
                      : 'Reason for rejecting this advance request'
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setAdvanceActionModal({ open: false, item: null, type: 'Approved', remarks: '', saving: false })
                  }
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={advanceActionModal.saving}
                  onClick={handleConfirmAdvanceAction}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60 ${
                    advanceActionModal.type === 'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {advanceActionModal.saving && <RefreshCw size={13} className="animate-spin" />}
                  <span>
                    {advanceActionModal.type === 'Approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TaDa;
