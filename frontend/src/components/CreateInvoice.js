import { useState, useEffect } from "react";
import axios from "axios";
import QRCodeScanner from "./QRScanner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateInvoice = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [taxIncluded, setTaxIncluded] = useState(false); // Default to without tax
  const [taxPercentage, setTaxPercentage] = useState(3.0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [oldGoldValue, setOldGoldValue] = useState(0);
  const [oldSilverValue, setOldSilverValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState(null);
  
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
  
  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanResult, setQrScanResult] = useState(null);

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
    setInvoiceItems([...invoiceItems, { product_id: '', quantity: 1, weight: 0, labor_charges: 0 }]);
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
    let totalWeight = 0;
    let totalLaborCharges = 0;
    
    invoiceItems.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product && item.weight) {
        const amount = item.weight * product.rate_per_gram;
        subtotal += amount;
        totalWeight += item.weight;
        
        // Use individual labor charges per item (user-editable)
        totalLaborCharges += parseFloat(item.labor_charges || 0);
      }
    });

    const subtotalWithLabor = subtotal + totalLaborCharges;
    const taxAmount = taxIncluded ? subtotalWithLabor * (taxPercentage / 100) : 0;
    
    // New calculation formula: Subtotal + Labor + Tax - Discount - (Old Gold + Old Silver) = Final Total
    const subtotalWithTax = subtotalWithLabor + taxAmount;
    const total = subtotalWithTax - parseFloat(discountAmount || 0) - parseFloat(oldGoldValue || 0) - parseFloat(oldSilverValue || 0);

    return { subtotal, laborCharges: totalLaborCharges, totalWeight, subtotalWithLabor, taxAmount, total, discountAmount, oldGoldValue, oldSilverValue };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || invoiceItems.length === 0) {
      return;
    }

    const invalidItems = invoiceItems.some(item => !item.product_id || !item.quantity);
    if (invalidItems) {
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceData = {
        customer_id: selectedCustomer,
        items: invoiceItems,
        tax_included: taxIncluded,
        discount_amount: parseFloat(discountAmount || 0),
        old_gold_value: parseFloat(oldGoldValue || 0),
        old_silver_value: parseFloat(oldSilverValue || 0)
      };

      const response = await axios.post(`${API}/invoices`, invoiceData);
      setLastCreatedInvoice(response.data);
      
      // Reset form
      setSelectedCustomer('');
      setInvoiceItems([]);
      setTaxIncluded(false); // Default to without tax
      setTaxPercentage(3.0);
      setDiscountAmount(0);
      setOldGoldValue(0);
      setOldSilverValue(0);
      
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new customer function
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerData.name || !newCustomerData.phone || !newCustomerData.address) {
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
      
    } catch (error) {
      console.error('Error adding customer:', error);
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
      
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setIsAddingProduct(false);
    }
  };

  // Handle purity change in new product modal
  const handleNewProductPurityChange = (purity) => {
    setNewProductData({...newProductData, purity: purity});
    
    // Auto-suggest rate based on current gold rates
    const currentRate = goldRates.find(rate => rate.purity === purity);
    if (currentRate) {
      setNewProductData(prev => ({...prev, purity: purity, rate_per_gram: currentRate.rate_per_gram.toString()}));
    }
  };

  // Parse QR code function
  const parseQuickQR = (qrText) => {
    try {
      console.log('Processing QR text:', qrText);
      
      if (typeof qrText === 'string' && qrText.length >= 4) {
        // Extract SKU (3rd and 4th characters)
        const sku = qrText.substring(2, 4);
        
        // Extract weight (everything after "|")
        const pipeIndex = qrText.indexOf('|');
        let weight = null;
        
        if (pipeIndex !== -1 && pipeIndex < qrText.length - 1) {
          const weightStr = qrText.substring(pipeIndex + 1);
          weight = parseFloat(weightStr);
        }
        
        console.log('Parsed - SKU:', sku, 'Weight:', weight);
        
        if (sku && weight && !isNaN(weight)) {
          return { sku, weight, originalCode: qrText };
        } else {
          setQrScanResult({ error: 'Invalid QR code format', found: false });
          return null;
        }
      } else {
        setQrScanResult({ error: 'QR code too short', found: false });
        return null;
      }
    } catch (error) {
      console.error('Error parsing QR code:', error);
      setQrScanResult({ error: 'Error parsing QR code: ' + error.message, found: false });
      return null;
    }
  };

  // QR Scanner functions
  const handleQRScan = (result) => {
    if (!result) return;
    
    const { sku, weight, originalCode } = result;
    console.log('QR Scan result:', { sku, weight, originalCode });
    
    // Find product by SKU
    const product = products.find(p => p.sku === sku);
    
    if (product) {
      // Check if item already exists in invoice
      const existingItemIndex = invoiceItems.findIndex(item => item.product_id === product.id);
      
      if (existingItemIndex >= 0) {
        // Update existing item with new weight
        const updatedItems = [...invoiceItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: 1,
          weight: weight // Update with new scanned weight
        };
        setInvoiceItems(updatedItems);
      } else {
        // Add new item with actual weight from QR code
        const newItem = {
          product_id: product.id,
          quantity: 1, // Always 1 since each QR represents one specific item
          weight: weight // Actual weight from QR code
        };
        setInvoiceItems([...invoiceItems, newItem]);
      }
      
      setQrScanResult({ sku, weight, productName: product.name, found: true });
    } else {
      setQrScanResult({ sku, weight, found: false, error: `Product with SKU "${sku}" not found` });
    }
    
    setShowQRScanner(false);
  };

  const handleQRError = (error) => {
    console.error('QR Scanner error:', error);
    setQrScanResult({ error, found: false });
  };

  // Download PDF function
  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  // Print function
  const handlePrintInvoice = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/print`);
      const invoice = response.data;
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      const printContent = generatePrintHTML(invoice);
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } catch (error) {
      console.error('Error printing invoice:', error);
    }
  };

  // Generate print HTML for A5 jewelry store format with original and duplicate
  const generatePrintHTML = (invoice) => {
    const generateCopyHTML = (copyType) => {
      const itemsHTML = invoice.items.slice(0, 4).map((item) => `
        <tr>
          <td>${item.product_name.substring(0, 20)}</td>
          <td>${item.weight.toFixed(1)}g</td>
          <td>₹${item.rate_per_gram.toFixed(0)}</td>
          <td>₹${item.amount.toFixed(0)}</td>
        </tr>
      `).join('');

      // Add empty rows to fill the table
      let emptyRows = '';
      const itemCount = Math.min(invoice.items.length, 4);
      for (let i = itemCount; i < 4; i++) {
        emptyRows += '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
      }

      const totalWeight = invoice.items.reduce((sum, item) => sum + item.weight, 0);
      
      // Calculate gold price per 10g (assuming 22K as main purity)
      const goldRatePer10g = 5500 * 10; // ₹55,000 per 10g for 22K
      
      return `
        <div class="invoice-copy">
          <div class="header">
            <h1>ROUGH ESTIMATE</h1>
            <h2>${copyType}</h2>
            <h3>HARI BABU SARRAF</h3>
            <p>MOHALA CHOWK, PURANPUR</p>
          </div>
          
          <div class="customer-details">
            <table>
              <tr>
                <td class="label">NAME:</td>
                <td>${invoice.customer_name.substring(0, 15)}</td>
                <td class="label">INVOICE NO.:</td>
                <td>${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td class="label">DATE:</td>
                <td>${new Date(invoice.invoice_date).toLocaleDateString()}</td>
                <td class="label">PHONE:</td>
                <td>${invoice.customer_phone}</td>
              </tr>
            </table>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Lab Weight</th>
                <th>Rate/g</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
              ${emptyRows}
            </tbody>
          </table>
          
          <table class="totals-table">
            <tr>
              <td>Total</td>
              <td style="text-align: center;">${totalWeight.toFixed(1)} grms</td>
              <td></td>
              <td style="text-align: center;">₹${invoice.subtotal.toFixed(0)}</td>
            </tr>
            <tr>
              <td>Gold Price (22K) per 10g</td>
              <td style="text-align: center;">${goldRatePer10g.toFixed(0)}</td>
              <td></td>
              <td style="text-align: center;">₹${invoice.subtotal.toFixed(0)}</td>
            </tr>
            ${invoice.labor_charges > 0 ? `
              <tr>
                <td>Labor Charges</td>
                <td></td>
                <td></td>
                <td style="text-align: center;">₹${invoice.labor_charges.toFixed(0)}</td>
              </tr>
            ` : ''}
            <tr>
              <td>OLD GOLD</td>
              <td></td>
              <td></td>
              <td style="text-align: center;">₹${invoice.old_gold_value.toFixed(0)}</td>
            </tr>
            <tr>
              <td>OLD SILVER</td>
              <td></td>
              <td></td>
              <td style="text-align: center;">₹${invoice.old_silver_value.toFixed(0)}</td>
            </tr>
            <tr>
              <td>DISCOUNT</td>
              <td></td>
              <td></td>
              <td style="text-align: center;">₹${invoice.discount_amount.toFixed(0)}</td>
            </tr>
            ${invoice.tax_included && invoice.tax_amount > 0 ? `
              <tr>
                <td>TAX (${invoice.tax_percentage}%)</td>
                <td></td>
                <td></td>
                <td style="text-align: center;">₹${invoice.tax_amount.toFixed(0)}</td>
              </tr>
            ` : ''}
            <tr class="final-total">
              <td><strong>FINAL TOTAL</strong></td>
              <td></td>
              <td></td>
              <td style="text-align: center;"><strong>₹${invoice.total_amount.toFixed(0)}</strong></td>
            </tr>
          </table>
          
          <div class="footer">
            <table>
              <tr>
                <td class="label">FOLLOW US ON:</td>
                <td class="label">CONTACTS:</td>
              </tr>
              <tr>
                <td></td>
                <td>9690124010, 9456977703</td>
              </tr>
              <tr>
                <td>22 Carat also available</td>
                <td></td>
              </tr>
            </table>
            ${!invoice.tax_included ? '<p style="font-style: italic; margin-top: 3px; text-align: center; font-size: 7px;">*This estimate is without tax</p>' : ''}
          </div>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            @page { 
              size: A5 landscape; 
              margin: 0.2in; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              font-size: 10px;
              line-height: 1.1;
            }
            .invoice-copy {
              height: 48%;
              margin-bottom: 10px;
              padding: 5px;
              border-bottom: 2px solid #000;
            }
            .invoice-copy:last-child {
              border-bottom: none;
            }
            .header { 
              text-align: center; 
              margin-bottom: 8px; 
            }
            .header h1 { 
              font-size: 12px; 
              font-weight: bold; 
              margin: 2px 0; 
            }
            .header h2 { 
              font-size: 10px; 
              font-weight: bold; 
              margin: 2px 0; 
              text-decoration: underline;
            }
            .header h3 { 
              font-size: 11px; 
              font-weight: bold; 
              margin: 2px 0; 
            }
            .header p { 
              font-size: 8px; 
              margin: 2px 0 8px 0; 
            }
            .customer-details { 
              margin-bottom: 8px; 
            }
            .customer-details table { 
              width: 100%; 
            }
            .customer-details td { 
              padding: 1px 3px; 
              font-size: 7px; 
            }
            .customer-details .label { 
              font-weight: bold; 
              width: 60px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 5px; 
            }
            th, td { 
              border: 1px solid #000; 
              padding: 2px 3px; 
              font-size: 6px;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              text-align: center;
            }
            .items-table td:first-child { 
              text-align: left; 
            }
            .items-table td:nth-child(2),
            .items-table td:nth-child(3),
            .items-table td:nth-child(4) { 
              text-align: center; 
            }
            .totals-table { 
              margin-top: 3px; 
            }
            .totals-table td { 
              font-weight: bold; 
            }
            .final-total { 
              background-color: #f0f0f0; 
            }
            .footer { 
              margin-top: 8px; 
              font-size: 6px; 
            }
            .footer table { 
              border: none; 
            }
            .footer td { 
              border: none; 
              padding: 1px; 
            }
            .footer .label { 
              font-weight: bold; 
            }
            @media print {
              .no-print { display: none; }
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${generateCopyHTML('ORIGINAL')}
          ${generateCopyHTML('DUPLICATE')}
        </body>
      </html>
    `;
  };

  const { 
    subtotal, 
    laborCharges, 
    totalWeight, 
    subtotalWithLabor, 
    taxAmount, 
    total
  } = calculateTotal();

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Create Invoice</h1>
        
        {/* Compact Rates Display - Top Right */}
        <div className="bg-gradient-to-r from-yellow-50 to-gray-50 p-3 rounded-lg border border-yellow-200 min-w-64">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-700">💰 Current Rates</h4>
            <button
              type="button"
              onClick={fetchGoldRates}
              className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
              data-testid="refresh-invoice-rates"
            >
              🔄
            </button>
          </div>
          
          <div className="space-y-1">
            {goldRates.map((rate) => (
              <div key={rate.purity} className="flex justify-between items-center text-sm">
                <span className={`font-medium ${
                  rate.purity === 'Silver' ? 'text-gray-600' : 'text-yellow-600'
                }`}>
                  {rate.purity}:
                </span>
                <span className="font-bold text-gray-900">₹{rate.rate_per_gram.toFixed(0)}/g</span>
              </div>
            ))}
            {goldRates.length === 0 && (
              <div className="text-xs text-gray-500 italic">No rates set</div>
            )}
          </div>
        </div>
      </div>

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
            <div className="space-x-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowQRScanner(true)}
                className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-sm flex items-center gap-1"
                data-testid="scan-qr-btn"
              >
                📱 QR Input
              </button>
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

          {/* Quick QR Input */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Quick QR Input:
              </label>
              <input
                type="text"
                placeholder="Paste QR code: AB12CD567|2.5"
                className="flex-1 border border-gray-300 p-2 rounded font-mono text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleQRScan(parseQuickQR(e.target.value.trim()));
                    e.target.value = '';
                  }
                }}
                data-testid="quick-qr-input"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector('[data-testid="quick-qr-input"]');
                  if (input && input.value.trim()) {
                    const result = parseQuickQR(input.value.trim());
                    if (result) {
                      handleQRScan(result);
                      input.value = '';
                    }
                  }
                }}
                className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-sm"
                data-testid="process-quick-qr"
              >
                Add
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Paste QR code from external scanner or type manually (Format: positions 3-4 = SKU, after | = weight)
            </div>
          </div>

          {/* QR Scan Result Display */}
          {qrScanResult && (
            <div className={`mb-4 p-3 rounded border ${
              qrScanResult.found 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  {qrScanResult.found ? (
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        ✅ QR Code Scanned Successfully
                      </p>
                      <p className="text-xs text-green-700">
                        Product: {qrScanResult.productName} | SKU: {qrScanResult.sku} | Weight: {qrScanResult.weight}g
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        ❌ QR Code Scan {qrScanResult.error ? 'Error' : 'Failed'}
                      </p>
                      <p className="text-xs text-red-700">
                        {qrScanResult.error || `SKU "${qrScanResult.sku}" not found in inventory`}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setQrScanResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {invoiceItems.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No items added yet. Click "Add Item" to get started.</p>
          ) : (
            <div className="space-y-4">
              {invoiceItems.map((item, index) => {
                const product = products.find(p => p.id === item.product_id);
                const weight = item.weight || 0;
                const amount = weight * product.rate_per_gram;

                return (
                  <div key={index} className="border border-gray-200 p-3 sm:p-4 rounded" data-testid={`invoice-item-${index}`}>
                    {/* Mobile: Stack vertically, Desktop: 5 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Product</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          className="w-full border border-gray-300 p-2 sm:p-3 rounded text-sm touch-manipulation"
                          required
                          data-testid={`product-select-${index}`}
                        >
                          <option value="">Select product...</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku}) - {product.purity}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                          className="w-full border border-gray-300 p-2 sm:p-3 rounded text-sm touch-manipulation"
                          required
                          data-testid={`quantity-input-${index}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Weight (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.weight || 0}
                          onChange={(e) => updateItem(index, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 p-2 sm:p-3 rounded text-sm touch-manipulation"
                          placeholder="0.00"
                          data-testid={`weight-input-${index}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Labor Charges (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.labor_charges || 0}
                          onChange={(e) => updateItem(index, 'labor_charges', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 p-2 sm:p-3 rounded text-sm touch-manipulation"
                          placeholder="0.00"
                          data-testid={`labor-input-${index}`}
                        />
                      </div>

                      <div className="flex items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Amount (₹)</label>
                          <input
                            type="text"
                            value={`₹${amount.toFixed(2)}`}
                            className="w-full border border-gray-300 p-2 sm:p-3 rounded text-sm bg-gray-50"
                            readOnly
                            data-testid={`amount-display-${index}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="ml-2 text-red-600 hover:text-red-800 p-2 sm:p-3 min-h-[44px] touch-manipulation"
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

        {/* Additional Charges and Tax Settings */}
        <div className="mb-6 border-t pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 p-2 sm:p-3 rounded touch-manipulation"
                placeholder="0.00"
                data-testid="discount-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Old Gold Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={oldGoldValue}
                onChange={(e) => setOldGoldValue(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 p-2 sm:p-3 rounded touch-manipulation"
                placeholder="0.00"
                data-testid="old-gold-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Old Silver Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={oldSilverValue}
                onChange={(e) => setOldSilverValue(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 p-2 rounded"
                placeholder="0.00"
                data-testid="old-silver-input"
              />
            </div>
          </div>

          {/* Tax Settings */}
          <div className="mb-4">
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

            {taxIncluded && (
              <div className="mt-2">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div></div>
          <div className="md:text-right bg-gray-50 p-4 rounded">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span data-testid="subtotal-display">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal (Items):</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Weight:</span>
                <span>{totalWeight.toFixed(2)}g</span>
              </div>
              {laborCharges > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Labor Charges:</span>
                  <span data-testid="labor-display">₹{laborCharges.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span>Subtotal + Labor:</span>
                <span data-testid="subtotal-with-labor-display">₹{subtotalWithLabor.toFixed(2)}</span>
              </div>
              {taxIncluded && (
                <div className="flex justify-between">
                  <span>Tax ({taxPercentage}%):</span>
                  <span data-testid="tax-display">₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {oldGoldValue > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Old Gold:</span>
                  <span>-₹{oldGoldValue.toFixed(2)}</span>
                </div>
              )}
              {oldSilverValue > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Old Silver:</span>
                  <span>-₹{oldSilverValue.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Final Total:</span>
                <span data-testid="total-display">₹{total.toFixed(2)}</span>
              </div>
              {!taxIncluded && (
                <div className="text-sm text-green-600 italic mt-2">
                  ✓ This invoice is without tax (default)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calculation Summary - Temporarily removed during development */}

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
            {isSubmitting ? 'Creating Invoice...' : 'Create Invoice'}
          </button>
        </div>
      </form>

      {/* Invoice Actions - Show after successful creation */}
      {lastCreatedInvoice && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-green-800">✅ Invoice Created Successfully!</h3>
              <p className="text-green-700">Invoice #{lastCreatedInvoice.invoice_number} - Total: ₹{lastCreatedInvoice.total_amount.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setLastCreatedInvoice(null)}
              className="text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDownloadPDF(lastCreatedInvoice.id, lastCreatedInvoice.invoice_number)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
              data-testid="download-pdf-btn"
            >
              📄 Download PDF
            </button>
            
            <button
              onClick={() => handlePrintInvoice(lastCreatedInvoice.id)}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
              data-testid="print-invoice-btn"
            >
              🖨️ Print Invoice
            </button>
            
            <button
              onClick={() => setLastCreatedInvoice(null)}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              data-testid="create-another-btn"
            >
              ➕ Create Another Invoice
            </button>
          </div>
        </div>
      )}

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
                  placeholder="e.g., 2.5, 10.25"
                  value={newProductData.weight}
                  onChange={(e) => setNewProductData({...newProductData, weight: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-weight"
                />
                <div className="text-xs text-gray-500 mt-1">Product weight in grams</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purity *</label>
                <select
                  value={newProductData.purity}
                  onChange={(e) => handleNewProductPurityChange(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-purity"
                >
                  <option value="">Select Purity</option>
                  <option value="18K">18K Gold</option>
                  <option value="20K">20K Gold</option>
                  <option value="22K">22K Gold</option>
                  <option value="24K">24K Gold</option>
                  <option value="Silver">Silver</option>
                </select>
                {newProductData.purity && goldRates.find(rate => rate.purity === newProductData.purity) && (
                  <div className="text-xs text-green-600 mt-1">
                    Current market rate: ₹{goldRates.find(rate => rate.purity === newProductData.purity).rate_per_gram}/gram
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate per gram (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Selling price per gram"
                  value={newProductData.rate_per_gram}
                  onChange={(e) => setNewProductData({...newProductData, rate_per_gram: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded"
                  required
                  data-testid="new-product-rate"
                />
                <div className="text-xs text-gray-500 mt-1">Include making charges in this rate</div>
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

      {/* QR Code Scanner */}
      <QRCodeScanner
        isOpen={showQRScanner}
        onScan={handleQRScan}
        onError={handleQRError}
        onClose={() => setShowQRScanner(false)}
      />
    </div>
  );
};

export default CreateInvoice;