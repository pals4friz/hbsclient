import React, { useState, useRef, useEffect } from 'react';

const QRCodeScanner = ({ onScan, onError, isOpen, onClose }) => {
  const [scanResult, setScanResult] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Parse QR code function
  const parseQRCode = (qrText) => {
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
          onScan({ sku, weight, originalCode: qrText });
          return true;
        } else {
          onError('Invalid QR code format. Expected format: 9 characters with SKU at positions 3-4 and weight after "|"');
          return false;
        }
      } else {
        onError('QR code too short or invalid format');
        return false;
      }
    } catch (error) {
      console.error('Error parsing QR code:', error);
      onError('Error parsing QR code: ' + error.message);
      return false;
    }
  };

  // Handle manual input submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      if (parseQRCode(manualInput.trim())) {
        setManualInput('');
      }
    }
  };

  // Handle camera scanning
  const handleScan = (data) => {
    if (data) {
      console.log('QR Code scanned:', data);
      const qrText = data.text || data;
      setScanResult(qrText);
      parseQRCode(qrText);
    }
  };

  const handleError = (err) => {
    console.error('QR Scanner error:', err);
    setCameraError('Camera access failed. Use manual input below.');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="qr-scanner-modal">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">QR Code Input</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            data-testid="close-qr-scanner"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex mb-4 border-b">
          <button
            onClick={() => setUseCamera(false)}
            className={`px-4 py-2 font-medium ${!useCamera 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid="manual-input-tab"
          >
            Manual Input
          </button>
          <button
            onClick={() => {setUseCamera(true); setCameraError('');}}
            className={`px-4 py-2 font-medium ${useCamera 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid="camera-scan-tab"
          >
            Camera Scan
          </button>
        </div>

        {!useCamera ? (
          /* Manual Input Section */
          <div>
            <div className="mb-4 text-sm text-gray-600">
              <p>Enter QR code from external scanner or type manually</p>
            </div>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Content
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="AB12CD567|2.5"
                  className="w-full border border-gray-300 p-3 rounded text-center font-mono"
                  data-testid="manual-qr-input"
                />
              </div>
              
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className={`w-full py-2 px-4 rounded ${
                  manualInput.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                data-testid="process-qr-btn"
              >
                Process QR Code
              </button>
            </form>
          </div>
        ) : (
          /* Camera Scan Section */
          <div>
            <div className="mb-4 text-sm text-gray-600">
              <p>Use device camera to scan QR code</p>
            </div>
            
            {cameraError ? (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">{cameraError}</p>
                <p className="text-xs text-red-600 mt-1">Switch to "Manual Input" tab to enter QR code directly.</p>
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <div className="border-2 border-dashed border-gray-300 p-2 rounded">
                  {/* Camera scanner would go here - simplified for now */}
                  <div className="w-80 h-60 bg-gray-100 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-sm">Camera scanning not available</p>
                      <p className="text-xs">Use Manual Input tab instead</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {scanResult && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  <strong>Last scanned:</strong> {scanResult}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Format Information */}
        <div className="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded">
          <p><strong>QR Code Format Example:</strong></p>
          <p><code className="bg-white px-1 rounded">AB12CD567|2.5</code></p>
          <p>• Characters 3-4: SKU (<code>12</code>)</p>
          <p>• After "|": Weight in grams (<code>2.5</code>)</p>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            data-testid="cancel-qr-scan"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;