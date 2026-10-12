import React, { useEffect, useMemo, useState } from "react";
import {
  Edit,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Megaphone,
  X,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  User,
  Briefcase,
  ExternalLink,
  MessageSquareQuote
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabaseClient";

const emptyForm = {
  date: "",
  image: "",
  imageFile: null,
  sms: "",
  smsType: "New Joining",
  name: "",
  designation: "",
};

const uploadFile = async (file) => {
  if (!file) return "";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default");

  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dhbtn1ecx";
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url;
    }
    console.error("Cloudinary upload failed:", data);
    return "";
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return "";
  }
};

const formatDateToInput = (dateStr) => {
  if (!dateStr) return "";
  const m = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  return dateStr;
};

const formatDateFromInput = (dateStr) => {
  if (!dateStr) return "";
  const m = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return `${String(m[3]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}-${m[1]}`;
  }
  return dateStr;
};

const getBadgeStyle = (type) => {
  const t = (type || "").toLowerCase();
  if (t.includes("birthday")) {
    return "bg-rose-50 text-rose-700 border-rose-200/80";
  }
  if (t.includes("joining") || t.includes("onboard")) {
    return "bg-teal-50 text-teal-800 border-teal-200/80";
  }
  if (t.includes("anniversary") || t.includes("annivercery")) {
    return "bg-amber-50 text-amber-800 border-amber-200/80";
  }
  if (t.includes("festival")) {
    return "bg-purple-50 text-purple-700 border-purple-200/80";
  }
  return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
};

