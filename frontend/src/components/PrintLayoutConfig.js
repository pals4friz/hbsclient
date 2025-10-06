import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PrintLayoutConfig = () => {
  const [config, setConfig] = useState({
    // Page Settings
    pageSize: 'A5', // A4, A5, Letter, Custom
    orientation: 'landscape', // portrait, landscape
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    copiesPerPage: 2, // 1 (single), 2 (original + duplicate)
    
    // Header Settings
    companyName: 'HARI BABU SARRAF',
    companyAddress: 'MOHALA CHOWK, PURANPUR',
    showLogo: false,
    logoPosition: 'left', // left, center, right
    headerBackgroundColor: '#ffffff',
    headerTextColor: '#000000',
    companyNameFontSize: 14,
    addressFontSize: 10,
    
    // Invoice Title
    invoiceTitle: 'ROUGH ESTIMATE',
    titleFontSize: 16,
    titleColor: '#000000',
    titlePosition: 'center', // left, center, right
    
    // Table Settings
    tableStyle: 'modern', // basic, modern, elegant, minimal
    tableHeaderColor: '#333333',
    tableHeaderTextColor: '#ffffff',
    alternateRowColor: '#f5f5f5',
    tableBorderColor: '#cccccc',
    tableBorderWidth: 1,
    cellPadding: 5,
    
    // Table Columns
    columns: [
      { name: 'itemName', label: 'ITEM NAME', width: 150, show: true },
      { name: 'labor', label: 'LAB', width: 80, show: true },
      { name: 'weight', label: 'WEIGHT', width: 80, show: true },
      { name: 'amount', label: 'AMOUNT', width: 100, show: true }
    ],
    
    // Font Settings
    defaultFont: 'Helvetica',
    tableFontSize: 8,
    headerFontSize: 9,
    
    // Totals Section
    totalsPosition: 'right', // left, right, full-width
    totalsBackgroundColor: '#f9f9f9',
    finalTotalHighlight: true,
    finalTotalColor: '#2563eb',
    
    // Footer Settings
    showTerms: true,
    terms: 'Terms & Conditions: All sales are final. Prices subject to change.',
    showBankDetails: true,
    bankDetails: 'Bank: State Bank of India | A/C: 1234567890 | IFSC: SBIN0001234',
    showContact: true,
    contactInfo: 'Contact: 9690124010, 9456977703',
    footerFontSize: 7,
    
    // Colors & Branding
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    
    // Additional Elements
    showQRCode: false,
    showSignature: true,
    signatureText: 'Authorized Signature',
    watermark: '',
    showPageNumbers: false
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSavedConfig();
  }, []);

  // Auto-refresh preview when config changes
  useEffect(() => {
    if (previewMode) {
      // Force re-render of preview when config changes
      const timer = setTimeout(() => {
        // This will trigger a re-render with the new config
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [config, previewMode]);

  const loadSavedConfig = async () => {
    try {
      const response = await axios.get(`${API}/print-config`);
      if (response.data) {
        setConfig(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.log('No saved config found, using defaults');
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await axios.post(`${API}/print-config`, config);
      alert('Print layout configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (section, field, value) => {
    if (section) {
      setConfig(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: value }
      }));
    } else {
      setConfig(prev => ({ ...prev, [field]: value }));
    }
  };

  const updateColumn = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const resetToDefaults = () => {
    if (window.confirm('Reset all settings to default values?')) {
      window.location.reload();
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Print Layout Configuration</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 min-h-[44px] touch-manipulation"
          >
            {previewMode ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 min-h-[44px] touch-manipulation"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 min-h-[44px] touch-manipulation"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          
          {/* Page Settings */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">📄 Page Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Page Size</label>
                <select
                  value={config.pageSize}
                  onChange={(e) => updateConfig(null, 'pageSize', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Orientation</label>
                <select
                  value={config.orientation}
                  onChange={(e) => updateConfig(null, 'orientation', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Copies per Page</label>
                <select
                  value={config.copiesPerPage}
                  onChange={(e) => updateConfig(null, 'copiesPerPage', parseInt(e.target.value))}
                  className="w-full border rounded p-2 touch-manipulation"
                >
                  <option value={1}>Single Copy</option>
                  <option value={2}>Original + Duplicate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header Settings */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">🏢 Header Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Company Name</label>
                <input
                  type="text"
                  value={config.companyName}
                  onChange={(e) => updateConfig(null, 'companyName', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Company Address</label>
                <textarea
                  value={config.companyAddress}
                  onChange={(e) => updateConfig(null, 'companyAddress', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                  rows="2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name Font Size</label>
                  <input
                    type="number"
                    value={config.companyNameFontSize}
                    onChange={(e) => updateConfig(null, 'companyNameFontSize', parseInt(e.target.value))}
                    className="w-full border rounded p-2 touch-manipulation"
                    min="8" max="24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address Font Size</label>
                  <input
                    type="number"
                    value={config.addressFontSize}
                    onChange={(e) => updateConfig(null, 'addressFontSize', parseInt(e.target.value))}
                    className="w-full border rounded p-2 touch-manipulation"
                    min="6" max="18"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Title */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">📋 Invoice Title</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title Text</label>
                <input
                  type="text"
                  value={config.invoiceTitle}
                  onChange={(e) => updateConfig(null, 'invoiceTitle', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Font Size</label>
                  <input
                    type="number"
                    value={config.titleFontSize}
                    onChange={(e) => updateConfig(null, 'titleFontSize', parseInt(e.target.value))}
                    className="w-full border rounded p-2 touch-manipulation"
                    min="10" max="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Position</label>
                  <select
                    value={config.titlePosition}
                    onChange={(e) => updateConfig(null, 'titlePosition', e.target.value)}
                    className="w-full border rounded p-2 touch-manipulation"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Table Settings */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">📊 Table Design</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Table Style</label>
                <select
                  value={config.tableStyle}
                  onChange={(e) => updateConfig(null, 'tableStyle', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                >
                  <option value="basic">Basic</option>
                  <option value="modern">Modern</option>
                  <option value="elegant">Elegant</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Header Background</label>
                  <input
                    type="color"
                    value={config.tableHeaderColor}
                    onChange={(e) => updateConfig(null, 'tableHeaderColor', e.target.value)}
                    className="w-full border rounded p-1 h-10 touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Header Text Color</label>
                  <input
                    type="color"
                    value={config.tableHeaderTextColor}
                    onChange={(e) => updateConfig(null, 'tableHeaderTextColor', e.target.value)}
                    className="w-full border rounded p-1 h-10 touch-manipulation"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Alternate Row Color</label>
                <input
                  type="color"
                  value={config.alternateRowColor}
                  onChange={(e) => updateConfig(null, 'alternateRowColor', e.target.value)}
                  className="w-full border rounded p-1 h-10 touch-manipulation"
                />
              </div>
            </div>
          </div>

          {/* Table Columns */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">📋 Table Columns</h3>
            <div className="space-y-3">
              {config.columns.map((column, index) => (
                <div key={index} className="border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={column.show}
                        onChange={(e) => updateColumn(index, 'show', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="font-medium">{column.label}</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={column.label}
                      onChange={(e) => updateColumn(index, 'label', e.target.value)}
                      className="border rounded p-1 text-sm touch-manipulation"
                      placeholder="Column Label"
                    />
                    <input
                      type="number"
                      value={column.width}
                      onChange={(e) => updateColumn(index, 'width', parseInt(e.target.value))}
                      className="border rounded p-1 text-sm touch-manipulation"
                      placeholder="Width"
                      min="30" max="200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Settings */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">🔻 Footer Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.showTerms}
                  onChange={(e) => updateConfig(null, 'showTerms', e.target.checked)}
                  className="mr-2"
                />
                <span>Show Terms & Conditions</span>
              </label>
              {config.showTerms && (
                <textarea
                  value={config.terms}
                  onChange={(e) => updateConfig(null, 'terms', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                  rows="3"
                  placeholder="Terms & Conditions"
                />
              )}
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.showBankDetails}
                  onChange={(e) => updateConfig(null, 'showBankDetails', e.target.checked)}
                  className="mr-2"
                />
                <span>Show Bank Details</span>
              </label>
              {config.showBankDetails && (
                <textarea
                  value={config.bankDetails}
                  onChange={(e) => updateConfig(null, 'bankDetails', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                  rows="2"
                  placeholder="Bank Details"
                />
              )}
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.showContact}
                  onChange={(e) => updateConfig(null, 'showContact', e.target.checked)}
                  className="mr-2"
                />
                <span>Show Contact Information</span>
              </label>
              {config.showContact && (
                <input
                  type="text"
                  value={config.contactInfo}
                  onChange={(e) => updateConfig(null, 'contactInfo', e.target.value)}
                  className="w-full border rounded p-2 touch-manipulation"
                  placeholder="Contact Information"
                />
              )}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {previewMode && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">👁️ Live Preview</h3>
            <div className="border-2 border-gray-300 bg-white overflow-auto" style={{minHeight: '600px'}}>
              <div 
                className="p-4"
                style={{
                  fontSize: `${config.tableFontSize}px`,
                  fontFamily: config.defaultFont,
                  transform: config.pageSize === 'A4' ? 'scale(0.6)' : 'scale(0.7)',
                  transformOrigin: 'top left',
                  width: config.orientation === 'landscape' ? '210mm' : '148mm',
                  height: config.orientation === 'landscape' ? '148mm' : '210mm',
                  margin: '0 auto',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                {config.copiesPerPage === 2 ? (
                  // Side by side layout for A5 landscape
                  <div className="grid grid-cols-2 gap-2 h-full">
                    {/* ORIGINAL COPY */}
                    <div className="border-r border-dashed border-gray-400 pr-2">
                      <div className="text-center text-xs font-bold mb-2">ORIGINAL</div>
                      {/* Compact Header for A5 */}
                      <div 
                        className="text-center mb-3"
                        style={{ 
                          backgroundColor: config.headerBackgroundColor,
                          color: config.headerTextColor,
                          padding: '6px',
                          borderRadius: '2px',
                          borderBottom: '1px solid #333'
                        }}
                      >
                        <div 
                          style={{ 
                            fontSize: `${config.titleFontSize - 2}px`,
                            fontWeight: 'bold',
                            marginBottom: '2px'
                          }}
                        >
                          {config.invoiceTitle}
                        </div>
                        
                        <div 
                          style={{ 
                            fontSize: `${config.companyNameFontSize - 2}px`,
                            fontWeight: 'bold',
                            marginBottom: '2px',
                            textDecoration: 'underline'
                          }}
                        >
                          {config.companyName}
                        </div>
                        
                        <div style={{ fontSize: `${config.addressFontSize - 1}px` }}>
                          {config.companyAddress}
                        </div>
                        
                        {config.showContact && (
                          <div style={{ fontSize: `${config.footerFontSize}px`, marginTop: '2px' }}>
                            📞 9690124010, 9456977703
                          </div>
                        )}
                      </div>

                {/* Customer & Invoice Details */}
                <div className="mb-6 p-3 border" style={{ borderColor: config.tableBorderColor }}>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="mb-2"><strong>NAME:</strong> Sample Customer Name</div>
                      <div className="mb-2"><strong>DATE:</strong> {new Date().toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="mb-2"><strong>INVOICE NO.:</strong> INV-20240115-001</div>
                      <div className="mb-2"><strong>PHONE:</strong> 9876543210</div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: `${config.tableFontSize + 2}px` }}>
                    <thead>
                      <tr 
                        style={{ 
                          backgroundColor: config.tableHeaderColor,
                          color: config.tableHeaderTextColor
                        }}
                      >
                        {config.columns.filter(col => col.show).map((column, index) => (
                          <th 
                            key={index}
                            className="border p-2 text-center font-bold"
                            style={{ 
                              borderColor: config.tableBorderColor,
                              fontSize: `${config.headerFontSize + 1}px`,
                              padding: `${config.cellPadding + 2}px`,
                              borderWidth: `${config.tableBorderWidth}px`
                            }}
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Sample Row 1 */}
                      <tr style={{ backgroundColor: 'white' }}>
                        {config.columns.filter(col => col.show).map((column, index) => (
                          <td 
                            key={index}
                            className="border p-2"
                            style={{ 
                              borderColor: config.tableBorderColor,
                              padding: `${config.cellPadding + 2}px`,
                              textAlign: column.name === 'itemName' ? 'left' : 'center',
                              borderWidth: `${config.tableBorderWidth}px`
                            }}
                          >
                            {column.name === 'itemName' ? 'Gold Ring 22K' :
                             column.name === 'labor' ? '₹500' :
                             column.name === 'weight' ? '10.5 grms' :
                             column.name === 'amount' ? '₹58,250' : 'N/A'}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Sample Row 2 */}
                      <tr style={{ backgroundColor: config.alternateRowColor }}>
                        {config.columns.filter(col => col.show).map((column, index) => (
                          <td 
                            key={index}
                            className="border p-2"
                            style={{ 
                              borderColor: config.tableBorderColor,
                              padding: `${config.cellPadding + 2}px`,
                              textAlign: column.name === 'itemName' ? 'left' : 'center',
                              borderWidth: `${config.tableBorderWidth}px`
                            }}
                          >
                            {column.name === 'itemName' ? 'Gold Necklace 22K' :
                             column.name === 'labor' ? '₹2,500' :
                             column.name === 'weight' ? '25.0 grms' :
                             column.name === 'amount' ? '₹1,40,000' : 'N/A'}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Total Row */}
                      <tr style={{ backgroundColor: config.tableHeaderColor, color: config.tableHeaderTextColor }}>
                        <td 
                          className="border p-2 font-bold text-center"
                          style={{ 
                            borderColor: config.tableBorderColor,
                            padding: `${config.cellPadding + 2}px`,
                            borderWidth: `${config.tableBorderWidth}px`
                          }}
                        >
                          TOTAL
                        </td>
                        <td 
                          className="border p-2 font-bold text-center"
                          style={{ 
                            borderColor: config.tableBorderColor,
                            padding: `${config.cellPadding + 2}px`,
                            borderWidth: `${config.tableBorderWidth}px`
                          }}
                        >
                          ₹3,000
                        </td>
                        <td 
                          className="border p-2 font-bold text-center"
                          style={{ 
                            borderColor: config.tableBorderColor,
                            padding: `${config.cellPadding + 2}px`,
                            borderWidth: `${config.tableBorderWidth}px`
                          }}
                        >
                          35.5 grms
                        </td>
                        <td 
                          className="border p-2 font-bold text-center"
                          style={{ 
                            borderColor: config.tableBorderColor,
                            padding: `${config.cellPadding + 2}px`,
                            borderWidth: `${config.tableBorderWidth}px`
                          }}
                        >
                          ₹1,98,250
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Section - Jewelry Business Style */}
                <div className="mb-6">
                  <div 
                    className={`${config.totalsPosition === 'right' ? 'ml-auto' : ''} p-4 border`}
                    style={{ 
                      backgroundColor: config.totalsBackgroundColor,
                      maxWidth: config.totalsPosition === 'right' ? '300px' : '100%',
                      borderColor: config.tableBorderColor,
                      fontSize: `${config.tableFontSize + 1}px`
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between border-b pb-1" style={{ borderColor: config.tableBorderColor }}>
                        <span className="font-semibold">GOLD PRICE (22K per 10g):</span>
                        <span>₹55,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>OLD GOLD:</span>
                        <span>₹15,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>OLD SILVER:</span>
                        <span>₹3,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DISCOUNT:</span>
                        <span>₹2,000</span>
                      </div>
                      <div className="flex justify-between border-t pt-1" style={{ borderColor: config.tableBorderColor }}>
                        <span>Total Weight:</span>
                        <span>35.5 grms</span>
                      </div>
                      <div 
                        className={`flex justify-between font-bold text-lg border-t-2 pt-2 ${config.finalTotalHighlight ? 'bg-gray-100' : ''}`}
                        style={{ 
                          color: config.finalTotalHighlight ? config.finalTotalColor : 'inherit',
                          borderColor: config.tableBorderColor,
                          padding: '8px',
                          margin: '8px -8px -8px -8px'
                        }}
                      >
                        <span>FINAL TOTAL:</span>
                        <span>₹1,78,250</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 text-xs">
                  {config.showContact && (
                    <div className="mb-1" style={{ fontSize: `${config.footerFontSize}px` }}>
                      {config.contactInfo}
                    </div>
                  )}
                  {config.showBankDetails && (
                    <div className="mb-1" style={{ fontSize: `${config.footerFontSize}px` }}>
                      {config.bankDetails}
                    </div>
                  )}
                  {config.showTerms && (
                    <div style={{ fontSize: `${config.footerFontSize}px` }}>
                      {config.terms}
                    </div>
                  )}
                  {config.showSignature && (
                    <div className="text-right mt-4" style={{ fontSize: `${config.footerFontSize}px` }}>
                      {config.signatureText}
                    </div>
                  )}
                </div>

              </div>
              
              {/* Show second copy if enabled */}
              {config.copiesPerPage === 2 && (
                <div className="border-t-2 border-dashed border-gray-400 my-4">
                  <div className="text-center text-sm font-semibold text-gray-600 p-2">
                    DUPLICATE COPY (Same as above)
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintLayoutConfig;