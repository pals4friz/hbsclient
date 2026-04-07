import { useState, useEffect } from "react";
import axios from "axios";
import QRCodeScanner from "./QRScanner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Default print config
const DEFAULT_PRINT_CONFIG = {
  pageSize: 'A5',
  orientation: 'landscape',
  margins: { top: 20, bottom: 20, left: 20, right: 20 },
  copiesPerPage: 2,
  companyName: 'HARI BABU SARRAF',
  companyAddress: 'MOHALA CHOWK, PURANPUR',
  invoiceTitle: 'ROUGH ESTIMATE',
  titleFontSize: 16,
  tableHeaderColor: '#333333',
  tableHeaderTextColor: '#ffffff',
  alternateRowColor: '#f5f5f5',
  tableBorderColor: '#cccccc',
  tableFontSize: 11,
  totalsBackgroundColor: '#f9f9f9',
  finalTotalColor: '#0000aa',
  showTerms: false,
  terms: '',
  showContact: true,
  contactInfo: '9690124010, 9456977703',
  showSignature: true,
  signatureText: 'Authorized Signature'
};

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
  const [printConfig, setPrintConfig] = useState(DEFAULT_PRINT_CONFIG);
  
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
    fetchPrintConfig();
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

  const fetchPrintConfig = async () => {
    try {
      const response = await axios.get(`${API}/print-config`);
      if (response.data) {
        setPrintConfig(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.log('Using default print config');
    }
  };

  // Fetch making charges config
  const [makingChargesConfig, setMakingChargesConfig] = useState([]);
  
  const fetchMakingCharges = async () => {
    try {
      const response = await axios.get(`${API}/making-charges`);
      setMakingChargesConfig(response.data);
    } catch (error) {
      console.log('Using default making charges');
    }
  };

  useEffect(() => {
    fetchMakingCharges();
  }, []);

  // Calculate making charges based on config
  const getMakingCharges = (purity, weight) => {
    // Find matching rule from config
    const rule = makingChargesConfig.find(r => 
      r.purity === purity && 
      weight >= r.min_weight && 
      weight <= r.max_weight
    );
    
    if (rule) {
      if (rule.charge_type === 'per_gram') {
        return rule.charge_amount * weight;
      } else {
        return rule.charge_amount; // per_piece
      }
    }
    
    // Default calculation if no rule found
    if (weight <= 5.000) {
      return 500;
    } else {
      return weight * 100;
    }
  };

  const addItem = () => {
    if (invoiceItems.length >= 6) {
      alert('Maximum 6 items allowed per invoice');
      return;
    }
    setInvoiceItems([...invoiceItems, { product_id: '', quantity: 1, weight: 0, purity: '18K', labor_charges: 0, is_manual: false, manual_name: '', making_charges: 0 }]);
  };

  // Add manual entry item
  const addManualItem = () => {
    if (invoiceItems.length >= 6) {
      alert('Maximum 6 items allowed per invoice');
      return;
    }
    setInvoiceItems([...invoiceItems, { product_id: 'manual', quantity: 1, weight: 0, purity: '22K', labor_charges: 0, is_manual: true, manual_name: '', making_charges: 0 }]);
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
      const isManual = item.is_manual || item.product_id === 'manual';
      const product = !isManual ? products.find(p => p.id === item.product_id) : null;
      
      // For manual items, always calculate; for product items, need product selected
      if ((isManual || product) && item.weight && item.purity) {
        // Get rate per gram from gold rates based on selected purity
        const goldRate = goldRates.find(rate => rate.purity === item.purity);
        const ratePerGram = goldRate ? goldRate.rate_per_gram : 5500; // Default rate if purity not found
        
        const amount = item.weight * ratePerGram;
        subtotal += amount;
        totalWeight += item.weight;
        
        // For manual items with user-provided making_charges, use that; otherwise use config
        let laborCharges;
        if (isManual && item.making_charges > 0) {
          laborCharges = parseFloat(item.making_charges) || 0;
        } else {
          // Get making charges from config or use default calculation
          laborCharges = getMakingCharges(item.purity, item.weight);
        }
        totalLaborCharges += laborCharges;
      }
    });

    const subtotalWithLabor = subtotal + totalLaborCharges;
    const taxAmount = taxIncluded ? subtotalWithLabor * (taxPercentage / 100) : 0;
    
    // New calculation formula: Subtotal + Labor + Tax - Discount - (Old Gold + Old Silver) = Final Total
    const subtotalWithTax = subtotalWithLabor + taxAmount;
    const total = subtotalWithTax - parseFloat(discountAmount || 0) - parseFloat(oldGoldValue || 0) - parseFloat(oldSilverValue || 0);

    return { subtotal, laborCharges: totalLaborCharges, totalWeight, subtotalWithLabor, taxAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || invoiceItems.length === 0) {
      return;
    }

    // Validate items - for manual items, check manual_name; for product items, check product_id
    const invalidItems = invoiceItems.some(item => {
      const isManual = item.is_manual || item.product_id === 'manual';
      if (isManual) {
        return !item.manual_name || item.manual_name.trim() === '' || !item.quantity || item.weight <= 0;
      } else {
        return !item.product_id || !item.quantity;
      }
    });
    if (invalidItems) {
      alert('Please fill all required fields for each item (Item Name, Weight, Quantity)');
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
      
      // Scroll to success message on mobile
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
      
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

  // Generate print HTML for A5 jewelry store format with original and duplicate SIDE BY SIDE - FULL PAGE
  // Uses printConfig from Print Layout Configuration
  // Auto-adjusts font sizes based on item count (max 6 items)
  const generatePrintHTML = (invoice) => {
    const cfg = printConfig; // Shorthand for config
    const itemCount = Math.min(invoice.items.length, 6); // Max 6 items
    const totalWeight = invoice.items.slice(0, 6).reduce((sum, item) => sum + item.weight, 0);
    const totalLabor = invoice.items.slice(0, 6).reduce((sum, item) => sum + item.labor_charges, 0);
    
    // Auto-adjust font sizes based on number of items
    const baseFontSize = itemCount <= 3 ? 12 : itemCount <= 5 ? 11 : 10;
    const headerFontSize = itemCount <= 3 ? 18 : itemCount <= 5 ? 16 : 14;
    const titleFontSize = cfg.titleFontSize || (itemCount <= 3 ? 16 : itemCount <= 5 ? 14 : 12);
    const tableFontSize = cfg.tableFontSize || baseFontSize;
    const rowPadding = itemCount <= 3 ? '5px 6px' : itemCount <= 5 ? '4px 5px' : '3px 4px';
    const lineHeight = itemCount <= 3 ? '1.4' : itemCount <= 5 ? '1.3' : '1.2';
    
    // Get unique purities from invoice items (INCLUDING Silver)
    const allPurities = [...new Set(invoice.items.slice(0, 6)
      .filter(item => item.purity)
      .map(item => item.purity))];
    
    // Generate rates HTML for all purchased purities (per 10g for gold, per gram for silver)
    const ratesHTML = allPurities.map(purity => {
      const rate = goldRates.find(r => r.purity === purity);
      if (purity === 'Silver') {
        // Silver rate per gram
        const ratePerGram = rate ? rate.rate_per_gram : 0;
        return `<div style="margin-bottom: 1px; font-size: ${baseFontSize - 1}px;">
          <strong>Silver:</strong> ₹${ratePerGram.toFixed(0)}/g
        </div>`;
      } else {
        // Gold rate per 10g
        const ratePer10g = rate ? (rate.rate_per_gram * 10) : 0;
        return `<div style="margin-bottom: 1px; font-size: ${baseFontSize - 1}px;">
          <strong>${purity}:</strong> ₹${ratePer10g.toFixed(0)}/10g
        </div>`;
      }
    }).join('');

    const generateCopyHTML = (copyType) => {
      const itemsHTML = invoice.items.slice(0, 6).map((item, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : cfg.alternateRowColor || '#f0f0f0'};">
          <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; text-align: left; font-size: ${tableFontSize}px;">${item.product_name.substring(0, 18)}</td>
          <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; text-align: center; font-size: ${tableFontSize}px;">₹${item.labor_charges.toFixed(0)}</td>
          <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; text-align: center; font-size: ${tableFontSize}px;">${item.weight.toFixed(2)}g</td>
          <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; text-align: center; font-size: ${tableFontSize}px;">₹${item.amount.toFixed(0)}</td>
        </tr>
      `).join('');

      // Only add empty rows if less than 6 items to fill space
      let emptyRows = '';
      if (itemCount < 6) {
        for (let i = itemCount; i < 6; i++) {
          emptyRows += `<tr style="background-color: ${i % 2 === 0 ? '#ffffff' : cfg.alternateRowColor || '#f0f0f0'};"><td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; height: 18px;">&nbsp;</td><td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding};">&nbsp;</td><td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding};">&nbsp;</td><td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding};">&nbsp;</td></tr>`;
        }
      }
      
      return `
        <div style="width: 50%; height: 100%; float: left; padding: 6px; box-sizing: border-box; line-height: ${lineHeight}; ${copyType === 'ORIGINAL' ? 'border-right: 2px dashed #666;' : ''}">
          <!-- Header Section -->
          <div style="border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="font-size: ${titleFontSize}px; font-weight: bold; margin-bottom: 3px; text-align: left;">${cfg.invoiceTitle || 'ROUGH ESTIMATE'}</div>
            <div style="font-size: ${headerFontSize}px; font-weight: bold; text-decoration: underline; margin-bottom: 3px; text-align: center;">${cfg.companyName || 'HARI BABU SARRAF'}</div>
            <div style="font-size: ${baseFontSize}px; margin-bottom: 2px; text-align: center;">${cfg.companyAddress || 'MOHALA CHOWK, PURANPUR'}</div>
            ${cfg.showContact !== false ? `<div style="font-size: ${baseFontSize - 1}px; text-align: center;">📞 ${cfg.contactInfo || '9690124010, 9456977703'}</div>` : ''}
          </div>
          
          <!-- Customer Details -->
          <div style="border: 1px solid #000; padding: 4px 6px; margin-bottom: 6px; font-size: ${baseFontSize}px;">
            <div style="margin-bottom: 1px;"><strong>NAME:</strong> ${invoice.customer_name.substring(0, 22)}</div>
            <div style="margin-bottom: 1px;"><strong>DATE:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()} &nbsp; <strong>INV:</strong> ${invoice.invoice_number}</div>
            <div><strong>PHONE:</strong> ${invoice.customer_phone}</div>
          </div>
          
          <!-- Two Column Layout: Rates (Left) | Table (Right) -->
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            ${allPurities.length > 0 ? `
              <!-- Rates - Left Side -->
              <div style="width: 30%; border: 1px solid #000; padding: 4px; background-color: #fffbe6;">
                <div style="font-weight: bold; font-size: ${baseFontSize - 1}px; margin-bottom: 3px; text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 2px;">RATES</div>
                ${ratesHTML}
              </div>
            ` : ''}
            
            <!-- Items Table - Right Side -->
            <div style="flex: 1;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: ${cfg.tableHeaderColor || '#333'}; color: ${cfg.tableHeaderTextColor || '#fff'};">
                    <th style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; font-size: ${tableFontSize}px; text-align: center;">ITEM</th>
                    <th style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; font-size: ${tableFontSize}px; text-align: center;">LAB</th>
                    <th style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; font-size: ${tableFontSize}px; text-align: center;">WT</th>
                    <th style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; font-size: ${tableFontSize}px; text-align: center;">AMT</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                  ${emptyRows}
                  <tr style="background-color: ${cfg.tableHeaderColor || '#333'}; color: ${cfg.tableHeaderTextColor || '#fff'};">
                    <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; font-size: ${tableFontSize}px; text-align: center; font-weight: bold;">TOTAL</td>
                    <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; font-size: ${tableFontSize}px; text-align: center; font-weight: bold;">₹${totalLabor.toFixed(0)}</td>
                    <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; font-size: ${tableFontSize}px; text-align: center; font-weight: bold;">${totalWeight.toFixed(2)}g</td>
                    <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: ${rowPadding}; font-size: ${tableFontSize}px; text-align: center; font-weight: bold;">₹${invoice.subtotal.toFixed(0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Calculations Section - Only show fields with values -->
          <div style="border: 1px solid #000; padding: 5px; background-color: ${cfg.totalsBackgroundColor || '#f9f9f9'}; font-size: ${baseFontSize}px;">
            ${(invoice.old_gold_value > 0 || invoice.old_silver_value > 0 || invoice.discount_amount > 0 || (invoice.tax_included && invoice.tax_amount > 0)) ? `
            <table style="width: 100%; border-collapse: collapse;">
              ${invoice.old_gold_value > 0 || invoice.old_silver_value > 0 ? `
              <tr>
                ${invoice.old_gold_value > 0 ? `<td style="padding: 1px 0;">OLD GOLD:</td><td style="text-align: right; padding: 1px 0;">₹${invoice.old_gold_value.toFixed(0)}</td>` : '<td></td><td></td>'}
                <td style="width: 15px;"></td>
                ${invoice.old_silver_value > 0 ? `<td style="padding: 1px 0;">OLD SILVER:</td><td style="text-align: right; padding: 1px 0;">₹${invoice.old_silver_value.toFixed(0)}</td>` : '<td></td><td></td>'}
              </tr>
              ` : ''}
              ${invoice.discount_amount > 0 || (invoice.tax_included && invoice.tax_amount > 0) ? `
              <tr>
                ${invoice.discount_amount > 0 ? `<td style="padding: 1px 0;">DISCOUNT:</td><td style="text-align: right; padding: 1px 0;">₹${invoice.discount_amount.toFixed(0)}</td>` : '<td></td><td></td>'}
                <td></td>
                ${invoice.tax_included && invoice.tax_amount > 0 ? `<td style="padding: 1px 0;">TAX (${invoice.tax_percentage}%):</td><td style="text-align: right; padding: 1px 0;">₹${invoice.tax_amount.toFixed(0)}</td>` : '<td></td><td></td>'}
              </tr>
              ` : ''}
            </table>
            ` : ''}
            <div style="display: flex; justify-content: space-between; ${(invoice.old_gold_value > 0 || invoice.old_silver_value > 0 || invoice.discount_amount > 0 || (invoice.tax_included && invoice.tax_amount > 0)) ? 'border-top: 2px solid #000; padding-top: 4px; margin-top: 4px;' : ''} font-weight: bold; font-size: ${baseFontSize + 2}px; color: ${cfg.finalTotalColor || '#0000aa'};">
              <span>FINAL TOTAL:</span>
              <span>₹${invoice.total_amount.toFixed(0)}</span>
            </div>
          </div>
          
          ${cfg.showSignature ? `<div style="margin-top: 4px; text-align: right; font-size: ${baseFontSize - 2}px;"><div style="border-top: 1px solid #000; display: inline-block; padding-top: 2px; min-width: 80px;">${cfg.signatureText || 'Signature'}</div></div>` : ''}
          
          ${cfg.showTerms && cfg.terms ? `<div style="margin-top: 4px; font-size: ${baseFontSize - 3}px; color: #555; border-top: 1px dashed #ccc; padding-top: 3px;"><strong>Terms:</strong> ${cfg.terms}</div>` : ''}
          
          ${cfg.showBankDetails && cfg.bankDetails ? `<div style="margin-top: 3px; font-size: ${baseFontSize - 3}px; color: #333; background-color: #f0f0f0; padding: 3px; border-radius: 2px;"><strong>Bank:</strong> ${cfg.bankDetails}</div>` : ''}
          
          ${!invoice.tax_included ? `<div style="font-style: italic; margin-top: 3px; text-align: center; font-size: ${baseFontSize - 3}px;">*Estimate without tax</div>` : ''}
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
              margin: 0; 
            }
            @media print {
              html, body {
                width: 210mm;
                height: 148mm;
                margin: 0;
                padding: 0;
              }
              .no-print { display: none; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              width: 210mm;
              height: 148mm;
              font-size: 12px;
              line-height: 1.3;
            }
            .invoice-container {
              width: 100%;
              height: 100%;
              padding: 5mm;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            ${generateCopyHTML('ORIGINAL')}
            ${generateCopyHTML('DUPLICATE')}
          </div>
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
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Create Invoice</h1>
        
        {/* Compact Rates Display - Mobile: Full width, Desktop: Right side */}
        <div className="bg-gradient-to-r from-yellow-50 to-gray-50 p-3 rounded-lg border border-yellow-200 sm:min-w-64">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-700">💰 Current Rates</h4>
            <button
              type="button"
              onClick={fetchGoldRates}
              className="text-xs bg-yellow-600 text-white px-3 py-2 rounded hover:bg-yellow-700 min-h-[32px] touch-manipulation"
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

      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow">
        {/* Customer Selection */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Customer *
            </label>
            <button
              type="button"
              onClick={() => setShowNewCustomerModal(true)}
              className="px-3 py-2 bg-green-600 text-white text-xs sm:text-sm rounded hover:bg-green-700 min-h-[40px] touch-manipulation self-start sm:self-auto"
              data-testid="add-customer-btn"
            >
              + Add New Customer
            </button>
          </div>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full border border-gray-300 p-2 sm:p-3 rounded touch-manipulation"
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
                onClick={addManualItem}
                className="px-4 py-2 sm:py-3 bg-amber-600 text-white rounded hover:bg-amber-700 min-h-[44px] touch-manipulation text-sm sm:text-base font-semibold"
                data-testid="manual-entry-btn"
              >
                ✏️ Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setShowQRScanner(true)}
                className="px-4 py-2 sm:py-3 bg-purple-600 text-white rounded hover:bg-purple-700 min-h-[44px] touch-manipulation text-sm sm:text-base"
                data-testid="qr-input-btn"
              >
                📱 QR Input
              </button>
              <button
                type="button"
                onClick={() => setShowNewProductModal(true)}
                className="px-4 py-2 sm:py-3 bg-green-600 text-white rounded hover:bg-green-700 min-h-[44px] touch-manipulation text-sm sm:text-base"
                data-testid="add-product-btn"
              >
                + Add New Product
              </button>
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-2 sm:py-3 bg-blue-600 text-white rounded hover:bg-blue-700 min-h-[44px] touch-manipulation text-sm sm:text-base"
                data-testid="add-item-btn"
              >
                From Inventory
              </button>
            </div>
          </div>

          {/* Quick QR Input */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick QR Input:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Paste QR code: AB12CD567|2.5"
                  className="flex-1 border border-gray-300 p-2 sm:p-3 rounded font-mono text-sm touch-manipulation"
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
                  className="px-4 py-2 sm:py-3 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm min-h-[44px] touch-manipulation sm:min-w-[80px]"
                  data-testid="process-quick-qr"
                >
                  Add
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Paste QR code from external scanner or type manually (Format: positions 3-4 = SKU, after | = weight)
              </div>
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
            <p className="text-gray-500 text-center py-4">No items added yet. Click "✏️ Manual Entry" to add items directly or "From Inventory" to select existing products.</p>
          ) : (
            <div className="space-y-4">
              {invoiceItems.map((item, index) => {
                const isManual = item.is_manual || item.product_id === 'manual';
                const product = !isManual ? products.find(p => p.id === item.product_id) : null;
                const weight = item.weight || 0;
                
                // Calculate amount using gold rates based on selected purity
                const goldRate = goldRates.find(rate => rate.purity === item.purity);
                const ratePerGram = goldRate ? goldRate.rate_per_gram : 5500;
                const amount = weight * ratePerGram;
                
                // Calculate labor - for manual items with making_charges > 0, use that; otherwise use config
                const laborCharges = (isManual && item.making_charges > 0) 
                  ? parseFloat(item.making_charges) 
                  : getMakingCharges(item.purity, weight);

                return (
                  <div key={index} className={`border p-3 sm:p-4 rounded ${isManual ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} data-testid={`invoice-item-${index}`}>
                    {/* Manual Entry Badge */}
                    {isManual && (
                      <div className="mb-2 flex items-center">
                        <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-1 rounded">✏️ MANUAL ENTRY</span>
                      </div>
                    )}
                    
                    {/* Mobile: Stack vertically, Desktop: 6 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
                      {isManual ? (
                        /* Manual Entry - Item Name Input */
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Item Name *</label>
                          <input
                            type="text"
                            value={item.manual_name || ''}
                            onChange={(e) => updateItem(index, 'manual_name', e.target.value)}
                            className="w-full border border-amber-400 p-2 sm:p-3 rounded text-sm touch-manipulation bg-white"
                            placeholder="e.g., Gold Ring, Necklace..."
                            required
                            data-testid={`manual-name-input-${index}`}
                          />
                        </div>
                      ) : (
                        /* Product Selection from Inventory */
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
                                {product.name} ({product.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Purity</label>
                        <select
                          value={item.purity || '22K'}
                          onChange={(e) => updateItem(index, 'purity', e.target.value)}
                          className="w-full border border-gray-300 p-2 sm:p-3 rounded text-sm touch-manipulation"
                          data-testid={`purity-select-${index}`}
                        >
                          <option value="18K">18K Gold</option>
                          <option value="20K">20K Gold</option>
                          <option value="22K">22K Gold</option>
                          <option value="24K">24K Gold</option>
                          <option value="Silver">Silver</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Weight (g) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.weight || ''}
                          onChange={(e) => updateItem(index, 'weight', parseFloat(e.target.value) || 0)}
                          className={`w-full border p-2 sm:p-3 rounded text-sm touch-manipulation ${isManual ? 'border-amber-400 bg-white' : 'border-gray-300'}`}
                          placeholder="0.00"
                          required
                          data-testid={`weight-input-${index}`}
                        />
                      </div>

                      {isManual ? (
                        /* Manual Entry - Making Charges Input */
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Making Charges (₹)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={item.making_charges || ''}
                            onChange={(e) => updateItem(index, 'making_charges', parseFloat(e.target.value) || 0)}
                            className="w-full border border-amber-400 p-2 sm:p-3 rounded text-sm touch-manipulation bg-white"
                            placeholder="Enter making charges"
                            data-testid={`making-charges-input-${index}`}
                          />
                          <div className="text-xs text-amber-600 mt-1">
                            {item.making_charges > 0 ? `Custom: ₹${item.making_charges}` : `Auto: ₹${getMakingCharges(item.purity, weight).toFixed(0)}`}
                          </div>
                        </div>
                      ) : (
                        /* Product from Inventory - Auto Labor Display */
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Labor (Config)</label>
                          <input
                            type="text"
                            value={`₹${laborCharges.toFixed(0)}`}
                            className="w-full border border-gray-300 p-2 sm:p-3 rounded text-sm bg-blue-50"
                            readOnly
                            data-testid={`labor-display-${index}`}
                          />
                          <div className="text-xs text-blue-600 mt-1">
                            From config / default
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 p-2 sm:p-3 rounded text-sm touch-manipulation"
                          required
                          data-testid={`quantity-input-${index}`}
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
                className="w-full border border-gray-300 p-2 sm:p-3 rounded touch-manipulation"
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
                  className="w-full border border-gray-300 p-2 sm:p-3 rounded touch-manipulation"
                  data-testid="tax-percentage-input"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div></div>
          <div className="bg-gray-50 p-4 rounded">
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
            className={`px-6 py-3 sm:py-4 rounded-lg font-medium min-h-[48px] touch-manipulation transition-all duration-200 ${
              isSubmitting || invoiceItems.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
            } text-white`}
            data-testid="create-invoice-btn"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Creating Invoice...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                💰 Create Invoice
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Invoice Actions - Show after successful creation */}
      {lastCreatedInvoice && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="mb-3 sm:mb-0">
              <h3 className="text-lg sm:text-xl font-bold text-green-800 flex items-center gap-2">
                🎉 Invoice Created Successfully!
              </h3>
              <p className="text-green-700 font-medium">
                Invoice #{lastCreatedInvoice.invoice_number} - Total: ₹{lastCreatedInvoice.total_amount.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Form has been reset. You can create another invoice or download/print this one.
              </p>
            </div>
            <button
              onClick={() => setLastCreatedInvoice(null)}
              className="text-green-600 hover:text-green-800 self-start sm:self-auto p-2 rounded-full hover:bg-green-100 transition-colors"
              title="Close"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleDownloadPDF(lastCreatedInvoice.id, lastCreatedInvoice.invoice_number)}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium min-h-[48px] touch-manipulation"
              data-testid="download-pdf-btn"
            >
              📄 Download PDF
            </button>
            
            <button
              onClick={() => handlePrintInvoice(lastCreatedInvoice.id)}
              className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 font-medium min-h-[48px] touch-manipulation"
              data-testid="print-invoice-btn"
            >
              🖨️ Print Invoice
            </button>
            
            <button
              onClick={() => setLastCreatedInvoice(null)}
              className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium min-h-[48px] touch-manipulation"
              data-testid="create-another-btn"
            >
              ➕ Create Another
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