const FeedManagement = () => {
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(emptyForm);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("onboard_and_status")
        .select("id, date, image, sms, sms_type, name, designation, created_at, updated_at")
        .order("id", { ascending: false });

      if (error) throw error;
      setRows(data || []);
    } catch (error) {
      console.error("Feed fetch error:", error);
      toast.error("Failed to load feed records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) =>
      [row.date, row.sms, row.sms_type, row.name, row.designation]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [rows, searchTerm]);

  const openAddModal = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();

    setMode("add");
    setEditingRow(null);
    setForm({
      date: `${y}-${m}-${d}`,
      image: "",
      imageFile: null,
      sms: "",
      smsType: "New Joining",
      name: "",
      designation: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setMode("edit");
    setEditingRow(row);
    setForm({
      date: formatDateToInput(row.date) || "",
      image: row.image || "",
      imageFile: null,
      sms: row.sms || "",
      smsType: row.sms_type || "New Joining",
      name: row.name || "",
      designation: row.designation || "",
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, imageFile: file }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!form.sms.trim() || !form.smsType.trim()) {
        throw new Error("Message and SMS Type are required");
      }

      let finalImageUrl = form.image;
      if (form.imageFile) {
        toast.loading("Uploading image...", { id: "upload" });
        const uploadedUrl = await uploadFile(form.imageFile);
        toast.dismiss("upload");
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          toast.error("Image upload failed, preserving existing URL");
        }
      }

      const formattedDate = formatDateFromInput(form.date);

      const payload = {
        date: formattedDate,
        image: finalImageUrl,
        sms: form.sms.trim(),
        sms_type: form.smsType,
        name: form.name.trim(),
        designation: form.designation.trim(),
        updated_at: new Date().toISOString(),
      };

      if (mode === "add") {
        const { error } = await supabase.from("onboard_and_status").insert([payload]);
        if (error) throw error;
        toast.success("Feed post created successfully!");
      } else {
        const { error } = await supabase
          .from("onboard_and_status")
          .update(payload)
          .eq("id", editingRow.id);
        if (error) throw error;
        toast.success("Feed post updated successfully!");
      }

      loadData();
      closeModal();
    } catch (error) {
      console.error("Feed save error:", error);
      toast.error(error.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("onboard_and_status")
        .delete()
        .eq("id", deleteRow.id);

      if (error) throw error;

      toast.success("Feed post deleted successfully");
      loadData();
      setDeleteRow(null);
    } catch (error) {
      console.error("Feed delete error:", error);
      toast.error(error.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 animate-fadeIn">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-600" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xs">
              <Megaphone size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                  Onboarding & Feed Management
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                  {rows.length} Total Feeds
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Feed Management</span>
                <Sparkles className="w-5 h-5 text-teal-500 animate-pulse hidden sm:inline-block" />
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Manage mobile app broadcast feeds: New Joining, Birthdays, Anniversaries, and Announcements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-teal-600" : "text-slate-500"} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:shadow-teal-500/20 transition hover:from-teal-500 hover:to-emerald-500 cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>Add New Feed</span>
            </button>
          </div>
        </div>
      </section>

      {/* Search Toolbar */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by Employee Name, Designation, Date, Message, or SMS Type..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs font-semibold text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </section>

      {/* Feed Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Feed Broadcast Records</h2>
            <p className="text-[11px] font-medium text-slate-500">{filteredRows.length} feed items active</p>
          </div>
          {loading && <span className="text-xs font-bold text-teal-600 animate-pulse">Syncing...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
            <thead className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-slate-200 border-b border-slate-800 text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Banner / Image</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Employee / Role</th>
                <th className="px-4 py-3.5">Message / SMS</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-16 text-center text-slate-400">
                    <div className="inline-flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-teal-600" />
                      <span className="font-bold text-xs text-slate-600">Loading feed records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-teal-50/30 group">
                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] border border-slate-200/60 shadow-2xs">
                        {row.date || "—"}
                      </span>
                    </td>

                    {/* Image */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {row.image ? (
                        <a
                          href={row.image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/img relative inline-block overflow-hidden rounded-xl border border-slate-200 shadow-2xs"
                        >
                          <img
                            src={row.image}
                            alt="Feed"
                            className="h-11 w-11 object-cover transition duration-200 group-hover/img:scale-110"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ExternalLink size={12} />
                          </div>
                        </a>
                      ) : (
                        <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-400">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>

                    {/* SMS Type */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold shadow-2xs ${getBadgeStyle(
                          row.sms_type
                        )}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        {row.sms_type || "Feed"}
                      </span>
                    </td>

                    {/* Name & Designation */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div>
                        <div className="font-bold text-slate-900">{row.name || "—"}</div>
                        {row.designation && (
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {row.designation}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Message / SMS */}
                    <td className="px-4 py-3.5 max-w-md">
                      <p className="text-slate-700 font-medium line-clamp-2 leading-snug">
                        {row.sms || "—"}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="inline-flex items-center gap-1 rounded-xl border border-indigo-200/80 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 cursor-pointer shadow-2xs"
                        >
                          <Edit size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRow(row)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200/80 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 cursor-pointer shadow-2xs"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-5 py-16 text-center text-slate-400">
                    <div className="inline-flex flex-col items-center gap-2">
                      <Megaphone size={32} className="text-slate-300" />
                      <p className="font-bold text-slate-700 text-sm">No feed records found</p>
                      <p className="text-xs text-slate-400">Click &quot;Add New Feed&quot; to publish an announcement or greeting.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 px-6 py-4.5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 px-3 py-0.5 rounded-full">
                  <Sparkles size={11} className="text-teal-400" />
                  {mode === "add" ? "New Feed Broadcast" : "Update Feed Post"}
                </span>
                <h2 className="text-lg font-black text-white mt-1 tracking-tight">
                  {mode === "add" ? "Create Feed Broadcast" : "Edit Feed Post"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 border border-slate-700/80 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid gap-4 overflow-y-auto p-6 sm:grid-cols-2 text-xs custom-scrollbar flex-1">
              <label className="block">
                <span className="mb-1.5 block font-bold text-slate-700">Date</span>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={updateForm}
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </label>

              <div className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">SMS / Feed Type *</span>
                  <span className="text-[10px] text-teal-600 font-semibold">Type custom or pick below</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    list="feed-type-presets"
                    name="smsType"
                    value={form.smsType}
                    onChange={updateForm}
                    placeholder="Type custom feed type (e.g. Festival, Promotion, Event)..."
                    required
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                  <datalist id="feed-type-presets">
                    <option value="New Joining" />
                    <option value="Birthday" />
                    <option value="Anniversary" />
                    <option value="Festival" />
                    <option value="Announcement" />
                    <option value="Notice" />
                    <option value="Achievement" />
                    <option value="Promotion" />
                    <option value="Event" />
                  </datalist>
                </div>
                {/* Quick Selection Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["New Joining", "Birthday", "Anniversary", "Festival", "Announcement", "Notice"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, smsType: preset }))}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        form.smsType === preset
                          ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                          : "bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-slate-200/80"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block font-bold text-slate-700">Employee Name (Optional)</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={updateForm}
                  placeholder="e.g. Mr. Rahul Agarwal"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-bold text-slate-700">Designation / Role (Optional)</span>
                <input
                  name="designation"
                  value={form.designation}
                  onChange={updateForm}
                  placeholder="e.g. Sales Director"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </label>

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-1.5 block font-bold text-slate-700">Feed Banner / Photo Upload</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer outline-none"
                    />
                  </div>
                  {form.image && !form.imageFile && (
                    <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-teal-700">
                      <span>Saved Image URL:</span>
                      <a href={form.image} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-xs">
                        {form.image}
                      </a>
                    </div>
                  )}
                  {form.imageFile && (
                    <p className="mt-1.5 text-[11px] font-bold text-emerald-600">
                      New image selected: {form.imageFile.name}
                    </p>
                  )}
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-1.5 block font-bold text-slate-700">Message Content (SMS) *</span>
                  <textarea
                    name="sms"
                    value={form.sms}
                    onChange={updateForm}
                    rows="3"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Type the message, announcement, or greeting here..."
                  />
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:from-teal-500 hover:to-emerald-500 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Save size={15} />
                <span>{submitting ? "Saving..." : mode === "add" ? "Publish Feed" : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-base font-black text-slate-900">Delete Feed Post?</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Are you sure you want to delete this {deleteRow.sms_type || "feed"} post? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={15} />
                <span>{submitting ? "Deleting..." : "Delete Post"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedManagement;
