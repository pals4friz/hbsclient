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
            ${((invoice.old_gold_value || 0) > 0 || (invoice.old_silver_value || 0) > 0 || (invoice.discount_amount || 0) > 0 || (invoice.tax_included && invoice.tax_amount > 0)) ? `
            <table style="width: 100%; border-collapse: collapse;">
              ${(invoice.old_gold_value || 0) > 0 || (invoice.old_silver_value || 0) > 0 ? `
              <tr>
                ${(invoice.old_gold_value || 0) > 0 ? `<td style="padding: 1px 0;">OLD GOLD:</td><td style="text-align: right; padding: 1px 0;">₹${invoice.old_gold_value.toFixed(0)}</td>` : '<td></td><td></td>'}
                <td style="width: 15px;"></td>
                ${(invoice.old_silver_value || 0) > 0 ? `<td style="padding: 1px 0;">OLD SILVER:</td><td style="text-align: right; padding: 1px 0;">₹${invoice.old_silver_value.toFixed(0)}</td>` : '<td></td><td></td>'}
              </tr>
              ` : ''}
              ${(invoice.discount_amount || 0) > 0 || (invoice.tax_included && invoice.tax_amount > 0) ? `
              <tr>
                ${(invoice.discount_amount || 0) > 0 ? `<td style="padding: 1px 0;">DISCOUNT:</td><td style="text-align: right; padding: 1px 0;">₹${invoice.discount_amount.toFixed(0)}</td>` : '<td></td><td></td>'}
                <td></td>
                ${invoice.tax_included && invoice.tax_amount > 0 ? `<td style="padding: 1px 0;">TAX (${invoice.tax_percentage}%):</td><td style="text-align: right; padding: 1px 0;">₹${invoice.tax_amount.toFixed(0)}</td>` : '<td></td><td></td>'}
              </tr>
              ` : ''}
            </table>
            ` : ''}
            <div style="display: flex; justify-content: space-between; ${((invoice.old_gold_value || 0) > 0 || (invoice.old_silver_value || 0) > 0 || (invoice.discount_amount || 0) > 0 || (invoice.tax_included && invoice.tax_amount > 0)) ? 'border-top: 2px solid #000; padding-top: 4px; margin-top: 4px;' : ''} font-weight: bold; font-size: ${baseFontSize + 2}px; color: ${cfg.finalTotalColor || '#0000aa'};">
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