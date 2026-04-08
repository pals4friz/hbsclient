import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MakingChargesConfig = () => {
  const { isAdmin, token } = useAuth();
  const [makingCharges, setMakingCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);
  const [formData, setFormData] = useState({
    purity: '22K',
    charge_type: 'per_gram', // 'per_gram' or 'per_piece'
    charge_amount: 0,
    min_weight: 0,
    max_weight: 999,
    description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create axios config with auth header
  const getAuthConfig = () => ({
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  useEffect(() => {
    fetchMakingCharges();
  }, []);

  const fetchMakingCharges = async () => {
    try {
      const response = await axios.get(`${API}/making-charges`);
      setMakingCharges(response.data);
    } catch (error) {
      console.error('Error fetching making charges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingCharge) {
        await axios.put(`${API}/making-charges/${editingCharge.id}`, formData, getAuthConfig());
        setSuccess('Making charge updated successfully!');
      } else {
        await axios.post(`${API}/making-charges`, formData, getAuthConfig());
        setSuccess('Making charge created successfully!');
      }
      fetchMakingCharges();
      closeModal();
    } catch (error) {
      setError(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (chargeId) => {
    if (!window.confirm('Are you sure you want to delete this making charge rule?')) {
      return;
    }

    try {
      await axios.delete(`${API}/making-charges/${chargeId}`, getAuthConfig());
      setSuccess('Making charge deleted successfully!');
      fetchMakingCharges();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const openModal = (charge = null) => {
    if (charge) {
      setEditingCharge(charge);
      setFormData({
        purity: charge.purity,
        charge_type: charge.charge_type,
        charge_amount: charge.charge_amount,
        min_weight: charge.min_weight || 0,
        max_weight: charge.max_weight || 999,
        description: charge.description || ''
      });
    } else {
      setEditingCharge(null);
      setFormData({
        purity: '22K',
        charge_type: 'per_gram',
        charge_amount: 0,
        min_weight: 0,
        max_weight: 999,
        description: ''
      });
    }
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCharge(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading making charges...</div>
      </div>
    );
  }

  const purities = ['18K', '20K', '22K', '24K', 'Silver', 'Silver SILL', 'Silver925'];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">⚙️ Making Charges Configuration</h1>
          <p className="text-gray-500 mt-1">Set predefined labor/making charges by purity and weight range</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          + Add Making Charge Rule
        </button>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ How it works:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Per Gram:</strong> Charge is multiplied by item weight (e.g., ₹100/g × 5g = ₹500)</li>
          <li>• <strong>Per Piece:</strong> Fixed charge regardless of weight (e.g., ₹500 per piece)</li>
          <li>• Weight ranges allow different rates for light vs heavy items</li>
          <li>• These charges auto-apply during invoicing but can be edited manually</li>
        </ul>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
          <button onClick={() => setSuccess('')} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Making Charges Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Purity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Charge Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Weight Range</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {makingCharges.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No making charge rules defined. Click "Add Making Charge Rule" to create one.
                  </td>
                </tr>
              ) : (
                makingCharges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        charge.purity.startsWith('Silver') 
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {charge.purity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        charge.charge_type === 'per_gram' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {charge.charge_type === 'per_gram' ? '📏 Per Gram' : '🔢 Per Piece'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">
                      ₹{charge.charge_amount}
                      <span className="text-gray-400 text-xs ml-1">
                        {charge.charge_type === 'per_gram' ? '/gram' : '/piece'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                      {charge.min_weight}g - {charge.max_weight}g
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate">
                      {charge.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => openModal(charge)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(charge.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCharge ? '✏️ Edit Making Charge' : '➕ Add Making Charge Rule'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Purity *</label>
                <select
                  value={formData.purity}
                  onChange={(e) => setFormData({...formData, purity: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {purities.map(p => (
                    <option key={p} value={p}>
                      {p.startsWith('Silver') ? p : `${p} Gold`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Charge Type *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="per_gram"
                      checked={formData.charge_type === 'per_gram'}
                      onChange={(e) => setFormData({...formData, charge_type: e.target.value})}
                      className="mr-2"
                    />
                    <span>📏 Per Gram</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="per_piece"
                      checked={formData.charge_type === 'per_piece'}
                      onChange={(e) => setFormData({...formData, charge_type: e.target.value})}
                      className="mr-2"
                    />
                    <span>🔢 Per Piece</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Charge Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.charge_amount}
                  onChange={(e) => setFormData({...formData, charge_amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={formData.charge_type === 'per_gram' ? 'Rate per gram' : 'Fixed amount per piece'}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Weight (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_weight}
                    onChange={(e) => setFormData({...formData, min_weight: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Weight (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.max_weight}
                    onChange={(e) => setFormData({...formData, max_weight: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Light weight items, Heavy chains, etc."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCharge ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MakingChargesConfig;
