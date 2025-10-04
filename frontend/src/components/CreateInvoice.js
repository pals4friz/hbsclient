import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateInvoice = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [laborCharges, setLaborCharges] = useState(0);
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [taxPercentage, setTaxPercentage] = useState(3.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New customer modal state
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // New product modal state
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    sku: '',
    category: '',
    weight: '',
    purity: '',
    rate_per_gram: '',
    stock_quantity: '',
    description: ''
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [goldRates, setGoldRates] = useState([]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchGoldRates();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

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

  const addItem = () => {
    setInvoiceItems([...invoiceItems, { product_id: '', quantity: 1 }]);
  };

  const removeItem = (index) => {
    const newItems = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...invoiceItems];
    newItems[index][field] = value;
    setInvoiceItems(newItems);
  };

  const calculateTotal = () => {
    let subtotal = 0;
    
    invoiceItems.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product && item.quantity) {
        const weight = product.weight * item.quantity;
        const amount = weight * product.rate_per_gram;
        subtotal += amount;
      }
    });

    const subtotalWithLabor = subtotal + laborCharges;
    const taxAmount = taxIncluded ? subtotalWithLabor * (taxPercentage / 100) : 0;
    const total = subtotalWithLabor + taxAmount;

    return { subtotal, laborCharges, subtotalWithLabor, taxAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (invoiceItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const invalidItems = invoiceItems.some(item => !item.product_id || !item.quantity);
    if (invalidItems) {
      alert('Please fill all item details');
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceData = {
        customer_id: selectedCustomer,
        items: invoiceItems,
        labor_charges: laborCharges,
        tax_included: taxIncluded,
        tax_percentage: taxPercentage
      };

      const response = await axios.post(`${API}/invoices`, invoiceData);
      
      // Download the invoice immediately
      const downloadResponse = await axios.get(`${API}/invoices/${response.data.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${response.data.invoice_number}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert('Invoice created and downloaded successfully!');
      
      // Reset form
      setSelectedCustomer('');
      setInvoiceItems([]);
      setLaborCharges(0);
      setTaxIncluded(true);
      setTaxPercentage(3.0);
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please check item availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new customer function
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerData.name || !newCustomerData.phone || !newCustomerData.address) {
      alert('Please fill in all required fields (Name, Phone, Address)');
      return;
    }

    setIsAddingCustomer(true);
    try {
      const response = await axios.post(`${API}/customers`, newCustomerData);
      const newCustomer = response.data;
      
      // Update customers list and select the new customer
      setCustomers([...customers, newCustomer]);
      setSelectedCustomer(newCustomer.id);
      
      // Reset form and close modal
      setNewCustomerData({ name: '', phone: '', email: '', address: '' });
      setShowNewCustomerModal(false);
      
      alert('Customer added successfully!');
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer. Please try again.');
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // Add new product function
  const handleAddNewProduct = async (e) => {
    e.preventDefault();
    if (!newProductData.name || !newProductData.sku || !newProductData.category || 
        !newProductData.weight || !newProductData.purity || !newProductData.rate_per_gram || 
        !newProductData.stock_quantity) {
      alert('Please fill in all required fields');
      return;
    }

    setIsAddingProduct(true);
    try {
      const productData = {
        ...newProductData,
        weight: parseFloat(newProductData.weight),
        rate_per_gram: parseFloat(newProductData.rate_per_gram),
        stock_quantity: parseInt(newProductData.stock_quantity)
      };

      const response = await axios.post(`${API}/products`, productData);
      const newProduct = response.data;
      
      // Update products list
      setProducts([...products, newProduct]);
      
      // Reset form and close modal
      setNewProductData({
        name: '', sku: '', category: '', weight: '', purity: '', 
        rate_per_gram: '', stock_quantity: '', description: ''
      });
      setShowNewProductModal(false);
      
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please try again.');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const { subtotal, laborCharges: laborChargesCalc, subtotalWithLabor, taxAmount, total } = calculateTotal();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Create Invoice</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        {/* Customer Selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Customer *
            </label>
            <button
              type="button"
              onClick={() => setShowNewCustomerModal(true)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              data-testid="add-new-customer-btn"
            >
              + Add New Customer
            </button>
          </div>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            required
            data-testid="customer-select"
          >
            <option value="">Choose a customer...</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name} - {customer.phone}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Items */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Invoice Items
            </label>
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => setShowNewProductModal(true)}
                className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm"
                data-testid="add-new-product-btn"
              >
                + Add New Product
              </button>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                data-testid="add-item-btn"
              >
                Add Item
              </button>
            </div>
          </div>

          {invoiceItems.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No items added yet. Click "Add Item" to get started.</p>
          ) : (
            <div className="space-y-4">
              {invoiceItems.map((item, index) => {
                const product = products.find(p => p.id === item.product_id);
                const weight = product ? product.weight * item.quantity : 0;
                const amount = product ? weight * product.rate_per_gram : 0;

                return (
                  <div key={index} className="border border-gray-200 p-4 rounded" data-testid={`invoice-item-${index}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Product</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          className="w-full border border-gray-300 p-2 rounded text-sm"
                          required
                          data-testid={`product-select-${index}`}
                        >
                          <option value="">Select product...</option>
                          {products.filter(p => p.stock_quantity > 0).map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku}) - Stock: {product.stock_quantity}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          max={product ? product.stock_quantity : 1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                          className="w-full border border-gray-300 p-2 rounded text-sm"
                          required
                          data-testid={`quantity-input-${index}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Weight (g)</label>
                        <input
                          type="text"
                          value={weight.toFixed(2)}
                          className="w-full border border-gray-300 p-2 rounded text-sm bg-gray-50"
                          readOnly
                          data-testid={`weight-display-${index}`}
                        />
                      </div>

                      <div className="flex items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Amount (₹)</label>
                          <input
                            type="text"
                            value={`₹${amount.toFixed(2)}`}
                            className="w-full border border-gray-300 p-2 rounded text-sm bg-gray-50"
                            readOnly
                            data-testid={`amount-display-${index}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="ml-2 text-red-600 hover:text-red-800 p-2"
                          data-testid={`remove-item-${index}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Labor Charges and Tax Settings */}
        <div className="mb-6 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Labor Charges (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={laborCharges}
                onChange={(e) => setLaborCharges(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 p-2 rounded"
                data-testid="labor-charges-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Settings
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tax-option"
                    checked={taxIncluded}
                    onChange={() => setTaxIncluded(true)}
                    className="mr-2"
                    data-testid="with-tax-radio"
                  />
                  With Tax
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tax-option"
                    checked={!taxIncluded}
                    onChange={() => setTaxIncluded(false)}
                    className="mr-2"
                    data-testid="without-tax-radio"
                  />
                  Without Tax
                </label>
              </div>
            </div>

            {taxIncluded && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value))}
                  className="w-full border border-gray-300 p-2 rounded"
                  data-testid="tax-percentage-input"
                />
              </div>
            )}
          </div>

          <div className="md:text-right bg-gray-50 p-4 rounded">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span data-testid="subtotal-display">₹{subtotal.toFixed(2)}</span>
              </div>
              {laborCharges > 0 && (
                <div className="flex justify-between">
                  <span>Labor Charges:</span>
                  <span data-testid="labor-display">₹{laborCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Subtotal with Labor:</span>
                <span data-testid="subtotal-with-labor-display">₹{subtotalWithLabor.toFixed(2)}</span>
              </div>
              {taxIncluded && (
                <div className="flex justify-between">
                  <span>Tax ({taxPercentage}%):</span>
                  <span data-testid="tax-display">₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Amount:</span>
                <span data-testid="total-display">₹{total.toFixed(2)}</span>
              </div>
              {!taxIncluded && (
                <div className="text-sm text-gray-600 italic">
                  *This invoice is without tax
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || invoiceItems.length === 0}
            className={`px-6 py-3 rounded-lg font-medium ${
              isSubmitting || invoiceItems.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
            data-testid="create-invoice-btn"
          >
            {isSubmitting ? 'Creating Invoice...' : 'Create & Download Invoice'}
          </button>
        </div>
      </form>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="new-customer-modal">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
            <form onSubmit={handleAddNewCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-customer-name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-customer-phone"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  data-testid="new-customer-email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  value={newCustomerData.address}
                  onChange={(e) => setNewCustomerData({...newCustomerData, address: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  rows="3"
                  required
                  data-testid="new-customer-address"
                />
              </div>
              
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  disabled={isAddingCustomer}
                  className={`flex-1 py-2 rounded ${
                    isAddingCustomer ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                  data-testid="save-new-customer"
                >
                  {isAddingCustomer ? 'Adding...' : 'Add Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  data-testid="cancel-new-customer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="new-product-modal">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
            <form onSubmit={handleAddNewProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                <input
                  type="text"
                  value={newProductData.sku}
                  onChange={(e) => setNewProductData({...newProductData, sku: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-sku"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={newProductData.category}
                  onChange={(e) => setNewProductData({...newProductData, category: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-category"
                >
                  <option value="">Select Category</option>
                  <option value="Ring">Ring</option>
                  <option value="Necklace">Necklace</option>
                  <option value="Earring">Earring</option>
                  <option value="Bracelet">Bracelet</option>
                  <option value="Chain">Chain</option>
                  <option value="Pendant">Pendant</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProductData.weight}
                  onChange={(e) => setNewProductData({...newProductData, weight: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-weight"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purity *</label>
                <select
                  value={newProductData.purity}
                  onChange={(e) => setNewProductData({...newProductData, purity: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-purity"
                >
                  <option value="">Select Purity</option>
                  <option value="18K">18K</option>
                  <option value="22K">22K</option>
                  <option value="24K">24K</option>
                  <option value="Silver">Silver</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate per gram (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProductData.rate_per_gram}
                  onChange={(e) => setNewProductData({...newProductData, rate_per_gram: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-rate"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  value={newProductData.stock_quantity}
                  onChange={(e) => setNewProductData({...newProductData, stock_quantity: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-stock"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({...newProductData, description: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  data-testid="new-product-description"
                />
              </div>
              
              <div className="md:col-span-2 flex space-x-2 pt-4">
                <button
                  type="submit"
                  disabled={isAddingProduct}
                  className={`flex-1 py-2 rounded ${
                    isAddingProduct ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                  data-testid="save-new-product"
                >
                  {isAddingProduct ? 'Adding...' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  data-testid="cancel-new-product"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateInvoice;