import React, { useState, useEffect } from 'react';
import { 
  Edit, Save, X, Loader, Search, Key, User, Shield, Layers, Eye, EyeOff, 
  Plus, Trash2, AlertTriangle, RefreshCw, LayoutList, LayoutGrid, CheckCircle2, 
  UserCheck, ShieldCheck, Check, Lock, ChevronDown, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pageAccessGroups, pageAccessOptions } from '../config/hrModules';
import { supabase } from '../services/supabaseClient';

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAvatarGradient = (name) => {
  const gradients = [
    "from-indigo-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-fuchsia-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600"
  ];
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return gradients[hash % gradients.length];
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'admin', 'user'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mode, setMode] = useState('edit'); // 'edit' or 'add'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  const pageOptions = pageAccessOptions;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((u) => {
        const isAdmin = (u.admin || 'No').toString().trim().toLowerCase() === 'yes';
        return {
          id: u.id,
          username: u.username || '',
          password: u.password || '',
          name: u.name || '',
          admin: u.admin || 'No',
          pageAccess: isAdmin ? pageOptions.join(', ') : (u.pages_access || ''),
          manual: u.manual || 'No',
          profile: u.profile || '',
          employee_type: u.employee_type || '',
          latitude: u.latitude,
          longitude: u.longitude,
          range: u.range,
          time_in: u.time_in || '',
          time_out: u.time_out || '',
          category: u.category || '',
          employee_status: u.employee_status || 'Active',
          is_active: u.is_active !== false
        };
      }).filter(u => u.is_active && u.employee_status !== 'Inactive' && u.employee_status !== 'Left');

      setUsers(mapped);
    } catch (error) {
      console.error("Error fetching users from Supabase:", error);
      toast.error("Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
    setMode('edit');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentUser(prev => ({ ...prev, [name]: value }));
  };

  const handlePageToggle = (page) => {
    setCurrentUser(prev => {
      const selected = prev.selectedPages.includes(page)
        ? prev.selectedPages.filter(p => p !== page)
        : [...prev.selectedPages, page];
      return { ...prev, selectedPages: selected };
    });
  };

  const handleSelectAllPages = () => {
    setCurrentUser(prev => ({
      ...prev,
      selectedPages: prev.selectedPages.length === pageOptions.length ? [] : [...pageOptions]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const pageAccessString = currentUser.admin === 'Yes'
        ? pageOptions.join(', ')
        : (currentUser.selectedPages || []).join(', ');

      if (mode === 'add') {
        const { error } = await supabase.from('users').insert([{
          name: currentUser.name,
          username: currentUser.username,
          password: currentUser.password,
          admin: currentUser.admin || 'No',
          pages_access: pageAccessString,
          manual: currentUser.manual || 'No',
          employee_status: 'Active',
          is_active: true
        }]);

        if (error) throw error;
        toast.success("User created successfully");
        handleModalClose();
        fetchUsers();
      } else {
        const { error } = await supabase.from('users').update({
          name: currentUser.name,
          username: currentUser.username,
          password: currentUser.password,
          admin: currentUser.admin,
          pages_access: pageAccessString,
          updated_at: new Date().toISOString()
        }).eq('id', currentUser.id);

        if (error) throw error;
        toast.success("User updated successfully");
        handleModalClose();
        fetchUsers();
      }
    } catch (error) {
      console.error("Operation error:", error);
      toast.error(error.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddClick = () => {
    setCurrentUser({
      username: '',
      password: '',
      name: '',
      admin: 'No',
      selectedPages: [],
      originalUsername: ''
    });
    setMode('add');
    setIsModalOpen(true);
    setShowPassword(true);
  };

  const openEditModal = (user) => {
    setCurrentUser({
      ...user,
      originalUsername: user.username,
      selectedPages: user.pageAccess ? user.pageAccess.split(',').map(p => p.trim()).filter(p => p) : []
    });
    setMode('edit');
    setIsModalOpen(true);
    setShowPassword(false);
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false, employee_status: 'Inactive', updated_at: new Date().toISOString() })
        .eq('id', userToDelete.id);

      if (error) throw error;
      toast.success(`User ${userToDelete.username} deleted successfully`);
      fetchUsers();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.pageAccess || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isAdmin = (user.admin || '').toLowerCase() === 'yes';
    if (roleFilter === 'admin') return matchesSearch && isAdmin;
    if (roleFilter === 'user') return matchesSearch && !isAdmin;
    return matchesSearch;
  });

  const adminCount = users.filter(u => (u.admin || '').toLowerCase() === 'yes').length;
  const userCount = users.length - adminCount;

  return (
    <div className="p-3 sm:p-5 space-y-3 bg-[#f8fafc] min-h-screen text-xs antialiased text-slate-800">
      
      {/* Top Unified Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Actions Top Bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs shadow-indigo-500/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">User & Access Management</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  {users.length} Active Accounts
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Manage user credentials, roles, and module permissions</p>
            </div>
          </div>

          {/* Buttons & View Switcher */}
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

            {/* Refresh */}
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? "animate-spin text-indigo-600" : "text-slate-500"} />
              <span>{loading ? "Syncing..." : "Sync"}</span>
            </button>

            {/* Add User */}
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shadow-indigo-600/20 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        {/* Role Quick Filter Tabs */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto">
          {[
            { label: 'All Users', value: 'all', count: users.length, dot: 'bg-slate-500' },
            { label: 'Administrators', value: 'admin', count: adminCount, dot: 'bg-emerald-500' },
            { label: 'Standard Users', value: 'user', count: userCount, dot: 'bg-blue-500' },
          ].map((tab) => {
            const isActive = roleFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setRoleFilter(tab.value)}
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

        {/* Search Bar */}
        <div className="p-3 bg-white border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search username, full name, permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
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
              Showing <span className="font-bold text-slate-800 font-mono">{filteredUsers.length}</span> user accounts
            </div>
          </div>
        </div>

        {/* VIEW 1: MODERN SAAS DATA TABLE (TALL CONTAINER HEIGHT) */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-slate-500 sticky top-0 z-20 border-b border-slate-200/80 backdrop-blur-xs">
                <tr className="text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">User Account</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Username</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Password</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[100px]">Role / Admin</th>
                  <th className="py-3 px-4 min-w-[260px]">Accessible Modules</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[90px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-normal">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-semibold text-xs text-slate-600">Loading user accounts...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={24} />
                        <p className="font-bold text-sm text-slate-700">No users found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search keyword</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const isAdmin = (user.admin || '').toLowerCase() === 'yes';
                    const gradient = getAvatarGradient(user.name || user.username);
                    const initials = getInitials(user.name || user.username);
                    const pagesList = user.pageAccess ? user.pageAccess.split(',').map(p => p.trim()).filter(Boolean) : [];
                    const cleanUsername = (user.username || '').replace(/^@+/, '');

                    return (
                      <tr 
                        key={user.id || idx} 
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* User Profile */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-[11px] shadow-2xs shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-xs hover:text-indigo-700 transition-colors block">
                                {user.name || "Unnamed User"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                ID: {user.id ? String(user.id).slice(0, 8) + '...' : '-'}
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
                            {user.password || '-'}
                          </span>
                        </td>

                        {/* Admin Badge */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Shield size={10} className="text-emerald-600" />
                              <span>Administrator</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <User size={10} className="text-slate-400" />
                              <span>Standard</span>
                            </span>
                          )}
                        </td>

                        {/* Accessible Modules */}
                        <td className="py-2.5 px-4">
                          {isAdmin ? (
                            <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                              <CheckCircle2 size={12} /> Full System Access (All Modules)
                            </span>
                          ) : pagesList.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xl">
                              {pagesList.slice(0, 4).map((p, pIdx) => (
                                <span key={pIdx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200/80">
                                  {p}
                                </span>
                              ))}
                              {pagesList.length > 4 && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-200" title={pagesList.slice(4).join(', ')}>
                                  +{pagesList.length - 4} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">No modules assigned</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit User"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => confirmDelete(user)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete User"
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
                <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold text-xs text-slate-600">Loading user cards...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <AlertCircle size={24} />
                <p className="font-bold text-sm text-slate-700">No users found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredUsers.map((user, idx) => {
                  const isAdmin = (user.admin || '').toLowerCase() === 'yes';
                  const gradient = getAvatarGradient(user.name || user.username);
                  const initials = getInitials(user.name || user.username);
                  const pagesList = user.pageAccess ? user.pageAccess.split(',').map(p => p.trim()).filter(Boolean) : [];
                  const cleanUsername = (user.username || '').replace(/^@+/, '');

                  return (
                    <div 
                      key={user.id || idx} 
                      className="bg-white rounded-xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-sm transition-all p-3.5 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-xs">
                                {user.name || "Unnamed"}
                              </h3>
                              <span className="text-[11px] font-mono text-slate-500">{cleanUsername}</span>
                            </div>
                          </div>

                          {isAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              User
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Password:</span>
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 select-all">{user.password || "-"}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-1">Permissions:</span>
                            {isAdmin ? (
                              <span className="text-emerald-700 font-semibold text-xs">All System Modules</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {pagesList.slice(0, 3).map((p, pIdx) => (
                                  <span key={pIdx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded">
                                    {p}
                                  </span>
                                ))}
                                {pagesList.length > 3 && (
                                  <span className="px-1 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                                    +{pagesList.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => confirmDelete(user)}
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

      {/* Modern Add / Edit User Modal */}
      {isModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden">
            <form onSubmit={handleSubmit}>
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    {mode === 'add' ? <Plus size={14} /> : <Edit size={14} />}
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {mode === 'add' ? 'Create New User Account' : 'Edit User Account'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                    <input
                      type="text"
                      name="username"
                      value={currentUser.username}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={currentUser.password}
                        onChange={handleInputChange}
                        className="w-full pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={currentUser.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Admin Access</label>
                    <select
                      name="admin"
                      value={currentUser.admin}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    >
                      <option value="No">No (Standard User)</option>
                      <option value="Yes">Yes (Full Administrator)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700">Module Access Permissions</label>
                    {currentUser.admin !== 'Yes' && (
                      <button
                        type="button"
                        onClick={handleSelectAllPages}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {currentUser.selectedPages.length === pageOptions.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {currentUser.admin === 'Yes' ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-emerald-700 text-xs font-semibold">Administrators have automatic full access to all ERP modules.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-60 overflow-y-auto space-y-4">
                      {pageAccessGroups.map((group) => (
                        <div key={group.label} className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {group.label}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {group.items.map((page) => (
                              <label key={page} className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentUser.selectedPages.includes(page)}
                                  onChange={() => handlePageToggle(page)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                />
                                <span className="text-xs text-slate-700 select-none">{page}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-xs disabled:opacity-60 cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : (mode === 'add' ? "Create Account" : "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete User Account</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to deactivate <span className="font-bold text-slate-800">@{userToDelete.username}</span>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={cancelDelete}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-60"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
