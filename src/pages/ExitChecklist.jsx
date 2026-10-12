import React, { useEffect, useMemo, useState } from "react";
import {
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  Package,
  User,
  ChevronDown,
  X,
  Sparkles,
  ShieldCheck,
  Eye,
  FileText,
  Calendar,
  Building2,
  CreditCard,
  Mail,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabaseClient";

const normalize = (value) => String(value || "").trim().toLowerCase();

const formatDate = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  if (raw.includes("T")) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
    }
  }
  return raw;
};

const splitHandover = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const ExitChecklist = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [handoverFilter, setHandoverFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "done" | "pending"
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from("leaving_fms")
        .select("*")
        .order("id", { ascending: false });

      if (sbError) throw sbError;

      const parsed = (data || []).map((row) => {
        const handoverItems = splitHandover(row.ex3_exit_checklist || row.exit_checklist);
        const isDone =
          String(row.ex4_status || "").trim().toLowerCase() === "done" ||
          String(row.ex3_status || "").trim().toLowerCase() === "done" ||
          String(row.leaving || "").trim().toLowerCase() === "yes";

        return {
          id: String(row.employee_id || `EX-${row.id}`).trim(),
          dbId: row.id,
          name: String(row.candidate_name || "").trim(),
          designation: String(row.designation || "").trim(),
          mobile: String(row.mobile_no || "").trim(),
          lastWorkingDay: formatDate(row.last_working_day),
          reason: String(row.reason_for_resignation || "").trim(),
          salary: String(row.salary || "").trim(),
          handover: handoverItems,
          status: isDone ? "Done" : "Pending",
          rawStatus: row.ex4_status || row.ex3_status || "Pending",
          // Extra Details for Modal
          personalEmail: row.personal_email_id || "",
          aadharNo: row.aadhar_card_no || "",
          bankAcNo: row.current_bank_ac_no || "",
          ifscCode: row.ifsc_code || "",
          branchName: row.branch_name || "",
          ex1Planned: row.ex1_planned || "",
          ex1Actual: row.ex1_actual || "",
          ex1Status: row.ex1_status || "",
          ex2Planned: row.ex2_planned || "",
          ex2Actual: row.ex2_actual || "",
          ex2Status: row.ex2_status || "",
          ex3Planned: row.ex3_planned || "",
          ex3Actual: row.ex3_actual || "",
          ex3Status: row.ex3_status || "",
          ex4Planned: row.ex4_planned || "",
          ex4Actual: row.ex4_actual || "",
          ex4Status: row.ex4_status || "",
          passbookPhoto: row.photo_of_front_bank_passbook || "",
          resumeUpload: row.resume_cv_upload || "",
          raw: row,
        };
      });

      setRows(parsed);
    } catch (err) {
      console.error("Exit checklist fetch error:", err);
      setError(err.message);
      toast.error(`Fetch error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const employeeOptions = useMemo(
    () => [...new Set(rows.map((r) => r.name).filter(Boolean))].sort(),
    [rows]
  );

  const handoverOptions = useMemo(
    () => [...new Set(rows.flatMap((r) => r.handover).filter(Boolean))].sort(),
    [rows]
  );

  // Metrics
  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r) => r.status === "Done").length;
    const pending = total - done;
    const totalHandoverItems = rows.reduce((acc, r) => acc + r.handover.length, 0);
    return { total, done, pending, totalHandoverItems };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const search = normalize(searchTerm);
    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        [row.name, row.id, row.designation, row.mobile, row.reason, row.handover.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesEmployee = !employeeFilter || row.name === employeeFilter;
      const matchesHandover = !handoverFilter || row.handover.includes(handoverFilter);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "done" && row.status === "Done") ||
        (statusFilter === "pending" && row.status === "Pending");

      return matchesSearch && matchesEmployee && matchesHandover && matchesStatus;
    });
  }, [rows, searchTerm, employeeFilter, handoverFilter, statusFilter]);

  const StatusBadge = ({ status }) => {
    const isCompleted = status === "Done";
    return isCompleted ? (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 shadow-2xs">
        <CheckCircle2 size={13} className="text-emerald-600" /> Done
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800 shadow-2xs">
        <Clock size={13} className="text-amber-600 animate-pulse" /> Pending
      </span>
    );
  };

  const HandoverChips = ({ items }) => {
    if (!items.length) return <span className="text-slate-400 italic text-xs">No items recorded</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => {
          const isCallForward = item.toLowerCase().includes("call forward");
          const isSim = item.toLowerCase().includes("sim");
          const isDevice = /laptop|mobile|computer/i.test(item);

          return (
            <span
              key={`${item}-${idx}`}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold shadow-2xs transition hover:scale-[1.02] ${
                isCallForward
                  ? "border-sky-200 bg-sky-50 text-sky-800"
                  : isSim
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : isDevice
                  ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                  : "border-teal-200 bg-teal-50/80 text-teal-800"
              }`}
            >
              <Package size={11} className="shrink-0 text-teal-600" />
              <span>{item}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1550px] space-y-5 p-4 sm:p-6 page-content animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner backdrop-blur-md border border-white/20">
              <LogOut size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-100 bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1">
                  <ShieldCheck size={12} /> Supabase Live
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  Asset Custody & Handover
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-white">
                Exit Checklist
              </h1>
              <p className="mt-0.5 text-xs font-medium text-teal-100">
                {rows.length} total employee exit records • Company asset returns & clearance status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Exits</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <User size={20} />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Handover Completed</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{stats.done}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Clearance</div>
            <div className="text-2xl font-black text-amber-800 mt-1">{stats.pending}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock size={20} />
          </div>
        </div>

        <div className="rounded-2xl border border-teal-200/90 bg-teal-50/50 p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Total Items Handed</div>
            <div className="text-2xl font-black text-teal-800 mt-1">{stats.totalHandoverItems}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
            <Package size={20} />
          </div>
        </div>
      </div>

      {/* 3. Search + Filters Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Box */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, designation, reason..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Employee Filter */}
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">All Employees ({employeeOptions.length})</option>
              {employeeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Handover Item Filter */}
          <div className="relative">
            <Package size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={handoverFilter}
              onChange={(e) => setHandoverFilter(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">All Handover Items ({handoverOptions.length})</option>
              {handoverOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Status Quick Pill Filter */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            {[
              ["all", "All"],
              ["done", "Done"],
              ["pending", "Pending"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setStatusFilter(val)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                  statusFilter === val
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Table / Content Area */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw size={28} className="animate-spin text-teal-600" />
            <span className="text-xs font-bold text-slate-600">Loading exit checklist records from Supabase...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-16 gap-3">
            <AlertCircle size={32} className="text-rose-600" />
            <p className="text-xs font-bold text-rose-700">Error loading data: {error}</p>
            <button
              onClick={fetchData}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-teal-700 cursor-pointer shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
              <LogOut size={22} />
            </div>
            <p className="text-sm font-bold text-slate-700">No exit records match your filter</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or dropdown filter.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-3.5 md:hidden">
              {filteredRows.map((row) => (
                <div
                  key={`m-${row.dbId}-${row.id}`}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3 hover:border-teal-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {getInitials(row.name)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900">{row.name}</h3>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {row.designation || "-"} • <span className="font-mono text-teal-700">{row.id}</span>
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Last Working Day</span>
                      <span className="font-bold text-slate-800">{row.lastWorkingDay}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Mobile</span>
                      <span className="font-semibold text-slate-700">{row.mobile || "-"}</span>
                    </div>
                    {row.reason && (
                      <div className="col-span-2 mt-1">
                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Reason</span>
                        <span className="text-slate-700">{row.reason}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <Package size={11} /> Handover Of Assets ({row.handover.length})
                    </div>
                    <HandoverChips items={row.handover} />
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(row)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 py-1 px-2.5 rounded-lg hover:bg-teal-50 cursor-pointer"
                    >
                      <Eye size={13} /> View Full Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-slate-200 border-b border-slate-800 text-[11px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-950 px-4 py-3.5 shadow-xs border-r border-slate-800 min-w-[200px]">Employee</th>
                    <th className="px-4 py-3.5">Employee ID</th>
                    <th className="px-4 py-3.5">Designation</th>
                    <th className="px-4 py-3.5">Mobile</th>
                    <th className="px-4 py-3.5">Last Working Day</th>
                    <th className="px-4 py-3.5">Reason For Resignation</th>
                    <th className="px-4 py-3.5">Handover Of Assets</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((row) => (
                    <tr
                      key={`${row.dbId}-${row.id}`}
                      className="align-top transition hover:bg-teal-50/30 group"
                    >
                      {/* Employee Name + Avatar (Sticky Left so it never cuts off) */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-teal-50/90 px-4 py-3.5 font-bold text-slate-900 shadow-xs border-r border-slate-100 min-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {getInitials(row.name)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 group-hover:text-teal-800 transition">
                              {row.name}
                            </div>
                            {row.salary && (
                              <div className="text-[10px] text-slate-400 font-semibold">
                                Salary: ₹{row.salary}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                          {row.id}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-slate-700">
                        {row.designation || "-"}
                      </td>

                      {/* Mobile */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-600 font-mono">
                        {row.mobile ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" /> {row.mobile}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Last Working Day */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-700">
                        <div className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg">
                          <Calendar size={12} className="text-teal-600" />
                          <span>{row.lastWorkingDay}</span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="max-w-[200px] px-4 py-3.5 text-slate-600 text-xs">
                        {row.reason || "-"}
                      </td>

                      {/* Handover Of Assets */}
                      <td className="max-w-[320px] px-4 py-3.5">
                        <HandoverChips items={row.handover} />
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-center">
                        <StatusBadge status={row.status} />
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(row)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-600 text-teal-800 hover:text-white border border-teal-200 px-3 py-1.5 text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="View Complete Exit Details"
                        >
                          <Eye size={14} /> <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 5. Complete Details Modal */}
      {selectedRecord && (() => {
        const r = selectedRecord.raw || {};
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 pb-20 backdrop-blur-xs sm:pb-4 animate-fadeIn">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 px-6 py-5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-black text-sm shadow-inner">
                    {getInitials(selectedRecord.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md font-mono">
                        {selectedRecord.id}
                      </span>
                      <StatusBadge status={selectedRecord.status} />
                    </div>
                    <h2 className="text-lg font-black text-white mt-0.5 tracking-tight">{selectedRecord.name}</h2>
                    <p className="text-xs text-slate-300">{selectedRecord.designation || "Employee Exit Record"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 border border-slate-700/80 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body with All Details */}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 text-xs custom-scrollbar">
                {/* 1. Overview Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Last Working Day</span>
                    <span className="font-extrabold text-sm text-slate-800 font-mono mt-0.5 block">{selectedRecord.lastWorkingDay}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Salary</span>
                    <span className="font-extrabold text-sm text-slate-800 mt-0.5 block">
                      {selectedRecord.salary ? `₹${selectedRecord.salary}` : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Mobile Number</span>
                    <span className="font-extrabold text-sm text-slate-800 font-mono mt-0.5 block">{selectedRecord.mobile || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Clearance Status</span>
                    <span className="mt-1 block">
                      <StatusBadge status={selectedRecord.status} />
                    </span>
                  </div>
                </div>

                {/* 2. Handover Of Assets & Checklist */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Package size={14} className="text-teal-600" /> Handover Assets & Exit Checklist
                  </div>
                  <div className="p-4 bg-teal-50/40 border border-teal-200/80 rounded-2xl">
                    <HandoverChips items={selectedRecord.handover} />
                  </div>
                </div>

                {/* 3. Exit FMS Process Stages (EX-1 to EX-4) */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-teal-600" /> Exit FMS Process Milestones
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* EX-1 */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">EX-1: Resignation Letter</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          String(r.ex1_status).toLowerCase() === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.ex1_status || "Pending"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 pt-1 border-t border-slate-100">
                        <div>Planned: <span className="font-mono font-bold text-slate-800">{r.ex1_planned || "-"}</span></div>
                        <div>Actual: <span className="font-mono font-bold text-slate-800">{r.ex1_actual || "-"}</span></div>
                        {r.ex1_time_delay && <div className="col-span-2 text-rose-600">Delay: {r.ex1_time_delay}</div>}
                      </div>
                    </div>

                    {/* EX-2 */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">EX-2: Approval</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          String(r.ex2_status).toLowerCase() === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.ex2_status || "Pending"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 pt-1 border-t border-slate-100">
                        <div>Planned: <span className="font-mono font-bold text-slate-800">{r.ex2_planned || "-"}</span></div>
                        <div>Actual: <span className="font-mono font-bold text-slate-800">{r.ex2_actual || "-"}</span></div>
                        {r.ex2_time_delay && <div className="col-span-2 text-rose-600">Delay: {r.ex2_time_delay}</div>}
                      </div>
                    </div>

                    {/* EX-3 */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">EX-3: Handover Of Assets</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          String(r.ex3_status).toLowerCase() === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.ex3_status || "Pending"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 pt-1 border-t border-slate-100">
                        <div>Planned: <span className="font-mono font-bold text-slate-800">{r.ex3_planned || "-"}</span></div>
                        <div>Actual: <span className="font-mono font-bold text-slate-800">{r.ex3_actual || "-"}</span></div>
                        {r.ex3_time_delay && <div className="col-span-2 text-rose-600">Delay: {r.ex3_time_delay}</div>}
                      </div>
                    </div>

                    {/* EX-4 */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">EX-4: Director Feedback</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          String(r.ex4_status).toLowerCase() === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.ex4_status || "Pending"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 pt-1 border-t border-slate-100">
                        <div>Planned: <span className="font-mono font-bold text-slate-800">{r.ex4_planned || "-"}</span></div>
                        <div>Actual: <span className="font-mono font-bold text-slate-800">{r.ex4_actual || "-"}</span></div>
                        {r.ex4_time_delay && <div className="col-span-2 text-rose-600">Delay: {r.ex4_time_delay}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Complete Personal & Family Information */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <User size={14} className="text-teal-600" /> Employee & Family Information
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Personal Email</span>
                      <span className="font-semibold text-slate-800">{r.personal_email_id || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Family Mobile No</span>
                      <span className="font-mono font-semibold text-slate-800">{r.family_mobile_no || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Relationship</span>
                      <span className="font-semibold text-slate-800">{r.relationship_with_family_person || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Aadhar Card No</span>
                      <span className="font-mono font-semibold text-slate-800">{r.aadhar_card_no || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Highest Qualification</span>
                      <span className="font-semibold text-slate-800">{r.highest_qualification || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">ESIC No</span>
                      <span className="font-mono font-semibold text-slate-800">{r.esic_no || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Past PF ID No</span>
                      <span className="font-mono font-semibold text-slate-800">{r.past_pf_id_no || "-"}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Reason for Resignation</span>
                      <span className="font-bold text-slate-800">{r.reason_for_resignation || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Bank Account & Settlement Information */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Building2 size={14} className="text-teal-600" /> Banking & Settlement Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Current Bank A/C No</span>
                      <span className="font-mono font-extrabold text-slate-900">{r.current_bank_ac_no || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">IFSC Code</span>
                      <span className="font-mono font-extrabold text-slate-900">{r.ifsc_code || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Branch Name</span>
                      <span className="font-semibold text-slate-800">{r.branch_name || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* 6. Documents & Uploads */}
                {(r.photo_of_front_bank_passbook || r.qualification_photo || r.salary_slip || r.resume_cv_upload) && (
                  <div className="space-y-2">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileText size={14} className="text-teal-600" /> Attached Documents & Photos
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px]">
                      {r.photo_of_front_bank_passbook && (
                        <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-700">Bank Passbook Photo</span>
                          <a href={r.photo_of_front_bank_passbook} target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline">View</a>
                        </div>
                      )}
                      {r.qualification_photo && (
                        <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-700">Qualification Photo</span>
                          <a href={r.qualification_photo} target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline">View</a>
                        </div>
                      )}
                      {r.salary_slip && (
                        <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-700">Salary Slip</span>
                          <a href={r.salary_slip} target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline">View</a>
                        </div>
                      )}
                      {r.resume_cv_upload && (
                        <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-700">Resume / CV</span>
                          <a href={r.resume_cv_upload} target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline">View</a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-xs active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ExitChecklist;
