// DocumentConfig.js - Configuration panel for document upload node
import React, { useState } from 'react';

const DocumentConfig = ({ node, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    allowedFileTypes: node.data?.config?.allowedFileTypes || ['.pdf', '.docx', '.txt'],
    maxFileSize: node.data?.config?.maxFileSize || 10,
    allowMultiple: node.data?.config?.allowMultiple !== false, // default to true
    extractText: node.data?.config?.extractText !== false, // default to true
    useForRag: node.data?.config?.useForRag !== false, // default to true
    storagePrefix: node.data?.config?.storagePrefix || 'documents',
    generateThumbnails: node.data?.config?.generateThumbnails !== false // default to true
  });

  const [fileTypeInput, setFileTypeInput] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              name === 'maxFileSize' ? parseInt(value, 10) : value
    }));
  };

  const addFileType = () => {
    if (fileTypeInput && !formData.allowedFileTypes.includes(fileTypeInput)) {
      setFormData(prev => ({
        ...prev,
        allowedFileTypes: [...prev.allowedFileTypes, fileTypeInput]
      }));
      setFileTypeInput('');
    }
  };

  const removeFileType = (fileType) => {
    setFormData(prev => ({
      ...prev,
      allowedFileTypes: prev.allowedFileTypes.filter(type => type !== fileType)
    }));
  };

  const handleSubmit = () => {
    // Create label for the node
    const label = `Document Upload (${formData.allowedFileTypes.length} types)`;
    
    // Save the configuration
    onSave({
      ...formData,
      label
    });
  };

  return (
    <div className="w-96 border-l border-gray-200 bg-white shadow-xl p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Configure Document Upload</h2>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* File Types */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Allowed File Types</h3>
          
          <div className="flex mb-2">
            <input
              type="text"
              value={fileTypeInput}
              onChange={(e) => setFileTypeInput(e.target.value)}
              placeholder=".pdf"
              className="flex-1 rounded-l-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={addFileType}
              className="rounded-r-md border border-l-0 border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
            >
              Add
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-md p-3 mb-3">
            <div className="flex flex-wrap gap-2">
              {formData.allowedFileTypes.map((fileType, index) => (
                <div key={index} className="flex items-center bg-white px-2 py-1 rounded border border-gray-200">
                  <span className="text-xs mr-1">{fileType}</span>
                  <button
                    type="button"
                    onClick={() => removeFileType(fileType)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              {formData.allowedFileTypes.length === 0 && (
                <p className="text-xs text-gray-500">No file types added</p>
              )}
            </div>
          </div>
        </div>
        
        {/* File Upload Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Upload Settings</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
            <input
              type="number"
              name="maxFileSize"
              value={formData.maxFileSize}
              onChange={handleInputChange}
              min="1"
              max="100"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Prefix</label>
            <input
              type="text"
              name="storagePrefix"
              value={formData.storagePrefix}
              onChange={handleInputChange}
              placeholder="documents"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">S3 path prefix for uploaded files</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowMultiple"
                name="allowMultiple"
                checked={formData.allowMultiple}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="allowMultiple" className="ml-2 block text-sm text-gray-700">
                Allow multiple file uploads
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="extractText"
                name="extractText"
                checked={formData.extractText}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="extractText" className="ml-2 block text-sm text-gray-700">
                Extract text from documents (OCR)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useForRag"
                name="useForRag"
                checked={formData.useForRag}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="useForRag" className="ml-2 block text-sm text-gray-700">
                Use documents for RAG context
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="generateThumbnails"
                name="generateThumbnails"
                checked={formData.generateThumbnails}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="generateThumbnails" className="ml-2 block text-sm text-gray-700">
                Generate thumbnails for documents
              </label>
            </div>
          </div>
        </div>
        
        {/* Submit & Cancel Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentConfig;