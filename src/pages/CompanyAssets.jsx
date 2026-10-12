import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Package,
  Plus,
  Minus,
  X,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  Undo2,
  Loader2,
  ImageIcon,
  Calendar,
  User,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Check,
  Tag,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { getUserRole } from "../utils/authRole";
import { supabase } from "../services/supabaseClient";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const PRESET_PRODUCTS = [
  "Laptop",
  "Mobile Phone",
  "SIM Card",
  "ID Card",
  "Tablet / iPad",
  "Keyboard",
  "Mouse",
  "Headphones",
  "Dongle / Wi-Fi Device",
  "Charger / Adapter",
  "Safety Helmet / Shoes",
  "Uniform / Jacket",
  "Company Diary / Stationery",
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getCurrentUserName = (user = {}) =>
  String(
    user["Employee Name"] ||
      user["Person Name"] ||
      user["Sales Person Name"] ||
      user.Name ||
      user.name ||
      user["User Name"] ||
      user.Username ||
      user.username ||
      ""
  ).trim();

const formatDateTime = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

const toISODate = (timestamp) => {
  const datePart = String(timestamp || "").trim().split(" ")[0];
  const match = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
};

const splitImages = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);

const optimizeImageUrl = (url, size = 400) => {
  if (!url) return url;
  if (url.includes("cloudinary.com")) {
    return url.replace("/upload/", `/upload/w_${size},q_auto,f_auto/`);
  }
  return url;
};

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET || "ml_default");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME || "dhbtn1ecx"}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error("Image upload failed");
  return data.secure_url;
};

const uploadAllImages = async (files = []) => {
  const urls = [];
  for (const file of files) {
    // Sequential upload keeps memory low and order stable on mobile.
    // eslint-disable-next-line no-await-in-loop
    urls.push(await uploadToCloudinary(file));
  }
  return urls;
};

const emptyEntryForm = {
  assetType: "Returnable", // "Returnable" | "Non-Returnable"
  employeeName: "",
  products: [], // Array of { name: string, qty: number }
  customProductInput: "",
  customQty: 1,
  reason: "",
  remark: "",
};

