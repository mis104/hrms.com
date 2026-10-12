import React, { useEffect, useMemo, useState } from 'react';
import { 
  ChevronLeft, 
  ExternalLink, 
  FileText, 
  Folder, 
  Image as ImageIcon, 
  Loader, 
  Search, 
  User, 
  RefreshCw, 
  Sparkles, 
  Briefcase, 
  MapPin, 
  Calendar,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const DOCUMENT_FIELDS = [
  {
    key: 'candidatePhoto',
    label: 'Candidate Photo',
    column: 'candidate_photo',
  },
  {
    key: 'aadharFront',
    label: 'Aadhar Front Photo',
    column: 'aadhar_frontside_photo',
  },
  {
    key: 'panCard',
    label: 'PAN Card',
    column: 'pan_card',
  },
  {
    key: 'bankPassbook',
    label: 'Bank Passbook / Cheque',
    column: 'photo_of_front_bank_passbook',
  },
  {
    key: 'qualificationPhoto',
    label: 'Highest Qualification',
    column: 'qualification_photo',
  },
  {
    key: 'resume',
    label: 'Resume / CV Copy',
    column: 'resume_cv_upload',
  },
  {
    key: 'salarySlip',
    label: 'Previous Salary Slip',
    column: 'salary_slip',
  },
];

const getDriveFileId = (url) => {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match?.[1] || '';
};

const getDocumentPreviewUrl = (url) => {
  const fileId = getDriveFileId(url);
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w600` : url;
};

const DOCUMENTS_CACHE_KEY = 'hrms_documents_folders_supabase_v1';

const getCachedFolders = () => {
  try {
    const cached = localStorage.getItem(DOCUMENTS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

const Documents = () => {
  const [employeeFolders, setEmployeeFolders] = useState(getCachedFolders);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(() => getCachedFolders().length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const buildEmployeeFolders = (rows) => {
    return rows
      .filter((row) => (row.update_link || '').trim().toUpperCase() === 'DONE')
      .map((row) => {
        const employeeName = row.name_as_per_aadhar?.trim() || row.candidate_name?.trim() || '';
        const employeeCode = row.employee_code?.trim() || row.indent_no?.trim() || '';

        if (!employeeName && !employeeCode) return null;

        const documents = DOCUMENT_FIELDS.map((field) => {
          const url = (row[field.column] || '').trim();
          return {
            ...field,
            url,
          };
        });

        const uploadedCount = documents.filter((doc) => doc.url).length;

        return {
          id: String(row.id),
          employeeId: employeeCode || `EMP-${row.id}`,
          name: employeeName || 'Employee',
          department: row.joining_place || '',
          designation: row.designation || row.lookup_designation || '',
          joiningPlace: row.joining_place || '',
          dateOfJoining: row.date_of_joining || '',
          documents,
          uploadedCount,
          totalDocs: DOCUMENT_FIELDS.length,
          isCompleted: uploadedCount >= 5,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const fetchDocuments = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('joining_fms')
        .select(`
          id,
          employee_code,
          candidate_name,
          name_as_per_aadhar,
          indent_no,
          designation,
          lookup_designation,
          joining_place,
          date_of_joining,
          aadhar_frontside_photo,
          pan_card,
          candidate_photo,
          photo_of_front_bank_passbook,
          qualification_photo,
          resume_cv_upload,
          salary_slip,
          update_link
        `)
        .order('id', { ascending: false });

      if (fetchErr) throw fetchErr;

      const folders = buildEmployeeFolders(data || []);
      setEmployeeFolders(folders);

      try {
        localStorage.setItem(DOCUMENTS_CACHE_KEY, JSON.stringify(folders));
      } catch (e) {
        // ignore quota error
      }
    } catch (err) {
      console.error('Error fetching employee documents from Supabase:', err);
      if (employeeFolders.length === 0) {
        setError(err.message || 'Failed to load employee folders');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const hasCache = getCachedFolders().length > 0;
    fetchDocuments(hasCache);
  }, []);

  const filteredFolders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return employeeFolders;

    return employeeFolders.filter(
      (folder) =>
        folder.name.toLowerCase().includes(query) ||
        folder.employeeId.toLowerCase().includes(query) ||
        folder.department.toLowerCase().includes(query) ||
        folder.designation.toLowerCase().includes(query) ||
        folder.joiningPlace.toLowerCase().includes(query)
    );
  }, [employeeFolders, searchTerm]);

  const selectedFolder = employeeFolders.find((folder) => folder.id === selectedFolderId);

  return (
    <div className="space-y-6 page-content p-6 animate-fadeIn">
      {/* Header with Title and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <Folder className="w-3.5 h-3.5 text-teal-600" />
              Employee Records
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
              {employeeFolders.length} Active Employee Folders
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            <span>Documents Management</span>
            <Sparkles className="w-5 h-5 text-teal-500 animate-pulse hidden sm:inline-block" />
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Auto-created folders with uploaded KYC, bank details, credentials, and joining documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!selectedFolder && (
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Employee, Code, Designation..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200/90 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 placeholder-slate-400 shadow-2xs transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchDocuments(false)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
            title="Refresh Folders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden min-h-[480px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Loader className="animate-spin text-teal-600" size={24} />
            </div>
            <p className="text-xs font-bold text-slate-700">Loading employee document folders...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="mx-auto mb-3 text-rose-500" size={48} />
            <h3 className="text-sm font-bold text-slate-800">Failed to load employee folders</h3>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => fetchDocuments(false)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        ) : !selectedFolder ? (
          <div className="p-6">
            {filteredFolders.length === 0 ? (
              <div className="py-24 text-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Folder size={32} />
                </div>
                <h3 className="text-sm font-bold text-slate-700">No employee folders match your search</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                  Try searching with a different employee code, name, or clear the search filter.
                </p>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="mt-3 text-xs font-bold text-teal-600 hover:text-teal-700"
                  >
                    Clear search query
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredFolders.map((folder) => {
                  const isFull = folder.uploadedCount >= 5;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`group relative flex flex-col items-center justify-between p-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98 ${
                        isFull
                          ? 'border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-teal-300'
                          : 'border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/80 hover:border-amber-300'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="w-full flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded shadow-2xs truncate max-w-[90px]">
                          {folder.employeeId}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${
                            isFull
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {folder.uploadedCount}/{folder.totalDocs}
                        </span>
                      </div>

                      {/* Folder Icon */}
                      <div className="relative my-2">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
                            isFull
                              ? 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white'
                              : 'bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white'
                          }`}
                        >
                          <Folder size={28} />
                        </div>
                      </div>

                      {/* Employee Info */}
                      <div className="w-full mt-1">
                        <h3 className="font-bold text-slate-800 text-xs truncate group-hover:text-teal-700 transition-colors">
                          {folder.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {folder.designation || folder.department || 'Employee'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Inside Folder View */
          <div className="flex flex-col min-h-[480px]">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Back to all folders"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 font-bold">
                    <Folder size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">{selectedFolder.name}</h2>
                      <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-md shadow-2xs">
                        {selectedFolder.employeeId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedFolder.uploadedCount} of {selectedFolder.totalDocs} documents uploaded
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200/80 px-3 py-1 rounded-xl shadow-2xs">
                  Stage J-1 KYC Records
                </span>
              </div>
            </div>

            {/* Folder Metadata Row */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50/60 border border-slate-200/70 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-100/60 text-teal-700 flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Name</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedFolder.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedFolder.designation || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Joining Place</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedFolder.joiningPlace || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100/60 text-amber-700 flex items-center justify-center shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Joining</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedFolder.dateOfJoining || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Document Files Grid */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                  Uploaded KYC & Joining Documents ({selectedFolder.uploadedCount}/{selectedFolder.totalDocs})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                  {selectedFolder.documents.map((document) => {
                    const hasUrl = Boolean(document.url);
                    return (
                      <div
                        key={document.key}
                        className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 bg-white shadow-2xs ${
                          hasUrl
                            ? 'border-slate-200/90 hover:border-teal-400 hover:shadow-md'
                            : 'border-slate-200/60 bg-slate-50/40 opacity-75'
                        }`}
                      >
                        {/* Preview / Image Box */}
                        <div className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center">
                          {hasUrl ? (
                            <img
                              src={getDocumentPreviewUrl(document.url)}
                              alt={document.label}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}

                          <div className={`${hasUrl ? 'hidden' : ''} flex flex-col items-center gap-2 text-slate-400 p-4 text-center`}>
                            {hasUrl ? (
                              <FileText size={36} className="text-teal-600" />
                            ) : (
                              <ImageIcon size={36} className="text-slate-300" />
                            )}
                            <span className="text-[11px] font-semibold text-slate-500">
                              {hasUrl ? 'Click View to open' : 'No document uploaded'}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs flex items-center gap-1 ${
                              hasUrl
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {hasUrl ? (
                              <>
                                <CheckCircle2 size={11} />
                                Available
                              </>
                            ) : (
                              'Missing'
                            )}
                          </span>

                          {/* Hover View Overlay */}
                          {hasUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={document.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-lg hover:bg-teal-50 transition-all cursor-pointer"
                              >
                                <ExternalLink size={13} />
                                <span>Open Full Doc</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Document Info Card */}
                        <div className="p-3.5 flex items-center justify-between gap-2 border-t border-slate-100 bg-white">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-xs truncate" title={document.label}>
                              {document.label}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {hasUrl ? 'Document verified' : 'Pending upload in Stage J-1'}
                            </p>
                          </div>

                          {hasUrl && (
                            <a
                              href={document.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 transition-colors"
                              title="Open link"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
