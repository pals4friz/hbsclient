import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
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

  const handleDownload = async (invoiceId, invoiceNumber) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Error downloading invoice');
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
      alert('Error printing invoice');
    }
  };

  const generatePrintHTML = (invoice) => {
    const itemsHTML = invoice.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.product_name}</td>
        <td>${item.sku}</td>
        <td>${item.quantity}</td>
        <td>${item.weight.toFixed(2)}g</td>
        <td>₹${item.rate_per_gram.toFixed(2)}</td>
        <td>₹${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            .customer-details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .totals { margin-top: 20px; text-align: right; }
            .totals table { width: 300px; margin-left: auto; }
            .total-amount { font-weight: bold; font-size: 1.2em; }
            .print-only { display: block; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>💎 JEWELRY STORE</h1>
            <h2>INVOICE</h2>
          </div>
          
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
          </div>
          
          <div class="customer-details">
            <h3>Bill To:</h3>
            <p><strong>Name:</strong> ${invoice.customer_name}</p>
            <p><strong>Phone:</strong> ${invoice.customer_phone}</p>
            <p><strong>Address:</strong> ${invoice.customer_address}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Weight</th>
                <th>Rate/g</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="totals">
            <table>
              <tr>
                <td>Items Subtotal:</td>
                <td>₹${invoice.subtotal.toFixed(2)}</td>
              </tr>
              ${invoice.labor_charges > 0 ? `
                <tr>
                  <td>Labor Charges:</td>
                  <td>₹${invoice.labor_charges.toFixed(2)}</td>
                </tr>
              ` : ''}
              ${invoice.tax_included && invoice.tax_amount > 0 ? `
                <tr>
                  <td>Tax (${invoice.tax_percentage}%):</td>
                  <td>₹${invoice.tax_amount.toFixed(2)}</td>
                </tr>
              ` : ''}
              <tr class="total-amount">
                <td><strong>Total Amount:</strong></td>
                <td><strong>₹${invoice.total_amount.toFixed(2)}</strong></td>
              </tr>
            </table>
            ${!invoice.tax_included ? '<p style="font-style: italic; margin-top: 10px;">*This invoice is without tax</p>' : ''}
          </div>
          
          <div style="margin-top: 50px;">
            <p>Thank you for your business!</p>
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
                          Download Excel
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