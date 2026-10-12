import React, { useEffect, useMemo, useState } from "react";
import {
  Edit, LocateFixed, Plus, RefreshCw, Save, Search, Trash2,
  UserCog, X, LayoutList, LayoutGrid, MapPin, Compass, Shield, User,
  Globe, AlertCircle, AlertTriangle, CheckCircle2, Lock
} from "lucide-react";
import toast from "react-hot-toast";

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const OUTSTATION_SPREADSHEET_ID = "1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw";
const MASTER_SHEET_NAME = "Master";
const MASTER_HEADERS = [
  "Person Name",
  "User Name",
  "Password",
  "admin",
  "Access",
  "Employee Type",
  "latitude",
  "longitude",
  "Range",
  "Deployment Link",
];

const emptyForm = {
  personName: "",
  userName: "",
  password: "",
  role: "User",
  access: "all",
  employeeType: "In Office",
  latitude: "",
  longitude: "",
  range: "100",
  deploymentLink: "",
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAvatarGradient = (name) => {
  const gradients = [
    "from-teal-500 to-emerald-600",
    "from-indigo-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-violet-500 to-fuchsia-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600"
  ];
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return gradients[hash % gradients.length];
};

const parseGoogleSheetTable = (text, sheetLabel = "sheet") => {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`Invalid ${sheetLabel} response`);
  }

  const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  if (payload.status && payload.status !== "ok") {
    throw new Error(payload.errors?.[0]?.detailed_message || `Failed to read ${sheetLabel}`);
  }

  return (payload.table?.rows || []).map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return "";
      return cell.f ?? cell.v ?? "";
    })
  );
};

const fetchMasterRows = async () => {
  const url = `https://docs.google.com/spreadsheets/d/${OUTSTATION_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(MASTER_SHEET_NAME)}&range=A1:J1000&headers=1&cb=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Master sheet HTTP error! status: ${response.status}`);
  const rows = parseGoogleSheetTable(await response.text(), MASTER_SHEET_NAME);

  return rows
    .map((row, index) => ({
      rowIndex: index + 2,
      personName: row[0] || "",
      userName: row[1] || "",
      password: row[2] || "",
      role: row[3] || "",
      access: row[4] || "",
      employeeType: row[5] || "",
      latitude: row[6] || "",
      longitude: row[7] || "",
      range: row[8] || "",
      deploymentLink: row[9] || "",
      raw: row,
    }))
    .filter((row) => {
      const name = String(row.personName || "").trim().toLowerCase();
      return name && name !== "person name";
    });
};

const formToRow = (form, existingRaw = []) => {
  const row = [...existingRaw];
  while (row.length < MASTER_HEADERS.length) row.push("");

  row[0] = form.personName;
  row[1] = form.userName;
  row[2] = form.password;
  row[3] = form.role;
  row[4] = form.access;
  row[5] = form.employeeType;
  row[6] = form.latitude;
  row[7] = form.longitude;
  row[8] = form.range;
  row[9] = form.deploymentLink;
  return row;
};

const optimisticUpdate = (rows, action) => {
  if (action.type === "insert") {
    return [
      ...rows,
      {
        rowIndex: rows.length ? Math.max(...rows.map((r) => r.rowIndex)) + 1 : 2,
        personName: action.rowData[0] || "",
        userName: action.rowData[1] || "",
        password: action.rowData[2] || "",
        role: action.rowData[3] || "",
        access: action.rowData[4] || "",
        employeeType: action.rowData[5] || "",
        latitude: action.rowData[6] || "",
        longitude: action.rowData[7] || "",
        range: action.rowData[8] || "",
        deploymentLink: action.rowData[9] || "",
        raw: action.rowData,
      },
    ];
  }

  if (action.type === "update") {
    return rows.map((r) =>
      r.rowIndex === action.rowIndex
        ? {
            ...r,
            personName: action.rowData[0] || "",
            userName: action.rowData[1] || "",
            password: action.rowData[2] || "",
            role: action.rowData[3] || "",
            access: action.rowData[4] || "",
            employeeType: action.rowData[5] || "",
            latitude: action.rowData[6] || "",
            longitude: action.rowData[7] || "",
            range: action.rowData[8] || "",
            deploymentLink: action.rowData[9] || "",
            raw: action.rowData,
          }
        : r
    );
  }

  if (action.type === "delete") {
    return rows.filter((r) => r.rowIndex !== action.rowIndex);
  }

  return rows;
};

const postMasterAction = async (payload, verification) => {
  if (!OUTSTATION_SCRIPT_URL) {
    throw new Error("VITE_OUTSTATION_SHEET_URL configure nahi hai");
  }

  try {
    await fetch(OUTSTATION_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams({
        sheetName: MASTER_SHEET_NAME,
        ...payload,
      }),
    });
  } catch (error) {
    console.warn("Fetch with no-cors failed or network error:", error);
  }

  const updatedRows = optimisticUpdate(verification.beforeRows, verification);
  return { success: true, rows: updatedRows };
};

