import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SalesManagement = () => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    purity: ''
  });

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      // Get all invoices to extract sales data
      const invoicesResponse = await axios.get(`${API}/invoices`);
      const invoices = invoicesResponse.data;
      
      // Extract all sold items with their details
      const allSalesItems = [];
      
      invoices.forEach(invoice => {
        invoice.items.forEach(item => {
          allSalesItems.push({
            id: `${invoice.id}-${item.product_id}`,
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            customerName: invoice.customer_name,
            productName: item.product_name,
            sku: item.sku,
            quantity: item.quantity,
            weight: item.weight,
            ratePerGram: item.rate_per_gram,
            amount: item.amount,
            category: 'N/A', // Will be populated if we have product details
            purity: 'N/A'
          });
        });
      });
      
      // Sort by date (newest first)
      allSalesItems.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
      
      setSalesData(allSalesItems);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = salesData.filter(item => {
    const itemDate = new Date(item.invoiceDate);
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    if (filters.category && !item.category.toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.purity && !item.purity.toLowerCase().includes(filters.purity.toLowerCase())) return false;
    
    return true;
  });

  const calculateTotals = () => {
    return filteredSales.reduce((totals, item) => {
      totals.totalWeight += item.weight;
      totals.totalAmount += item.amount;
      totals.totalItems += item.quantity;
      return totals;
    }, { totalWeight: 0, totalAmount: 0, totalItems: 0 });
  };

  const totals = calculateTotals();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Sales Management</h1>
      
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full border border-gray-300 p-2 rounded"
              data-testid="start-date-filter"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full border border-gray-300 p-2 rounded"
              data-testid="end-date-filter"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              placeholder="Ring, Necklace, etc."
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="w-full border border-gray-300 p-2 rounded"
              data-testid="category-filter"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
            <input
              type="text"
              placeholder="18K, 22K, etc."
              value={filters.purity}
              onChange={(e) => setFilters({...filters, purity: e.target.value})}
              className="w-full border border-gray-300 p-2 rounded"
              data-testid="purity-filter"
            />
          </div>
        </div>
        
        <button
          onClick={() => setFilters({ startDate: '', endDate: '', category: '', purity: '' })}
          className="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          data-testid="clear-filters-btn"
        >
          Clear Filters
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-100 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-blue-800">Total Items Sold</h3>
          <p className="text-2xl font-bold text-blue-600">{totals.totalItems}</p>
        </div>
        
        <div className="bg-green-100 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-green-800">Total Weight Sold</h3>
          <p className="text-2xl font-bold text-green-600">{totals.totalWeight.toFixed(2)}g</p>
        </div>
        
        <div className="bg-purple-100 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-purple-800">Total Sales Value</h3>
          <p className="text-2xl font-bold text-purple-600">₹{totals.totalAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Sales Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Sales Items ({filteredSales.length} items)
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading sales data...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No sales data found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full" data-testid="sales-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (g)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/g</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {item.weight.toFixed(2)}g
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{item.ratePerGram.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ₹{item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesManagement;