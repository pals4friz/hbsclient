import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GoldRates = () => {
  const [goldRates, setGoldRates] = useState([]);
  const [editingRate, setEditingRate] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchGoldRates();
    initializeDefaultRates();
  }, []);

  const fetchGoldRates = async () => {
    try {
      const response = await axios.get(`${API}/gold-rates`);
      setGoldRates(response.data);
    } catch (error) {
      console.error('Error fetching gold rates:', error);
    }
  };

  const initializeDefaultRates = async () => {
    try {
      await axios.post(`${API}/gold-rates/initialize`);
      fetchGoldRates(); // Refresh after initialization
    } catch (error) {
      console.error('Error initializing default rates:', error);
    }
  };

  const handleUpdateRate = async (purity) => {
    if (!newRate || newRate <= 0) {
      alert('Please enter a valid rate');
      return;
    }

    setIsUpdating(true);
    try {
      await axios.put(`${API}/gold-rates/${purity}`, {
        rate_per_gram: parseFloat(newRate)
      });
      
      setEditingRate(null);
      setNewRate('');
      fetchGoldRates();
      alert('Rate updated successfully!');
    } catch (error) {
      console.error('Error updating rate:', error);
      alert('Error updating rate');
    } finally {
      setIsUpdating(false);
    }
  };

  const startEditing = (rate) => {
    setEditingRate(rate.purity);
    setNewRate(rate.rate_per_gram.toString());
  };

  const cancelEditing = () => {
    setEditingRate(null);
    setNewRate('');
  };

  const getPurityColor = (purity) => {
    switch (purity) {
      case '24K': return 'text-yellow-600 bg-yellow-50';
      case '22K': return 'text-yellow-500 bg-yellow-50';
      case '20K': return 'text-orange-600 bg-orange-50';
      case '18K': return 'text-orange-500 bg-orange-50';
      case 'Silver': return 'text-gray-600 bg-gray-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gold & Silver Rates Management</h2>
        <div className="text-sm text-gray-500">
          Rates per gram (₹)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goldRates.map((rate) => (
          <div key={rate.purity} className={`p-4 rounded-lg border ${getPurityColor(rate.purity)}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{rate.purity}</h3>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date(rate.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${getPurityColor(rate.purity)}`}>
                {rate.purity === 'Silver' ? 'Silver' : 'Gold'}
              </div>
            </div>

            {editingRate === rate.purity ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">New Rate (₹/gram)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded"
                    data-testid={`rate-input-${rate.purity}`}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateRate(rate.purity)}
                    disabled={isUpdating}
                    className={`flex-1 py-1 px-3 rounded text-sm ${
                      isUpdating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                    data-testid={`save-rate-${rate.purity}`}
                  >
                    {isUpdating ? 'Updating...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="flex-1 bg-gray-600 text-white py-1 px-3 rounded text-sm hover:bg-gray-700"
                    data-testid={`cancel-rate-${rate.purity}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-2xl font-bold">
                  ₹{rate.rate_per_gram.toFixed(2)}
                  <span className="text-sm font-normal text-gray-600">/gram</span>
                </div>
                <button
                  onClick={() => startEditing(rate)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                  data-testid={`edit-rate-${rate.purity}`}
                >
                  Update Rate
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">💡 How it works:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Set current market rates for different purity levels</li>
          <li>• These rates will be suggested when adding new products</li>
          <li>• Update rates daily based on current market prices</li>
          <li>• All product calculations are done per gram weight</li>
        </ul>
      </div>
    </div>
  );
};

export default GoldRates;