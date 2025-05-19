// OutputConfig.js - Configuration panel for chatbot output node
import React, { useState } from 'react';

const OutputConfig = ({ node, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: node.data?.config?.name || '',
    description: node.data?.config?.description || '',
    greeting: node.data?.config?.greeting || 'Hello! How can I help you today?',
    maxTokens: node.data?.config?.maxTokens || 1000,
    temperature: node.data?.config?.temperature || 0.7,
    model: node.data?.config?.model || 'gpt-3.5-turbo',
    preserveHistory: node.data?.config?.preserveHistory !== false // default to true
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = () => {
    // Create label for the node based on the name
    const label = `Chatbot: ${formData.name || 'Output'}`;
    
    // Save the configuration
    onSave({
      ...formData,
      label
    });
  };

  return (
    <div className="w-96 border-l border-gray-200 bg-white shadow-xl p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Configure Chatbot Output</h2>
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
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Basic Information</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="My Assistant"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="2"
              placeholder="A helpful AI assistant that answers questions about our products."
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
            <input
              type="text"
              name="greeting"
              value={formData.greeting}
              onChange={handleInputChange}
              placeholder="Hello! How can I help you today?"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Model Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Model Settings</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Language Model</label>
            <select
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Standard)</option>
              <option value="gpt-4">GPT-4 (Premium)</option>
              <option value="claude-instant">Claude Instant (Fast)</option>
              <option value="claude-2">Claude 2 (Advanced)</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                name="maxTokens"
                value={formData.maxTokens}
                onChange={handleInputChange}
                min="100"
                max="4000"
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum response length</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="number"
                name="temperature"
                value={formData.temperature}
                onChange={handleInputChange}
                min="0"
                max="1"
                step="0.1"
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Controls randomness (0-1)</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="preserveHistory"
              name="preserveHistory"
              checked={formData.preserveHistory}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="preserveHistory" className="ml-2 block text-sm text-gray-700">
              Preserve conversation history between sessions
            </label>
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

export default OutputConfig;