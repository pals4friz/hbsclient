import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [goldRates, setGoldRates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    purity: '',
    rate_per_gram: '',
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
        rate_per_gram: parseFloat(formData.rate_per_gram)
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
      purity: '',
      rate_per_gram: '',
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
      purity: product.purity,
      rate_per_gram: product.rate_per_gram.toString(),
      description: product.description
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    try {
      await axios.delete(`${API}/products/${productId}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handlePurityChange = (purity) => {
    setFormData({...formData, purity: purity});
    
    // Auto-suggest rate based on current gold rates
    const currentRate = goldRates.find(rate => rate.purity === purity);
    if (currentRate) {
      setFormData(prev => ({...prev, purity: purity, rate_per_gram: currentRate.rate_per_gram.toString()}));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Product List & SKU Reference</h1>
          <p className="text-gray-600 mt-1">Product catalog for QR code scanning reference (weights come from QR codes)</p>
        </div>
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
              placeholder="SKU Code (2 characters for QR scanning)"
              value={formData.sku}
              onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})}
              className="border border-gray-300 p-2 rounded font-mono"
              maxLength="2"
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
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            QR Code Reference List ({products.length} products)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Use these SKU codes in QR format: XX{'{SKU}'}XXXXX|{'{weight}'} (e.g., AB{'{12}'}CD567|2.5)
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full" data-testid="products-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/g (₹)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-blue-600 font-mono font-bold text-lg">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.purity}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">₹{product.rate_per_gram}</td>
                  <td className="px-6 py-4 text-sm font-medium">
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

      {/* QR Code Format Help */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📱 QR Code Format for Scanning</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Format:</strong> <code className="bg-white px-1 rounded">XX{'{SKU}'}XXXXX|{'{weight}'}</code></p>
          <p><strong>Example:</strong> <code className="bg-white px-1 rounded">AB12CD567|2.5</code> where:</p>
          <ul className="list-disc list-inside ml-4">
            <li>Positions 3-4: <code>12</code> (SKU from this table)</li>
            <li>After |: <code>2.5</code> (actual weight in grams)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductList;