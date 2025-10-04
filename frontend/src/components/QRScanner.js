import React, { useState, useRef, useEffect } from 'react';
import QrScanner from 'react-qr-scanner';

const QRCodeScanner = ({ onScan, onError, isOpen, onClose }) => {
  const [scanResult, setScanResult] = useState('');

  const handleScan = (data) => {
    if (data) {
      console.log('QR Code scanned:', data);
      setScanResult(data);
      
      // Parse QR code according to the format: 9 characters, 3rd and 4th are SKU, digits after "|" are weight
      try {
        const qrText = data.text || data;
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
          } else {
            onError('Invalid QR code format. Expected format: 9 characters with SKU at positions 3-4 and weight after "|"');
          }
        } else {
          onError('QR code too short or invalid format');
        }
      } catch (error) {
        console.error('Error parsing QR code:', error);
        onError('Error parsing QR code: ' + error.message);
      }
    }
  };

  const handleError = (err) => {
    console.error('QR Scanner error:', err);
    onError('Camera access error. Please allow camera permissions.');
  };

  const previewStyle = {
    height: 240,
    width: 320,
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="qr-scanner-modal">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            data-testid="close-qr-scanner"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4 text-sm text-gray-600">
          <p>Scan a jewelry item QR code</p>
          <p className="text-xs mt-1">
            Format: 9 characters (positions 3-4 = SKU) | weight
          </p>
        </div>
        
        <div className="flex justify-center mb-4">
          <div className="border-2 border-dashed border-gray-300 p-2 rounded">
            <QrScanner
              delay={300}
              style={previewStyle}
              onError={handleError}
              onScan={handleScan}
              constraints={{
                video: { facingMode: 'environment' } // Use back camera on mobile
              }}
              data-testid="qr-scanner-camera"
            />
          </div>
        </div>
        
        {scanResult && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>Last scanned:</strong> {scanResult}
            </p>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mb-4">
          <p><strong>QR Code Format Example:</strong></p>
          <p><code>AB12CD567|2.5</code></p>
          <p>• SKU: <code>12</code> (positions 3-4)</p>
          <p>• Weight: <code>2.5</code> grams (after |)</p>
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