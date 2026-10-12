import React, { useState, useEffect } from 'react';
import { Search, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';

const Leaving = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leavingData, setLeavingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Action Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedActionItem, setSelectedActionItem] = useState(null);
  const [actionFormData, setActionFormData] = useState({
    resignationLetterReceived: false,
    resignationStatus: '',
    approval: false,
    approvalStatus: '',
    handoverOfAssets: false,
    assetChecklist: {
      idCard: false,
      visitingCard: false,
      laptop: false,
      mobile: false,
      sim: false,
      benefitEnrollment: false,
      dataSecurity: false,
      whatsappGroup: false,
      documentsData: false,
      businessWhatsapp: false,
      officialEmail: false,
      callForwarding: false
    },
    callForwardNumber: '',
    finalExitInterview: false,
    finalExitStatus: ''
  });

  const fetchLeavingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: sbError } = await supabase
        .from('leaving_fms')
        .select('*')
        .order('id', { ascending: true });

      if (sbError) throw sbError;

      const processedData = (data || []).map((row) => ({
        id: row.id,
        employeeId: row.employee_id || '',
        lastWorkingDay: row.last_working_day || '',
        reason: row.reason_for_resignation || '',
        salary: row.salary || '',
        candidateName: row.candidate_name || '',
        designation: row.designation || '',
        mobileNumber: row.mobile_no || '',
        ex1Planned: row.ex1_planned || '',
        ex1Actual: row.ex1_actual || '',
        ex1Status: row.ex1_status || '',
        ex2Planned: row.ex2_planned || '',
        ex2Actual: row.ex2_actual || '',
        ex2Status: row.ex2_status || '',
        ex3Planned: row.ex3_planned || '',
        ex3Actual: row.ex3_actual || '',
        ex3Status: row.ex3_status || '',
        ex3ExitChecklist: row.ex3_exit_checklist || '',
        ex4Planned: row.ex4_planned || '',
        ex4Actual: row.ex4_actual || '',
        ex4Status: row.ex4_status || '',
        leaving: row.leaving || '',
        exitChecklist: row.exit_checklist || '',
        originalRow: row
      })).filter(item => {
        if (!item.employeeId && !item.candidateName) return false;
        const isChecklistFilled = String(item.ex4Status || '').trim().toLowerCase() === 'done';
        return !isChecklistFilled;
      });

      setLeavingData(processedData);
    } catch (error) {
      console.error('Error fetching leaving data:', error);
      setError(error.message);
      toast.error(`Failed to load leaving data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeavingData();
  }, []);

  const filteredData = leavingData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.candidateName?.toLowerCase().includes(searchLower) ||
      item.employeeId?.toString().toLowerCase().includes(searchLower) ||
      item.designation?.toLowerCase().includes(searchLower)
    );
  });

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    }
    return dateString;
  };

  const handleActionClick = (item) => {
    setSelectedActionItem(item);
    const row = item.originalRow || {};

    const assetString = item.ex3ExitChecklist || row.ex3_exit_checklist || (Array.isArray(row) ? row[38] : '') || '';
    const currentAssets = {
      idCard: false,
      visitingCard: false,
      laptop: false,
      mobile: false,
      sim: false,
      benefitEnrollment: false,
      dataSecurity: false,
      whatsappGroup: false,
      documentsData: false,
      businessWhatsapp: false,
      officialEmail: false,
      callForwarding: false
    };

    const assetLabelsToKeys = {
      'ID CARD': 'idCard',
      'VISITING CARD': 'visitingCard',
      'LAPTOP': 'laptop',
      'MOBILE': 'mobile',
      'SIM': 'sim',
      'Remove Benefit Enrollment': 'benefitEnrollment',
      'Data security document sign': 'dataSecurity',
      'Remove from whatapp group': 'whatsappGroup',
      'Documents and data handover': 'documentsData',
      'Business WhatsApp logged out/removed from phone': 'businessWhatsapp',
      'Official email logged out from device': 'officialEmail'
    };

    let callForwardNumber = '';
    if (assetString) {
      assetString.split(',').forEach(label => {
        const trimmedLabel = label.trim();
        if (/^call forward-/i.test(trimmedLabel)) {
          currentAssets.callForwarding = true;
          callForwardNumber = trimmedLabel.replace(/^call forward-/i, '').trim();
          return;
        }
        const key = assetLabelsToKeys[trimmedLabel];
        if (key) {
          currentAssets[key] = true;
        }
      });
    }

    const ex1Actual = item.ex1Actual || row.ex1_actual || (Array.isArray(row) ? row[28] : '');
    const ex1Status = item.ex1Status || row.ex1_status || (Array.isArray(row) ? row[29] : '');
    const ex2Actual = item.ex2Actual || row.ex2_actual || (Array.isArray(row) ? row[32] : '');
    const ex2Status = item.ex2Status || row.ex2_status || (Array.isArray(row) ? row[33] : '');
    const ex3Actual = item.ex3Actual || row.ex3_actual || (Array.isArray(row) ? row[36] : '');
    const ex4Actual = item.ex4Actual || row.ex4_actual || (Array.isArray(row) ? row[41] : '');
    const ex4Status = item.ex4Status || row.ex4_status || (Array.isArray(row) ? row[42] : '');

    setActionFormData({
      resignationLetterReceived: !!ex1Actual || !!ex1Status,
      resignationStatus: ex1Status || '',
      approval: !!ex2Actual || !!ex2Status,
      approvalStatus: ex2Status || '',
      handoverOfAssets: !!ex3Actual || !!assetString,
      assetChecklist: currentAssets,
      callForwardNumber,
      finalExitInterview: !!ex4Actual || !!ex4Status,
      finalExitStatus: ex4Status || ''
    });
    setShowActionModal(true);
  };

  const handleActionCheckboxChange = (name) => {
    setActionFormData(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleStatusChange = (e, field) => {
    const { value } = e.target;
    setActionFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAssetCheckboxChange = (assetKey) => {
    setActionFormData(prev => ({
      ...prev,
      assetChecklist: {
        ...prev.assetChecklist,
        [assetKey]: !prev.assetChecklist[assetKey]
      }
    }));
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedActionItem) return;
    const toastId = toast.loading('Updating action details...');

    try {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const yyyy = today.getFullYear();
      const submissionDate = `${dd}/${mm}/${yyyy}`;

      const assetLabels = {
        idCard: 'ID CARD',
        visitingCard: 'VISITING CARD',
        laptop: 'LAPTOP',
        mobile: 'MOBILE',
        sim: 'SIM',
        benefitEnrollment: 'Remove Benefit Enrollment',
        dataSecurity: 'Data security document sign',
        whatsappGroup: 'Remove from whatapp group',
        documentsData: 'Documents and data handover',
        businessWhatsapp: 'Business WhatsApp logged out/removed from phone',
        officialEmail: 'Official email logged out from device'
      };

      const selectedAssetsList = Object.entries(actionFormData.assetChecklist)
        .filter(([key, val]) => val)
        .map(([key]) =>
          key === 'callForwarding'
            ? `call forward-${(actionFormData.callForwardNumber || '').trim()}`
            : assetLabels[key]
        );

      const selectedAssetsString = selectedAssetsList.join(',');
      const allAssetsChecked = selectedAssetsList.length === Object.keys(actionFormData.assetChecklist).length;

      const resignationDate = (actionFormData.resignationLetterReceived && actionFormData.resignationStatus === 'Done')
        ? submissionDate : '';
      const finalExitDate = (actionFormData.finalExitInterview && actionFormData.finalExitStatus === 'Done')
        ? submissionDate : '';
      const handoverDate = (actionFormData.handoverOfAssets && allAssetsChecked)
        ? submissionDate : '';
      const approvalDate = (actionFormData.approval && allAssetsChecked && actionFormData.approvalStatus === 'Done')
        ? submissionDate : '';

      const payload = {
        ex1_actual: resignationDate,
        ex1_status: actionFormData.resignationStatus,
        ex2_actual: approvalDate,
        ex2_status: actionFormData.approvalStatus,
        ex3_actual: handoverDate,
        ex3_exit_checklist: selectedAssetsString,
        ex4_actual: finalExitDate,
        ex4_status: actionFormData.finalExitStatus,
        updated_at: new Date().toISOString()
      };

      const { error: updateErr } = await supabase
        .from('leaving_fms')
        .update(payload)
        .eq('id', selectedActionItem.id);

      if (updateErr) throw updateErr;

      toast.success('Action checklist updated successfully!', { id: toastId });
      setShowActionModal(false);
      fetchLeavingData();

    } catch (error) {
      console.error('Error submitting action:', error);
      toast.error(`Update failed: ${error.message}`, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaving (FMS)</h1>
        <button
          onClick={fetchLeavingData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          Refresh
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, ID, or designation..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Working Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                        <span className="text-gray-600 text-sm">Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <p className="text-red-500">Error: {error}</p>
                      <button
                        onClick={fetchLeavingData}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleActionClick(item)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Action
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.candidateName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.mobileNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDisplayDate(item.lastWorkingDay)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.salary}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.reason}>{item.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <p className="text-gray-500">No records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Action Modal */}
      {
        showActionModal && selectedActionItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-medium text-gray-700">Action Checklist</h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <form onSubmit={handleActionSubmit} className="space-y-4">
                  {/* Employee Info Read-only */}
                  <div className="bg-gray-50 p-3 rounded-md mb-4 border border-gray-200">
                    <p className="text-sm text-gray-600"><span className="font-semibold">ID:</span> {selectedActionItem.employeeId}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold">Name:</span> {selectedActionItem.candidateName}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Resignation Letter Received */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="resignationLetterReceived"
                          checked={actionFormData.resignationLetterReceived}
                          onChange={() => handleActionCheckboxChange('resignationLetterReceived')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="resignationLetterReceived" className=" ml-2 text-sm text-gray-700 font-medium">
                          Resignation Letter Received
                        </label>
                      </div>
                      {actionFormData.resignationLetterReceived && (
                        <select
                          value={actionFormData.resignationStatus}
                          onChange={(e) => handleStatusChange(e, 'resignationStatus')}
                          className="ml-6 block w-full pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50"
                        >
                          <option value="">Select Status</option>
                          <option value="Done">Done</option>
                          <option value="Hold">Hold</option>
                          <option value="Pending">Pending</option>
                        </select>
                      )}
                    </div>

                    {/* Approval */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="approval"
                          checked={actionFormData.approval}
                          onChange={() => handleActionCheckboxChange('approval')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="approval" className="ml-2 text-sm text-gray-700 font-medium">
                          Approval
                        </label>
                      </div>
                      {actionFormData.approval && (
                        <select
                          value={actionFormData.approvalStatus}
                          onChange={(e) => handleStatusChange(e, 'approvalStatus')}
                          className="ml-6 block w-full pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50"
                        >
                          <option value="">Select Status</option>
                          <option value="Done">Done</option>
                          <option value="Hold">Hold</option>
                          <option value="Pending">Pending</option>
                        </select>
                      )}
                    </div>

                    {/* Handover Of Assets */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="handoverOfAssets"
                          checked={actionFormData.handoverOfAssets}
                          onChange={() => handleActionCheckboxChange('handoverOfAssets')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="handoverOfAssets" className="ml-2 text-sm text-gray-700 font-medium">
                          Handover Of Assets
                        </label>
                      </div>
                      {actionFormData.handoverOfAssets && (
                        <div className="ml-6 space-y-2 pl-2 border-l-2 border-gray-200">
                          {[
                            { key: 'idCard', label: 'ID CARD' },
                            { key: 'visitingCard', label: 'VISITING CARD' },
                            { key: 'laptop', label: 'LAPTOP' },
                            { key: 'mobile', label: 'MOBILE' },
                            { key: 'sim', label: 'SIM' },
                            { key: 'benefitEnrollment', label: 'Remove Benefit Enrollment' },
                            { key: 'dataSecurity', label: 'Data security document sign' },
                            { key: 'whatsappGroup', label: 'Remove from whatapp group' },
                            { key: 'documentsData', label: 'Documents and data handover' },
                            { key: 'businessWhatsapp', label: 'Business WhatsApp logged out/removed from phone' },
                            { key: 'officialEmail', label: 'Official email logged out from device' },
                            { key: 'callForwarding', label: 'Call Forwarding' }
                          ].map((asset) => (
                            <div key={asset.key}>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={asset.key}
                                  checked={actionFormData.assetChecklist[asset.key]}
                                  onChange={() => handleAssetCheckboxChange(asset.key)}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor={asset.key} className="ml-2 text-sm text-gray-600">
                                  {asset.label}
                                </label>
                              </div>
                              {asset.key === 'callForwarding' && actionFormData.assetChecklist.callForwarding && (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={actionFormData.callForwardNumber}
                                  onChange={(e) => setActionFormData(prev => ({ ...prev, callForwardNumber: e.target.value }))}
                                  placeholder="Enter forwarding number"
                                  className="ml-6 mt-1 w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Final Exit Interview */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="finalExitInterview"
                          checked={actionFormData.finalExitInterview}
                          onChange={() => handleActionCheckboxChange('finalExitInterview')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="finalExitInterview" className="ml-2 text-sm text-gray-700 font-medium">
                          Feedback Call With Director
                        </label>
                      </div>
                      {actionFormData.finalExitInterview && (
                        <select
                          value={actionFormData.finalExitStatus}
                          onChange={(e) => handleStatusChange(e, 'finalExitStatus')}
                          className="ml-6 block w-full pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50"
                        >
                          <option value="">Select Status</option>
                          <option value="Done">Done</option>
                          <option value="Hold">Hold</option>
                          <option value="Pending">Pending</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowActionModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};


export default Leaving;