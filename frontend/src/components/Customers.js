import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Customers = () => {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  
  // Excel upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await axios.put(`${API}/customers/${editingCustomer.id}`, formData);
      } else {
        await axios.post(`${API}/customers`, formData);
      }

      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: ''
    });
    setEditingCustomer(null);
    setShowForm(false);
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address
    });
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDownloadSample = async () => {
    try {
      const response = await axios.get(`${API}/customers/sample-excel/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customer_sample.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading sample:', error);
      alert('Failed to download sample file');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUploadExcel = async () => {
    if (!uploadFile) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await axios.post(`${API}/customers/upload-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadResult(response.data);
      fetchCustomers(); // Refresh customer list
      setUploadFile(null);
      
      // Auto-close modal after 3 seconds if successful and no errors
      if (response.data.errors.length === 0) {
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadResult(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadResult({
        success: false,
        added: 0,
        skipped: 0,
        errors: [error.response?.data?.detail || 'Upload failed']
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Customer Management</h1>
        <div className="flex flex-wrap gap-2">
          {isAdmin() && (
            <>
              <button
                onClick={handleDownloadSample}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                data-testid="download-sample-btn"
              >
                📥 Download Sample
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                data-testid="upload-excel-btn"
              >
                📤 Upload Excel
              </button>
            </>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            data-testid="add-customer-btn"
          >
            + Add New Customer
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6" data-testid="customer-form">
          <h2 className="text-xl font-semibold mb-4">
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Customer Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              required
              data-testid="customer-name-input"
            />
            
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              required
              data-testid="customer-phone-input"
            />
            
            <input
              type="email"
              placeholder="Email (optional)"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              data-testid="customer-email-input"
            />
            
            <textarea
              placeholder="Address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              rows="3"
              required
              data-testid="customer-address-input"
            />
            
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                data-testid="save-customer-btn"
              >
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                data-testid="cancel-customer-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Upload Customer Excel</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadResult(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {!uploadResult ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Excel File (.xlsx, .xls)
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="w-full border border-gray-300 rounded p-2"
                      data-testid="excel-file-input"
                    />
                    {uploadFile && (
                      <p className="mt-2 text-sm text-green-600">
                        ✓ Selected: {uploadFile.name}
                      </p>
                    )}
                  </div>

                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Download the sample Excel file first to see the required format.
                      Duplicate phone numbers will be skipped automatically.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleUploadExcel}
                      disabled={!uploadFile || uploading}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      data-testid="confirm-upload-btn"
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setUploadFile(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div className={`p-4 rounded mb-4 ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <h3 className={`font-semibold mb-2 ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {uploadResult.success ? '✅ Upload Complete' : '❌ Upload Failed'}
                    </h3>
                    <ul className="text-sm space-y-1">
                      <li className="text-green-700">✓ Added: {uploadResult.added} customers</li>
                      {uploadResult.skipped > 0 && (
                        <li className="text-yellow-700">⚠ Skipped: {uploadResult.skipped} duplicates</li>
                      )}
                      {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <li className="text-red-700">
                          <strong>Errors:</strong>
                          <ul className="ml-4 mt-1">
                            {uploadResult.errors.slice(0, 5).map((err, idx) => (
                              <li key={idx}>• {err}</li>
                            ))}
                            {uploadResult.errors.length > 5 && (
                              <li>• ... and {uploadResult.errors.length - 5} more</li>
                            )}
                          </ul>
                        </li>
                      )}
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadResult(null);
                      setUploadFile(null);
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full" data-testid="customers-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{customer.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="text-indigo-600 hover:text-indigo-900"
                      data-testid={`edit-customer-${customer.id}`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;