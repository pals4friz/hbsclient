import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goldRates, setGoldRates] = useState([]);

  useEffect(() => {
    fetchInvoices();
    fetchGoldRates();
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

  const generatePrintHTML = (invoice) => {
    const itemsHTML = invoice.items.map((item) => `
      <tr>
        <td>${item.product_name}</td>
        <td>₹${item.labor_charges.toFixed(0)}</td>
        <td>${item.weight.toFixed(1)}g</td>
        <td>₹${item.amount.toFixed(0)}</td>
      </tr>
    `).join('');

    // Add empty rows to fill the table
    let emptyRows = '';
    for (let i = invoice.items.length; i < 7; i++) {
      emptyRows += '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
    }

    const totalWeight = invoice.items.reduce((sum, item) => sum + item.weight, 0);
    const totalLabor = invoice.items.reduce((sum, item) => sum + item.labor_charges, 0);
    
    // Get dynamic gold price per 10g from current gold rates (22K as standard)
    const gold22KRate = goldRates.find(rate => rate.purity === '22K');
    const goldRatePer10g = gold22KRate ? (gold22KRate.rate_per_gram * 10) : 55000; // Fallback to 55000

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            @page { 
              size: A5; 
              margin: 0.3in; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              font-size: 12px;
              line-height: 1.2;
            }
            .header { 
              text-align: center; 
              margin-bottom: 15px; 
            }
            .header h1 { 
              font-size: 16px; 
              font-weight: bold; 
              margin: 5px 0; 
            }
            .header h2 { 
              font-size: 14px; 
              font-weight: bold; 
              margin: 5px 0; 
            }
            .header p { 
              font-size: 10px; 
              margin: 5px 0 15px 0; 
            }
            .customer-details { 
              margin-bottom: 15px; 
            }
            .customer-details table { 
              width: 100%; 
            }
            .customer-details td { 
              padding: 2px 5px; 
              font-size: 9px; 
            }
            .customer-details .label { 
              font-weight: bold; 
              width: 80px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 10px; 
            }
            th, td { 
              border: 1px solid #000; 
              padding: 3px 5px; 
              font-size: 8px;
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
              margin-top: 5px; 
            }
            .totals-table td { 
              font-weight: bold; 
            }
            .final-total { 
              background-color: #f0f0f0; 
            }
            .footer { 
              margin-top: 15px; 
              font-size: 8px; 
            }
            .footer table { 
              border: none; 
            }
            .footer td { 
              border: none; 
              padding: 2px; 
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
          <div class="header">
            <h1>ROUGH ESTIMATE</h1>
            <h2>HARI BABU SARRAF</h2>
            <p>MOHALA CHOWK, PURANPUR</p>
          </div>
          
          <div class="customer-details">
            <table>
              <tr>
                <td class="label">NAME:</td>
                <td>${invoice.customer_name}</td>
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
                <th>LAB</th>
                <th>Weight</th>
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
              <td style="text-align: center;">₹${totalLabor.toFixed(0)}</td>
              <td style="text-align: center;">${totalWeight.toFixed(1)}g</td>
              <td style="text-align: center;">₹${invoice.subtotal.toFixed(0)}</td>
            </tr>
            <tr>
              <td>Gold Price (22K/10g)</td>
              <td style="text-align: center;">₹${goldRatePer10g.toFixed(0)}</td>
              <td></td>
              <td style="text-align: center;">₹${invoice.subtotal.toFixed(0)}</td>
            </tr>
            <tr>
              <td>OLD GOLD</td>
              <td></td>
              <td></td>
              <td style="text-align: center;">₹${invoice.old_gold_value ? invoice.old_gold_value.toFixed(0) : '0'}</td>
            </tr>
            <tr>
              <td>OLD SILVER</td>
              <td></td>
              <td></td>
              <td style="text-align: center;">₹${invoice.old_silver_value ? invoice.old_silver_value.toFixed(0) : '0'}</td>
            </tr>
            <tr>
              <td>DISCOUNT</td>
              <td></td>
              <td></td>
              <td style="text-align: center;">₹${invoice.discount_amount ? invoice.discount_amount.toFixed(0) : '0'}</td>
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
            ${!invoice.tax_included ? '<p style="font-style: italic; margin-top: 5px; text-align: center;">*This estimate is without tax</p>' : ''}
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