const OutstationMaster = () => {
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all', 'In Office', 'Out Off Office'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(emptyForm);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'

  const fetchRows = async () => {
    setLoading(true);
    try {
      const data = await fetchMasterRows();
      setRows(data);
    } catch (error) {
      console.error("Master fetch error:", error);
      toast.error(error.message || "Master data fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !search || [
        row.personName,
        row.userName,
        row.role,
        row.access,
        row.employeeType,
        row.latitude,
        row.longitude,
      ].join(" ").toLowerCase().includes(search);

      const matchesType = typeFilter === "all" || 
        (typeFilter === "In Office" && String(row.employeeType).toLowerCase().includes("in")) ||
        (typeFilter === "Out Off Office" && String(row.employeeType).toLowerCase().includes("out"));

      return matchesSearch && matchesType;
    });
  }, [rows, searchTerm, typeFilter]);

  const openAddModal = () => {
    setMode("add");
    setEditingRow(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setMode("edit");
    setEditingRow(row);
    setForm({
      personName: row.personName || "",
      userName: row.userName || "",
      password: row.password || "",
      role: row.role || "User",
      access: row.access || "all",
      employeeType: row.employeeType || "In Office",
      latitude: row.latitude || "",
      longitude: row.longitude || "",
      range: row.range || "100",
      deploymentLink: row.deploymentLink || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRow(null);
    setForm(emptyForm);
  };

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser location not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: Number(position.coords.latitude.toFixed(7)).toString(),
          longitude: Number(position.coords.longitude.toFixed(7)).toString(),
          range: prev.range || "100",
        }));
        toast.success("Location coordinates fetched!");
      },
      (error) => {
        toast.error(error.message || "Location permission failed");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!form.personName.trim() || !form.userName.trim() || !form.password.trim()) {
        throw new Error("Person Name, User Name and Password are required");
      }

      const rowData = formToRow(form, editingRow?.raw || []);
      const result = await postMasterAction(
        {
          action: mode === "add" ? "insert" : "update",
          ...(mode === "edit" ? { rowIndex: String(editingRow.rowIndex) } : {}),
          rowData: JSON.stringify(rowData),
        },
        {
          type: mode === "add" ? "insert" : "update",
          rowData,
          rowIndex: editingRow?.rowIndex,
          beforeRows: rows,
        }
      );

      toast.success(mode === "add" ? "Master user added" : "Master user updated");
      setRows(result.rows);
      closeModal();
    } catch (error) {
      console.error("Master save error:", error);
      toast.error(error.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setSubmitting(true);

    try {
      const rowData = formToRow(
        {
          personName: deleteRow.personName,
          userName: deleteRow.userName,
          password: deleteRow.password,
          role: deleteRow.role,
          access: deleteRow.access,
          employeeType: deleteRow.employeeType,
          latitude: deleteRow.latitude,
          longitude: deleteRow.longitude,
          range: deleteRow.range,
          deploymentLink: deleteRow.deploymentLink,
        },
        deleteRow.raw || []
      );
      const result = await postMasterAction(
        {
          action: "delete",
          rowIndex: String(deleteRow.rowIndex),
        },
        {
          type: "delete",
          rowData,
          rowIndex: deleteRow.rowIndex,
          beforeRows: rows,
        }
      );
      toast.success("Master record deleted");
      setRows(result.rows);
      setDeleteRow(null);
    } catch (error) {
      console.error("Master delete error:", error);
      toast.error(error.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const inOfficeCount = rows.filter(r => String(r.employeeType).toLowerCase().includes("in")).length;
  const outstationCount = rows.filter(r => String(r.employeeType).toLowerCase().includes("out")).length;

  return (
    <div className="p-3 sm:p-5 space-y-3 bg-[#f8fafc] min-h-screen text-xs antialiased text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation & Action Top Bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-xs shadow-teal-500/20">
              <UserCog size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Outstation Master</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  {rows.length} Configured Users
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Attendance location limits, geofencing & outstation settings</p>
            </div>
          </div>

          {/* Action Buttons & View Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
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

            {/* Sync */}
            <button
              onClick={fetchRows}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? "animate-spin text-teal-600" : "text-slate-500"} />
              <span>{loading ? "Syncing..." : "Sync"}</span>
            </button>

            {/* Add Master User */}
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shadow-teal-600/20 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Master User</span>
            </button>
          </div>
        </div>

        {/* Segmented Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto">
          {[
            { label: 'All Users', value: 'all', count: rows.length, dot: 'bg-slate-500' },
            { label: 'In Office', value: 'In Office', count: inOfficeCount, dot: 'bg-emerald-500' },
            { label: 'Out Off Office', value: 'Out Off Office', count: outstationCount, dot: 'bg-sky-500' },
          ].map((tab) => {
            const isActive = typeFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
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
            <div className="relative w-full sm:max-w-md">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, username, lat-long, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
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
            <div className="text-[11px] text-slate-500">
              Showing <span className="font-bold text-slate-800 font-mono">{filteredRows.length}</span> master records
            </div>
          </div>
        </div>

        {/* VIEW 1: MODERN SAAS DATA TABLE (TALL CONTAINER HEIGHT) */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-slate-500 sticky top-0 z-20 border-b border-slate-200/80 backdrop-blur-xs">
                <tr className="text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">Person Name</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Username</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Password</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Employee Type</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Coordinates (Lat / Lng)</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[90px]">Range</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[90px]">Role</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[90px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-normal">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-semibold text-xs text-slate-600">Loading master records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={24} />
                        <p className="font-bold text-sm text-slate-700">No master records found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const gradient = getAvatarGradient(row.personName);
                    const initials = getInitials(row.personName);
                    const isOutstation = String(row.employeeType).toLowerCase().includes("out");
                    const cleanUsername = (row.userName || '').replace(/^@+/, '');

                    return (
                      <tr 
                        key={`${row.rowIndex}-${row.userName}`} 
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Person Profile */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-[11px] shadow-2xs shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-xs hover:text-teal-700 transition-colors block">
                                {row.personName || "Unnamed"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                Row #{row.rowIndex}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {cleanUsername}
                          </span>
                        </td>

                        {/* Password */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md select-all">
                            {row.password || '-'}
                          </span>
                        </td>

                        {/* Employee Type */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOutstation
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            <Globe size={10} />
                            <span>{row.employeeType || "In Office"}</span>
                          </span>
                        </td>

                        {/* Coordinates */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {row.latitude && row.longitude ? (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg w-fit">
                              <MapPin size={10} className="text-teal-600 shrink-0" />
                              <span>{row.latitude}, {row.longitude}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">No coordinates</span>
                          )}
                        </td>

                        {/* Range */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-700 font-semibold">
                            {row.range ? `${row.range}m` : "100m"}
                          </span>
                        </td>

                        {/* Role */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="text-xs text-slate-600 font-medium capitalize">
                            {row.role || "User"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(row)}
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteRow(row)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* VIEW 2: MODERN SAAS CARDS GRID */
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
            {loading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold text-xs text-slate-600">Loading master cards...</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <AlertCircle size={24} />
                <p className="font-bold text-sm text-slate-700">No master records found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredRows.map((row) => {
                  const gradient = getAvatarGradient(row.personName);
                  const initials = getInitials(row.personName);
                  const isOutstation = String(row.employeeType).toLowerCase().includes("out");
                  const cleanUsername = (row.userName || '').replace(/^@+/, '');

                  return (
                    <div 
                      key={`${row.rowIndex}-${row.userName}`} 
                      className="bg-white rounded-xl border border-slate-200/90 hover:border-teal-300 hover:shadow-sm transition-all p-3.5 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-xs">
                                {row.personName || "Unnamed"}
                              </h3>
                              <span className="text-[11px] font-mono text-slate-500">{cleanUsername}</span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOutstation
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {row.employeeType || "In Office"}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Password:</span>
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 select-all">{row.password || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Coordinates:</span>
                            <span className="font-mono text-[11px] text-slate-700">{row.latitude ? `${row.latitude}, ${row.longitude}` : "Not set"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Range:</span>
                            <span className="font-bold text-slate-800">{row.range || "100"} meters</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteRow(row)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Master Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <UserCog size={14} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  {mode === "add" ? "Add Master User Record" : "Edit Master User Record"}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="grid max-h-[70vh] gap-3.5 overflow-y-auto px-5 py-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Person Name *</label>
                <input
                  name="personName"
                  value={form.personName}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">User Name *</label>
                <input
                  name="userName"
                  value={form.userName}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                <input
                  name="password"
                  value={form.password}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                >
                  <option value="admin">admin</option>
                  <option value="User">User</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Access Level</label>
                <input
                  name="access"
                  value={form.access}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee Type</label>
                <select
                  name="employeeType"
                  value={form.employeeType}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                >
                  <option value="In Office">In Office</option>
                  <option value="Out Off Office">Out Off Office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                <input
                  name="latitude"
                  value={form.latitude}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="e.g. 22.6849747"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                <input
                  name="longitude"
                  value={form.longitude}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="e.g. 88.4671021"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Geofence Range (Meters)</label>
                <input
                  name="range"
                  value={form.range}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deployment URL</label>
                <input
                  name="deploymentLink"
                  value={form.deploymentLink}
                  onChange={updateForm}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="https://..."
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <button
                  type="button"
                  onClick={setCurrentLocation}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-teal-200 bg-teal-50 text-teal-700 rounded-xl text-xs font-bold hover:bg-teal-100 transition cursor-pointer"
                >
                  <LocateFixed size={14} />
                  <span>Fetch & Set Current GPS Coordinates</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button type="button" onClick={closeModal} className="px-4 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-5 py-1.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-xs font-bold shadow-xs disabled:opacity-60 cursor-pointer">
                {submitting ? "Saving..." : "Save Record"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deleteRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Delete Master Record</h2>
            <p className="text-xs text-slate-500">
              Are you sure you want to permanently delete <span className="font-bold text-slate-800">{deleteRow.personName}</span>?
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setDeleteRow(null)} className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={submitting} className="flex-1 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-60">
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutstationMaster;
