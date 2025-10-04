import { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SalesReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot be after end date');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await axios.get(`${API}/sales/download`, {
        params: { start_date: startDate, end_date: endDate },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sales_Report_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert('Sales report generated and downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating sales report:', error);
      if (error.response?.status === 400) {
        alert('Invalid date format. Please use the date picker.');
      } else {
        alert('Error generating sales report. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const setQuickDate = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Sales Report Generator</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Generate Item-wise Sales Report</h2>
          <p className="text-gray-600 mb-4">
            Select a date range to generate a detailed Excel report showing item-wise sales data including 
            product names, quantities sold, weights, rates, and amounts.
          </p>
        </div>

        {/* Quick Date Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Date Ranges</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 text-sm"
              data-testid="last-7-days-btn"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(30)}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 text-sm"
              data-testid="last-30-days-btn"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(90)}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 text-sm"
              data-testid="last-90-days-btn"
            >
              Last 90 Days
            </button>
          </div>
        </div>

        <form onSubmit={handleGenerateReport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded"
                required
                data-testid="start-date-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded"
                required
                data-testid="end-date-input"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isGenerating || !startDate || !endDate}
              className={`w-full md:w-auto px-6 py-3 rounded-lg font-medium ${
                isGenerating || !startDate || !endDate
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
              data-testid="generate-report-btn"
            >
              {isGenerating ? 'Generating Report...' : 'Generate & Download Sales Report'}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Report Contents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Included Data:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Sale Date</li>
                <li>Invoice Number</li>
                <li>Product Name & SKU</li>
                <li>Quantity Sold</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Additional Details:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Weight in Grams</li>
                <li>Rate per Gram</li>
                <li>Total Amount</li>
                <li>Grand Total Summary</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReport;