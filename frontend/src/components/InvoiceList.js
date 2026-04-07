import { useState, useEffect } from "react";
import axios from "axios";

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

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goldRates, setGoldRates] = useState([]);
  const [printConfig, setPrintConfig] = useState(DEFAULT_PRINT_CONFIG);

  useEffect(() => {
    fetchInvoices();
    fetchGoldRates();
    fetchPrintConfig();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
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

  const handleDownload = async (invoiceId, invoiceNumber) => {
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
      console.error('Error downloading invoice:', error);
    }
  };

  const handlePrint = async (invoiceId) => {
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
  const generatePrintHTML = (invoice) => {
    const cfg = printConfig; // Shorthand for config
    const totalWeight = invoice.items.reduce((sum, item) => sum + item.weight, 0);
    const totalLabor = invoice.items.reduce((sum, item) => sum + item.labor_charges, 0);
    
    // Get unique purities from invoice items (only gold items, not silver)
    const goldPurities = [...new Set(invoice.items
      .filter(item => item.purity && item.purity !== 'Silver')
      .map(item => item.purity))];
    
    // Generate gold prices HTML for only purchased purities (per 10g)
    const goldPricesHTML = goldPurities.map(purity => {
      const goldRate = goldRates.find(rate => rate.purity === purity);
      const ratePer10g = goldRate ? (goldRate.rate_per_gram * 10) : 0;
      return `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>${purity} Gold (10g):</span>
        <span>₹${ratePer10g.toFixed(0)}</span>
      </div>`;
    }).join('');

    const generateCopyHTML = (copyType) => {
      const itemsHTML = invoice.items.slice(0, 6).map((item, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : cfg.alternateRowColor || '#f0f0f0'};">
          <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 4px 6px; text-align: left; font-size: ${cfg.tableFontSize || 11}px;">${item.product_name.substring(0, 20)}</td>
          <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 4px 6px; text-align: center; font-size: ${cfg.tableFontSize || 11}px;">₹${item.labor_charges.toFixed(0)}</td>
          <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 4px 6px; text-align: center; font-size: ${cfg.tableFontSize || 11}px;">${item.weight.toFixed(2)}g</td>
          <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 4px 6px; text-align: center; font-size: ${cfg.tableFontSize || 11}px;">₹${item.amount.toFixed(0)}</td>
        </tr>
      `).join('');

      // Add empty rows if less than 6 items
      let emptyRows = '';
      const itemCount = Math.min(invoice.items.length, 6);
      for (let i = itemCount; i < 6; i++) {
        emptyRows += `<tr style="background-color: ${i % 2 === 0 ? '#ffffff' : cfg.alternateRowColor || '#f0f0f0'};"><td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 4px 6px; height: 20px;">&nbsp;</td><td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 4px 6px;">&nbsp;</td><td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 4px 6px;">&nbsp;</td><td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 4px 6px;">&nbsp;</td></tr>`;
      }
      
      return `
        <div style="width: 50%; height: 100%; float: left; padding: 8px; box-sizing: border-box; ${copyType === 'ORIGINAL' ? 'border-right: 2px dashed #666;' : ''}">
          <!-- Copy Type Label -->
          <div style="text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 6px; text-decoration: underline;">${copyType}</div>
          
          <!-- Header Section -->
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px;">
            <div style="font-size: ${cfg.titleFontSize || 16}px; font-weight: bold; margin-bottom: 4px;">${cfg.invoiceTitle || 'ROUGH ESTIMATE'}</div>
            <div style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 4px;">${cfg.companyName || 'HARI BABU SARRAF'}</div>
            <div style="font-size: 12px; margin-bottom: 3px;">${cfg.companyAddress || 'MOHALA CHOWK, PURANPUR'}</div>
            ${cfg.showContact !== false ? `<div style="font-size: 11px;">📞 ${cfg.contactInfo || '9690124010, 9456977703'}</div>` : ''}
          </div>
          
          <!-- Customer Details -->
          <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px; font-size: 11px;">
            <div style="margin-bottom: 2px;"><strong>NAME:</strong> ${invoice.customer_name.substring(0, 25)}</div>
            <div style="margin-bottom: 2px;"><strong>DATE:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</div>
            <div style="margin-bottom: 2px;"><strong>INV NO.:</strong> ${invoice.invoice_number}</div>
            <div><strong>PHONE:</strong> ${invoice.customer_phone}</div>
          </div>
          
          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <thead>
              <tr style="background-color: ${cfg.tableHeaderColor || '#333'}; color: ${cfg.tableHeaderTextColor || '#fff'};">
                <th style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 5px; font-size: ${cfg.tableFontSize || 11}px; text-align: center; width: 40%;">ITEM NAME</th>
                <th style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 5px; font-size: ${cfg.tableFontSize || 11}px; text-align: center; width: 20%;">LAB</th>
                <th style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 5px; font-size: ${cfg.tableFontSize || 11}px; text-align: center; width: 20%;">WEIGHT</th>
                <th style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 5px; font-size: ${cfg.tableFontSize || 11}px; text-align: center; width: 20%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
              ${emptyRows}
              <!-- Totals Row -->
              <tr style="background-color: ${cfg.tableHeaderColor || '#333'}; color: ${cfg.tableHeaderTextColor || '#fff'};">
                <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 5px; font-size: ${cfg.tableFontSize || 11}px; text-align: center; font-weight: bold;">TOTAL</td>
                <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 5px; font-size: ${cfg.tableFontSize || 11}px; text-align: center; font-weight: bold;">₹${totalLabor.toFixed(0)}</td>
                <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 5px; font-size: ${cfg.tableFontSize || 11}px; text-align: center; font-weight: bold;">${totalWeight.toFixed(2)}g</td>
                <td style="border: 1px solid ${cfg.tableBorderColor || '#000'}; padding: 5px; font-size: ${cfg.tableFontSize || 11}px; text-align: center; font-weight: bold;">₹${invoice.subtotal.toFixed(0)}</td>
              </tr>
            </tbody>
          </table>
          
          <!-- Totals Section -->
          <div style="border: 1px solid #000; padding: 8px; background-color: ${cfg.totalsBackgroundColor || '#f9f9f9'}; font-size: 11px;">
            ${goldPurities.length > 0 ? `
              <div style="border-bottom: 1px solid #999; padding-bottom: 4px; margin-bottom: 4px;">
                <div style="font-weight: bold; font-size: 10px; margin-bottom: 3px; color: #666;">GOLD RATES (per 10g):</div>
                ${goldPricesHTML}
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>OLD GOLD:</span>
              <span>₹${invoice.old_gold_value ? invoice.old_gold_value.toFixed(0) : '0'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>OLD SILVER:</span>
              <span>₹${invoice.old_silver_value ? invoice.old_silver_value.toFixed(0) : '0'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>DISCOUNT:</span>
              <span>₹${invoice.discount_amount ? invoice.discount_amount.toFixed(0) : '0'}</span>
            </div>
            ${invoice.tax_included && invoice.tax_amount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span>TAX (${invoice.tax_percentage}%):</span>
                <span>₹${invoice.tax_amount.toFixed(0)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #999; padding-top: 4px; margin-top: 4px;">
              <span>Total Weight:</span>
              <span>${totalWeight.toFixed(2)}g</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 13px; color: ${cfg.finalTotalColor || '#0000aa'};">
              <span>FINAL TOTAL:</span>
              <span>₹${invoice.total_amount.toFixed(0)}</span>
            </div>
          </div>
          
          ${cfg.showTerms && cfg.terms ? `<div style="font-size: 8px; margin-top: 4px; color: #666;">${cfg.terms}</div>` : ''}
          ${cfg.showSignature ? `<div style="margin-top: 8px; text-align: right; font-size: 9px;"><div style="border-top: 1px solid #000; display: inline-block; padding-top: 3px; min-width: 100px;">${cfg.signatureText || 'Authorized Signature'}</div></div>` : ''}
          ${!invoice.tax_included ? '<div style="font-style: italic; margin-top: 5px; text-align: center; font-size: 9px;">*This estimate is without tax</div>' : ''}
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Invoice History</h1>

      {invoices.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No invoices found. Create your first invoice to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full" data-testid="invoices-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>
                        <div className="font-medium">{invoice.customer_name}</div>
                        <div className="text-xs text-gray-400">{invoice.customer_phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {invoice.items.length} item{invoice.items.length > 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{invoice.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                          data-testid={`download-invoice-${invoice.id}`}
                        >
                          Download PDF
                        </button>
                        <button
                          onClick={() => handlePrint(invoice.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
                          data-testid={`print-invoice-${invoice.id}`}
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;