const CompanyAssets = () => {
  const currentUser = useMemo(() => getStoredUser(), []);
  const isAdmin = useMemo(() => getUserRole(currentUser) === "admin", [currentUser]);
  const currentEmployeeName = useMemo(() => getCurrentUserName(currentUser), [currentUser]);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("active"); // "active" (issued) | "history" (returned)
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyEntryForm);
  const [addFiles, setAddFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const addFileRef = useRef(null);

  const [returnEntry, setReturnEntry] = useState(null);
  const [returnRemark, setReturnRemark] = useState("");
  const [returnFiles, setReturnFiles] = useState([]);
  const [returning, setReturning] = useState(false);
  const returnFileRef = useRef(null);

  const [previewImages, setPreviewImages] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchEntries = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      let data = null;
      let sbError = null;

      // Try selecting with asset_type
      const res = await supabase
        .from("company_assets")
        .select("id, timestamp, employee_name, product, reason, remark, image, return_date, return_image, return_remark, asset_type, created_at, updated_at")
        .order("id", { ascending: false });

      if (res.error && res.error.message && res.error.message.includes("asset_type")) {
        // Fallback without asset_type if column is not yet created in Supabase
        const fallbackRes = await supabase
          .from("company_assets")
          .select("id, timestamp, employee_name, product, reason, remark, image, return_date, return_image, return_remark, created_at, updated_at")
          .order("id", { ascending: false });
        data = fallbackRes.data;
        sbError = fallbackRes.error;
      } else {
        data = res.data;
        sbError = res.error;
      }

      if (sbError) throw sbError;

      const parsed = (data || []).map((row) => {
        let derivedType = row.asset_type;
        if (!derivedType) {
          const p = (row.product || "").toLowerCase();
          if (p.includes("sim") || p.includes("id card") || p.includes("stationary") || p.includes("diary") || p.includes("uniform")) {
            derivedType = "Non-Returnable";
          } else {
            derivedType = "Returnable";
          }
        }

        return {
          id: row.id,
          timestamp: row.timestamp || "",
          employeeName: row.employee_name || "",
          product: row.product || "",
          reason: row.reason || "",
          remark: row.remark || "",
          images: row.image || "",
          returnDate: row.return_date || "",
          returnImages: row.return_image || "",
          returnRemark: row.return_remark || "",
          assetType: derivedType,
        };
      });

      setEntries(parsed);
    } catch (err) {
      console.error("Company Assets fetch error:", err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Employees only see their own entries; admin sees everyone's data.
  const scopedEntries = useMemo(
    () =>
      isAdmin
        ? entries
        : entries.filter((item) => normalize(item.employeeName) === normalize(currentEmployeeName)),
    [entries, isAdmin, currentEmployeeName]
  );

  const employeeOptions = useMemo(
    () => [...new Set(scopedEntries.map((e) => e.employeeName).filter(Boolean))].sort(),
    [scopedEntries]
  );

  const filteredEntries = useMemo(() => {
    const search = normalize(searchTerm);
    return scopedEntries.filter((item) => {
      const matchesSearch =
        !search ||
        [item.employeeName, item.product, item.reason, item.remark, item.returnRemark, item.assetType]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesEmployee = !employeeFilter || item.employeeName === employeeFilter;
      const matchesDate = !dateFilter || toISODate(item.timestamp) === dateFilter;
      return matchesSearch && matchesEmployee && matchesDate;
    });
  }, [scopedEntries, searchTerm, employeeFilter, dateFilter]);

  // Active tab = issued (not returned); History tab = returned items.
  const visibleEntries = useMemo(() => {
    const isReturned = (item) => Boolean(String(item.returnDate || "").trim());
    return filteredEntries.filter((e) => (tab === "history" ? isReturned(e) : !isReturned(e)));
  }, [filteredEntries, tab]);

  const resetAddForm = () => {
    setAddForm(emptyEntryForm);
    setAddFiles([]);
    if (addFileRef.current) addFileRef.current.value = "";
  };

  const openAdd = () => {
    setAddForm({
      ...emptyEntryForm,
      employeeName: isAdmin ? "" : currentEmployeeName,
      assetType: "Returnable",
      products: [],
      customProductInput: "",
      customQty: 1,
    });
    setAddFiles([]);
    if (addFileRef.current) addFileRef.current.value = "";
    setAddOpen(true);
  };

  const handleToggleProduct = (prodName) => {
    setAddForm((prev) => {
      const exists = prev.products.some((p) => p.name === prodName);
      if (exists) {
        return { ...prev, products: prev.products.filter((p) => p.name !== prodName) };
      }
      return { ...prev, products: [...prev.products, { name: prodName, qty: 1 }] };
    });
  };

  const handleUpdateProductQty = (prodName, delta) => {
    setAddForm((prev) => ({
      ...prev,
      products: prev.products.map((p) => {
        if (p.name === prodName) {
          const newQty = Math.max(1, (p.qty || 1) + delta);
          return { ...p, qty: newQty };
        }
        return p;
      }),
    }));
  };

  const handleSetProductQty = (prodName, qtyVal) => {
    const parsed = parseInt(qtyVal, 10);
    const newQty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setAddForm((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.name === prodName ? { ...p, qty: newQty } : p)),
    }));
  };

  const handleAddCustomProduct = () => {
    const trimmed = addForm.customProductInput.trim();
    if (!trimmed) return;
    const qty = Math.max(1, parseInt(addForm.customQty, 10) || 1);

    setAddForm((prev) => {
      const existingIndex = prev.products.findIndex(
        (p) => p.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (existingIndex >= 0) {
        const updated = [...prev.products];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + qty,
        };
        return {
          ...prev,
          products: updated,
          customProductInput: "",
          customQty: 1,
        };
      }
      return {
        ...prev,
        products: [...prev.products, { name: trimmed, qty }],
        customProductInput: "",
        customQty: 1,
      };
    });
  };

  const handleRemoveProduct = (prodName) => {
    setAddForm((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.name !== prodName),
    }));
  };

  const handleAddSubmit = async () => {
    if (saving) return;
    if (!addForm.employeeName.trim()) {
      toast.error("Employee Name daalein.");
      return;
    }

    const finalProductsList = [...addForm.products];
    if (addForm.customProductInput.trim()) {
      const trimmed = addForm.customProductInput.trim();
      const qty = Math.max(1, parseInt(addForm.customQty, 10) || 1);
      const existingIndex = finalProductsList.findIndex(
        (p) => p.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (existingIndex >= 0) {
        finalProductsList[existingIndex] = {
          ...finalProductsList[existingIndex],
          qty: finalProductsList[existingIndex].qty + qty,
        };
      } else {
        finalProductsList.push({ name: trimmed, qty });
      }
    }

    if (finalProductsList.length === 0) {
      toast.error("Kam se kam ek product select ya type karein.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Saving asset entry...");
    try {
      const imageUrls = addFiles.length ? await uploadAllImages(addFiles) : [];
      const timestamp = formatDateTime(new Date());

      const formattedProducts = finalProductsList
        .map((item) => (item.qty > 1 ? `${item.name} (Qty: ${item.qty})` : item.name))
        .join(", ");

      const payload = {
        timestamp,
        employee_name: addForm.employeeName.trim(),
        product: formattedProducts,
        reason: addForm.reason.trim(),
        remark: addForm.remark.trim(),
        image: imageUrls.join(", "),
        return_date: "",
        return_image: "",
        return_remark: "",
        asset_type: addForm.assetType,
      };

      let { error: insertErr } = await supabase.from("company_assets").insert([payload]);
      if (insertErr && insertErr.message && insertErr.message.includes("asset_type")) {
        delete payload.asset_type;
        const res2 = await supabase.from("company_assets").insert([payload]);
        insertErr = res2.error;
      }
      if (insertErr) throw insertErr;

      toast.success("Asset entry saved successfully", { id: toastId });
      setAddOpen(false);
      resetAddForm();
      fetchEntries({ silent: true });
    } catch (err) {
      console.error("Company Assets add error:", err);
      toast.error(err.message || "Entry save failed", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const openReturn = (entry) => {
    setReturnEntry(entry);
    setReturnRemark("");
    setReturnFiles([]);
    if (returnFileRef.current) returnFileRef.current.value = "";
  };

  const handleReturnSubmit = async () => {
    if (returning || !returnEntry) return;

    setReturning(true);
    const toastId = toast.loading("Updating return...");
    try {
      const returnImageUrls = returnFiles.length ? await uploadAllImages(returnFiles) : [];
      const returnDate = formatDateTime(new Date());

      const payload = {
        return_date: returnDate,
        return_image: returnImageUrls.join(", "),
        return_remark: returnRemark.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from("company_assets")
        .update(payload)
        .eq("id", returnEntry.id);

      if (updateErr) throw updateErr;

      toast.success("Asset return updated successfully", { id: toastId });
      setReturnEntry(null);
      fetchEntries({ silent: true });
    } catch (err) {
      console.error("Company Assets return error:", err);
      toast.error(err.message || "Return update failed", { id: toastId });
    } finally {
      setReturning(false);
    }
  };

  const ImageThumbs = ({ value }) => {
    const urls = splitImages(value);
    if (!urls.length) return <span className="text-slate-400">-</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            type="button"
            onClick={() => setPreviewImages(urls)}
            className="group relative h-9 w-9 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
          >
            <img
              src={optimizeImageUrl(url, 80)}
              alt="thumb"
              className="h-full w-full object-cover transition group-hover:scale-110"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 page-content animate-fadeIn">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md">
              <Package size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-100 bg-white/20 px-2.5 py-0.5 rounded-full">
                  Inventory & Custody Management
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">Company Assets</h1>
              <p className="mt-0.5 text-xs font-medium text-teal-100">
                {filteredEntries.length} asset records • Returnable and Non-Returnable products issued to employees
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchEntries()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-teal-800 shadow-md transition hover:bg-teal-50 cursor-pointer active:scale-95"
            >
              <Plus size={16} /> Add Asset Entry
            </button>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee, product, reason..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">All Employees</option>
              {employeeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <RefreshCw size={24} className="animate-spin text-teal-600" />
            <span className="text-xs font-bold text-slate-600">Loading company assets...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-16">
            <p className="text-xs font-bold text-rose-600">Error: {error}</p>
            <button
              onClick={() => fetchEntries()}
              className="mt-3 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
              {[
                ["active", "Active Issued"],
                ["history", "Return History"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                    tab === key ? "bg-teal-600 text-white shadow-2xs" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {visibleEntries.length === 0 ? (
              <div className="py-16 text-center text-xs font-semibold text-slate-400">
                {tab === "history" ? "No returned items found in history." : "No active issued assets."}
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="space-y-3 md:hidden">
                  {visibleEntries.map((entry) => {
                    const isReturned = Boolean(String(entry.returnDate || "").trim());
                    const isNonReturnable = entry.assetType === "Non-Returnable";

                    return (
                      <div
                        key={`m-${entry.id}-${entry.timestamp}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{entry.employeeName || "-"}</p>
                            <p className="truncate text-xs font-bold text-teal-700 mt-0.5">{entry.product || "-"}</p>
                          </div>
                          <div>
                            {isNonReturnable ? (
                              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                Non-Returnable
                              </span>
                            ) : isReturned ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 size={11} /> Returned
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Issued
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          <div>Date: {entry.timestamp}</div>
                          {entry.reason && <div>Reason: {entry.reason}</div>}
                        </div>

                        {!isReturned && !isNonReturnable && (
                          <div className="pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => openReturn(entry)}
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700 cursor-pointer"
                            >
                              <Undo2 size={13} /> Mark Return
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table view */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-slate-200 border-b border-slate-800 text-[11px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5">Date</th>
                        <th className="px-4 py-3.5">Employee</th>
                        <th className="px-4 py-3.5">Asset Nature</th>
                        <th className="px-4 py-3.5">Product(s)</th>
                        <th className="px-4 py-3.5">Reason</th>
                        <th className="px-4 py-3.5">Remark</th>
                        <th className="px-4 py-3.5">Images</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Return Date</th>
                        <th className="px-4 py-3.5">Return Images</th>
                        <th className="px-4 py-3.5">Return Remark</th>
                        <th className="px-4 py-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {visibleEntries.map((entry) => {
                        const isReturned = Boolean(String(entry.returnDate || "").trim());
                        const isNonReturnable = entry.assetType === "Non-Returnable";

                        return (
                          <tr key={`${entry.id}-${entry.timestamp}`} className="align-top transition hover:bg-teal-50/30">
                            {/* Date */}
                            <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-slate-700">
                              {entry.timestamp || "-"}
                            </td>

                            {/* Employee */}
                            <td className="whitespace-nowrap px-4 py-3.5 font-bold text-slate-900">
                              {entry.employeeName || "-"}
                            </td>

                            {/* Asset Nature Badge */}
                            <td className="whitespace-nowrap px-4 py-3.5">
                              {isNonReturnable ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                                  Non-Returnable
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-extrabold text-teal-800">
                                  Returnable
                                </span>
                              )}
                            </td>

                            {/* Products */}
                            <td className="px-4 py-3.5 font-bold text-slate-800 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {entry.product.split(",").map((p, i) => (
                                  <span key={i} className="bg-slate-100 border border-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                    {p.trim()}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Reason */}
                            <td className="max-w-[150px] px-4 py-3.5 text-slate-600">{entry.reason || "-"}</td>

                            {/* Remark */}
                            <td className="max-w-[150px] px-4 py-3.5 text-slate-600">{entry.remark || "-"}</td>

                            {/* Images */}
                            <td className="px-4 py-3.5">
                              <ImageThumbs value={entry.images} />
                            </td>

                            {/* Status */}
                            <td className="whitespace-nowrap px-4 py-3.5">
                              {isNonReturnable ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                  Permanent
                                </span>
                              ) : isReturned ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 size={12} /> Returned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                  Issued
                                </span>
                              )}
                            </td>

                            {/* Return Date */}
                            <td className="whitespace-nowrap px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                              {entry.returnDate || "-"}
                            </td>

                            {/* Return Images */}
                            <td className="px-4 py-3.5">
                              <ImageThumbs value={entry.returnImages} />
                            </td>

                            {/* Return Remark */}
                            <td className="max-w-[150px] px-4 py-3.5 text-slate-600">{entry.returnRemark || "-"}</td>

                            {/* Action Button */}
                            <td className="whitespace-nowrap px-4 py-3.5 text-center">
                              {isNonReturnable ? (
                                <span className="text-[11px] font-semibold text-slate-400 italic">No Return Needed</span>
                              ) : isReturned ? (
                                <span className="text-[11px] font-semibold text-slate-400">Completed</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openReturn(entry)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-teal-700 cursor-pointer active:scale-95"
                                >
                                  <Undo2 size={13} /> Mark Return
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Add Entry Modal */}
      {addOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 md:p-6 backdrop-blur-sm animate-fadeIn">
            <div className="flex max-h-[92vh] sm:max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 px-5 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 px-3 py-0.5 rounded-full">
                    <Sparkles size={11} className="text-teal-400" />
                    Asset Issue Record
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white mt-1 tracking-tight">Add Company Asset Entry</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    resetAddForm();
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 border border-slate-700/80 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Body */}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 text-xs custom-scrollbar overscroll-contain">
              {/* 1. Returnable vs Non-Returnable Selection */}
              <div>
                <label className="mb-1.5 block font-bold text-slate-700">
                  Asset Category / Nature *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAddForm((f) => ({ ...f, assetType: "Returnable" }))}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      addForm.assetType === "Returnable"
                        ? "border-teal-500 bg-teal-50/80 text-teal-900 ring-2 ring-teal-500/20 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        addForm.assetType === "Returnable" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <RotateCcw size={16} />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">Returnable</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Laptop, Mobile, Devices</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddForm((f) => ({ ...f, assetType: "Non-Returnable" }))}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      addForm.assetType === "Non-Returnable"
                        ? "border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        addForm.assetType === "Non-Returnable" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Package size={16} />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">Non-Returnable</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">SIM, ID Card, Stationery</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Employee Name */}
              <div>
                <label className="mb-1 block font-bold text-slate-700">Employee Name *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={addForm.employeeName}
                    onChange={(e) => setAddForm((f) => ({ ...f, employeeName: e.target.value }))}
                    readOnly={!isAdmin}
                    className={`h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${
                      isAdmin ? "bg-white" : "bg-slate-100 cursor-not-allowed"
                    }`}
                    placeholder="Employee ka naam"
                  />
                </div>
              </div>

              {/* 3. Products (Multiple Selection & Quantity Support) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Products & Quantity ({addForm.products.length}) *
                  </label>
                  <span className="text-[10px] text-slate-400">Add multiple items with quantity</span>
                </div>

                {/* Selected Product Tags with Quantity Controls */}
                {addForm.products.length > 0 && (
                  <div className="flex flex-col gap-1.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      Selected Items ({addForm.products.reduce((acc, p) => acc + (p.qty || 1), 0)} total units)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {addForm.products.map((item) => (
                        <div
                          key={item.name}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-950 border border-teal-200 rounded-xl font-bold text-xs shadow-2xs animate-fadeIn"
                        >
                          <span className="font-extrabold text-teal-900">{item.name}</span>

                          {/* Quantity Stepper */}
                          <div className="inline-flex items-center bg-white border border-teal-200 rounded-lg overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateProductQty(item.name, -1)}
                              disabled={item.qty <= 1}
                              className="h-6 w-6 flex items-center justify-center hover:bg-teal-100 disabled:opacity-30 text-teal-700 font-bold transition cursor-pointer"
                              title="Decrease Quantity"
                            >
                              <Minus size={11} strokeWidth={3} />
                            </button>
                            <span className="min-w-[24px] text-center text-xs font-black text-teal-900 px-1 select-none">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateProductQty(item.name, 1)}
                              className="h-6 w-6 flex items-center justify-center hover:bg-teal-100 text-teal-700 font-bold transition cursor-pointer"
                              title="Increase Quantity"
                            >
                              <Plus size={11} strokeWidth={3} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(item.name)}
                            className="w-5 h-5 rounded-md hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center text-teal-600 transition-colors cursor-pointer ml-0.5"
                            title="Remove item"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Presets */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Select Presets</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_PRODUCTS.map((prod) => {
                      const selectedItem = addForm.products.find((p) => p.name === prod);
                      const isSelected = Boolean(selectedItem);
                      return (
                        <button
                          key={prod}
                          type="button"
                          onClick={() => handleToggleProduct(prod)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          {isSelected ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
                          <span>{prod}</span>
                          {isSelected && selectedItem.qty > 1 && (
                            <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-md text-[10px] font-black">
                              ×{selectedItem.qty}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Product Adder with Quantity */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Item & Quantity</div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Item Name Input */}
                    <input
                      type="text"
                      value={addForm.customProductInput}
                      onChange={(e) => setAddForm((f) => ({ ...f, customProductInput: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomProduct();
                        }
                      }}
                      placeholder="Type item name (e.g. Pendrive, Stamp, Charger)..."
                      className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quantity Stepper */}
                      <div className="flex items-center h-10 bg-slate-50 border border-slate-200 rounded-xl px-1.5 gap-1 shadow-2xs">
                        <span className="text-[11px] font-extrabold text-slate-500 pl-1 select-none">Qty:</span>
                        <button
                          type="button"
                          onClick={() => setAddForm((f) => ({ ...f, customQty: Math.max(1, (parseInt(f.customQty, 10) || 1) - 1) }))}
                          disabled={addForm.customQty <= 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200/80 disabled:opacity-30 text-slate-700 transition cursor-pointer active:scale-95"
                          title="Kam karein"
                        >
                          <Minus size={13} strokeWidth={2.5} />
                        </button>
                        <span className="w-7 text-center font-black text-xs text-slate-900 select-none">
                          {addForm.customQty || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddForm((f) => ({ ...f, customQty: (parseInt(f.customQty, 10) || 1) + 1 }))}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-teal-100 text-teal-700 transition cursor-pointer active:scale-95"
                          title="Badhayein"
                        >
                          <Plus size={13} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={handleAddCustomProduct}
                        className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Plus size={15} strokeWidth={2.5} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Reason */}
              <div>
                <label className="mb-1 block font-bold text-slate-700">Reason / Purpose</label>
                <input
                  value={addForm.reason}
                  onChange={(e) => setAddForm((f) => ({ ...f, reason: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Kis kaam ke liye diya gaya (e.g. Office work, Plant site visit)"
                />
              </div>

              {/* 5. Remark */}
              <div>
                <label className="mb-1 block font-bold text-slate-700">Condition & Notes</label>
                <textarea
                  value={addForm.remark}
                  onChange={(e) => setAddForm((f) => ({ ...f, remark: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Asset condition, serial numbers, or notes"
                />
              </div>

              {/* 6. Product Images */}
              <div>
                <label className="mb-1 block font-bold text-slate-700">Product Images (multiple)</label>
                <input
                  ref={addFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setAddFiles(Array.from(e.target.files || []))}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => addFileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 py-3 text-xs font-bold text-slate-600 transition hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer"
                >
                  <Upload size={15} /> {addFiles.length ? `${addFiles.length} image(s) selected` : "Choose images"}
                </button>
                {addFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {addFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        <ImageIcon size={12} /> <span className="max-w-[120px] truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  resetAddForm();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:from-teal-500 hover:to-emerald-500 transition cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                <span>Save Asset Entry</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Return Modal */}
      {returnEntry &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 md:p-6 backdrop-blur-sm animate-fadeIn">
            <div className="flex max-h-[92vh] sm:max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100">
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 px-5 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 px-3 py-0.5 rounded-full">
                    <RotateCcw size={11} className="text-teal-400" />
                    Asset Return Handover
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white mt-1 tracking-tight">Mark Asset Return</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {returnEntry.employeeName} • {returnEntry.product}
                </p>
              </div>
              <button
                onClick={() => setReturnEntry(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 border border-slate-700/80 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 text-xs custom-scrollbar">
              <div className="flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200/70 p-3 text-xs font-semibold text-teal-800">
                <Calendar size={15} /> Return date and current timestamp will be recorded.
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Return Remark / Condition</label>
                <textarea
                  value={returnRemark}
                  onChange={(e) => setReturnRemark(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Condition of returned item / remarks (e.g. Good condition, charger returned)"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Return Images (multiple)</label>
                <input
                  ref={returnFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setReturnFiles(Array.from(e.target.files || []))}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => returnFileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 py-3 text-xs font-bold text-slate-600 transition hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer"
                >
                  <Upload size={15} /> {returnFiles.length ? `${returnFiles.length} image(s) selected` : "Choose return images"}
                </button>
                {returnFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {returnFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        <ImageIcon size={12} /> <span className="max-w-[120px] truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
              <button
                type="button"
                onClick={() => setReturnEntry(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturnSubmit}
                disabled={returning}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:from-teal-500 hover:to-emerald-500 transition cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {returning ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />}
                <span>Update Return</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image preview lightbox */}
      {previewImages &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 p-4"
            onClick={() => setPreviewImages(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer"
              onClick={() => setPreviewImages(null)}
            >
              <X size={22} />
            </button>
            <div
              className="flex max-h-[85vh] max-w-4xl flex-wrap justify-center gap-3 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {previewImages.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={optimizeImageUrl(url, 900)}
                    alt="asset"
                    className="max-h-[80vh] max-w-full rounded-xl object-contain"
                  />
                </a>
              ))}
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
};

export default CompanyAssets;
