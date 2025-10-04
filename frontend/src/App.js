import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import axios from "axios";
import "./App.css";
import Customers from "./components/Customers";
import CreateInvoice from "./components/CreateInvoice";
import InvoiceList from "./components/InvoiceList";
import SalesReport from "./components/SalesReport";
import GoldRates from "./components/GoldRates";
import SalesManagement from "./components/SalesManagement";
import ProductList from "./components/ProductList";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    total_customers: 0,
    total_invoices: 0,
    today_sales: 0
  });
  const [showGoldRates, setShowGoldRates] = useState(false);
  const [goldRates, setGoldRates] = useState([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchGoldRates();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchGoldRates = async () => {
    try {
      const response = await axios.get(`${API}/gold-rates`);
      setGoldRates(response.data);
    } catch (error) {
      console.error('Error fetching gold rates:', error);
    }
  };

  const handleResetSalesData = async () => {
    const userInput = prompt('⚠️ Type "RESET" to permanently delete all sales data (keeps products & customers):');
    
    if (userInput !== 'RESET') {
      return;
    }

    setIsResetting(true);
    try {
      await axios.post(`${API}/dashboard/reset-sales`);
      
      // Refresh dashboard stats
      fetchDashboardStats();
      
    } catch (error) {
      console.error('Error resetting sales data:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-blue-600">Jewelry Store Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-100 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-blue-800">Total Products</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total_products}</p>
        </div>
        
        <div className="bg-green-100 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-green-800">Total Customers</h3>
          <p className="text-2xl font-bold text-green-600">{stats.total_customers}</p>
        </div>
        
        <div className="bg-yellow-100 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-yellow-800">Total Invoices</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.total_invoices}</p>
        </div>
        
        <div className="bg-purple-100 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-purple-800">Today's Sales</h3>
          <p className="text-2xl font-bold text-purple-600">₹{stats.today_sales.toFixed(2)}</p>
        </div>
      </div>

      {/* Current Gold & Silver Rates Display */}
      <div className="mb-8 bg-gradient-to-r from-yellow-50 to-gray-50 p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center gap-2">
            💰 Current Gold & Silver Rates
          </h2>
          <button
            onClick={fetchGoldRates}
            className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 min-h-[40px] touch-manipulation self-start sm:self-auto"
            data-testid="refresh-rates-btn"
          >
            🔄 Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {goldRates.map((rate) => (
            <div key={rate.purity} className={`p-4 rounded-lg border-2 ${
              rate.purity === 'Silver' 
                ? 'bg-gray-100 border-gray-300' 
                : 'bg-yellow-100 border-yellow-300'
            }`}>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  rate.purity === 'Silver' ? 'text-gray-700' : 'text-yellow-700'
                }`}>
                  {rate.purity}
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{rate.rate_per_gram.toFixed(0)}
                </div>
                <div className="text-xs text-gray-600 mt-1">per gram</div>
                <div className="text-xs text-gray-500 mt-1">
                  Updated: {new Date(rate.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {goldRates.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No rates available. Click "Manage Rates" below to set up gold and silver rates.
          </div>
        )}
      </div>

      {/* Reset Sales Data Section */}
      {(stats.total_invoices > 0 || stats.today_sales > 0) && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">🗑️ Reset Sales Data</h3>
              <p className="text-red-700 text-sm mb-2">
                Clear all invoices and sales records to start fresh. Products and customers will be preserved.
              </p>
              <p className="text-xs text-red-600">
                ⚠️ This action cannot be undone. All sales history will be permanently deleted.
              </p>
            </div>
            <button
              onClick={handleResetSalesData}
              disabled={isResetting}
              className={`px-6 py-3 rounded-lg font-medium ${
                isResetting 
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              data-testid="reset-sales-data-btn"
            >
              {isResetting ? 'Resetting...' : 'Reset Sales Data'}
            </button>
          </div>
        </div>
      )}

      {/* Gold Rates Management Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">📊 Gold & Silver Rates</h2>
          <button
            onClick={() => setShowGoldRates(!showGoldRates)}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            data-testid="toggle-gold-rates"
          >
            {showGoldRates ? 'Hide Rates' : 'Manage Rates'}
          </button>
        </div>
        
        {showGoldRates && <GoldRates />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/product-list" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-blue-500">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Product List & SKU Reference</h3>
          <p className="text-gray-600">Product catalog with SKU codes for QR scanning (no weights/stock)</p>
        </Link>
        
        <Link to="/sales-management" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-orange-500">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Sales Management</h3>
          <p className="text-gray-600">View sold items with actual weights and sales analytics</p>
        </Link>
        
        <Link to="/customers" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-green-500">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Customer Management</h3>
          <p className="text-gray-600">Manage customer information</p>
        </Link>
        
        <Link to="/invoices" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-yellow-500">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Create Invoice</h3>
          <p className="text-gray-600">Generate invoices with tax options, labor charges & direct print</p>
        </Link>
        
        <Link to="/invoice-list" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-purple-500">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Invoice History</h3>
          <p className="text-gray-600">View, download PDF, and print invoices</p>
        </Link>
        
        <Link to="/sales-report" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-red-500">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Sales Reports</h3>
          <p className="text-gray-600">Generate item-wise sales Excel reports</p>
        </Link>
      </div>
    </div>
  );
};

// Products Component (Legacy - replaced by ProductList)
const Products_OLD = () => {
  const [products, setProducts] = useState([]);
  const [goldRates, setGoldRates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    weight: '',
    purity: '',
    rate_per_gram: '',
    stock_quantity: '',
    description: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchGoldRates();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchGoldRates = async () => {
    try {
      const response = await axios.get(`${API}/gold-rates`);
      setGoldRates(response.data);
    } catch (error) {
      console.error('Error fetching gold rates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...formData,
        weight: parseFloat(formData.weight),
        rate_per_gram: parseFloat(formData.rate_per_gram),
        stock_quantity: parseInt(formData.stock_quantity)
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData);
      } else {
        await axios.post(`${API}/products`, productData);
      }

      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      weight: '',
      purity: '',
      rate_per_gram: '',
      stock_quantity: '',
      description: ''
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      weight: product.weight.toString(),
      purity: product.purity,
      rate_per_gram: product.rate_per_gram.toString(),
      stock_quantity: product.stock_quantity.toString(),
      description: product.description
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handlePurityChange = (purity) => {
    setFormData({...formData, purity: purity});
    
    // Auto-suggest rate based on current gold rates
    const currentRate = goldRates.find(rate => rate.purity === purity);
    if (currentRate) {
      setFormData(prev => ({...prev, purity: purity, rate_per_gram: currentRate.rate_per_gram.toString()}));
    }
  };

  const handleDelete = async (productId) => {
    try {
      await axios.delete(`${API}/products/${productId}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Product Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          data-testid="add-product-btn"
        >
          Add New Product
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6" data-testid="product-form">
          <h2 className="text-xl font-semibold mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Product Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              required
              data-testid="product-name-input"
            />
            
            <input
              type="text"
              placeholder="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({...formData, sku: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              required
              data-testid="product-sku-input"
            />
            
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              required
              data-testid="product-category-select"
            >
              <option value="">Select Category</option>
              <option value="Ring">Ring</option>
              <option value="Necklace">Necklace</option>
              <option value="Earring">Earring</option>
              <option value="Bracelet">Bracelet</option>
              <option value="Chain">Chain</option>
              <option value="Pendant">Pendant</option>
            </select>
            
            <div>
              <input
                type="number"
                step="0.01"
                placeholder="Weight (grams)"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: e.target.value})}
                className="border border-gray-300 p-2 rounded w-full"
                required
                data-testid="product-weight-input"
              />
              <div className="text-xs text-gray-500 mt-1">Weight in grams (e.g., 2.5g, 10.25g)</div>
            </div>
            
            <div>
              <select
                value={formData.purity}
                onChange={(e) => handlePurityChange(e.target.value)}
                className="border border-gray-300 p-2 rounded w-full"
                required
                data-testid="product-purity-select"
              >
                <option value="">Select Purity</option>
                <option value="18K">18K Gold</option>
                <option value="20K">20K Gold</option>
                <option value="22K">22K Gold</option>
                <option value="24K">24K Gold</option>
                <option value="Silver">Silver</option>
              </select>
              {formData.purity && goldRates.find(rate => rate.purity === formData.purity) && (
                <div className="text-xs text-green-600 mt-1">
                  Current rate: ₹{goldRates.find(rate => rate.purity === formData.purity).rate_per_gram}/gram
                </div>
              )}
            </div>
            
            <div>
              <input
                type="number"
                step="0.01"
                placeholder="Rate per gram (₹)"
                value={formData.rate_per_gram}
                onChange={(e) => setFormData({...formData, rate_per_gram: e.target.value})}
                className="border border-gray-300 p-2 rounded w-full"
                required
                data-testid="product-rate-input"
              />
              <div className="text-xs text-gray-500 mt-1">Selling price per gram including making charges</div>
            </div>
            
            <input
              type="number"
              placeholder="Stock Quantity"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              required
              data-testid="product-stock-input"
            />
            
            <input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="border border-gray-300 p-2 rounded"
              data-testid="product-description-input"
            />
            
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                data-testid="save-product-btn"
              >
                {editingProduct ? 'Update Product' : 'Save Product'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                data-testid="cancel-product-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full" data-testid="products-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (g)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/g</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.weight}g</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.purity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{product.rate_per_gram}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      data-testid={`edit-product-${product.id}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                      data-testid={`delete-product-${product.id}`}
                    >
                      Delete
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

// Navigation Component
const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-lg sm:text-xl font-bold">💎 Jewelry Store</Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-2 lg:space-x-4 text-sm lg:text-base">
            <Link to="/" className="hover:text-blue-200 px-2 py-1">Dashboard</Link>
            <Link to="/product-list" className="hover:text-blue-200 px-2 py-1">Product List</Link>
            <Link to="/customers" className="hover:text-blue-200 px-2 py-1">Customers</Link>
            <Link to="/invoices" className="hover:text-blue-200 px-2 py-1">Create Invoice</Link>
            <Link to="/invoice-list" className="hover:text-blue-200 px-2 py-1">Invoices</Link>
            <Link to="/sales-management" className="hover:text-blue-200 px-2 py-1">Sales</Link>
            <Link to="/sales-report" className="hover:text-blue-200 px-2 py-1">Reports</Link>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-blue-700 touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-blue-500">
            <div className="flex flex-col space-y-2 pt-4">
              <Link to="/" className="hover:text-blue-200 px-2 py-2 text-base touch-manipulation" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
              <Link to="/product-list" className="hover:text-blue-200 px-2 py-2 text-base touch-manipulation" onClick={() => setIsMobileMenuOpen(false)}>Product List</Link>
              <Link to="/customers" className="hover:text-blue-200 px-2 py-2 text-base touch-manipulation" onClick={() => setIsMobileMenuOpen(false)}>Customers</Link>
              <Link to="/invoices" className="hover:text-blue-200 px-2 py-2 text-base touch-manipulation" onClick={() => setIsMobileMenuOpen(false)}>Create Invoice</Link>
              <Link to="/invoice-list" className="hover:text-blue-200 px-2 py-2 text-base touch-manipulation" onClick={() => setIsMobileMenuOpen(false)}>Invoices</Link>
              <Link to="/sales-management" className="hover:text-blue-200 px-2 py-2 text-base touch-manipulation" onClick={() => setIsMobileMenuOpen(false)}>Sales</Link>
              <Link to="/sales-report" className="hover:text-blue-200 px-2 py-2 text-base touch-manipulation" onClick={() => setIsMobileMenuOpen(false)}>Reports</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/product-list" element={<ProductList />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/invoices" element={<CreateInvoice />} />
          <Route path="/invoice-list" element={<InvoiceList />} />
          <Route path="/sales-management" element={<SalesManagement />} />
          <Route path="/sales-report" element={<SalesReport />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;