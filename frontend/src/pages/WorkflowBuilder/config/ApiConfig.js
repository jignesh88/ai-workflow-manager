// ApiConfig.js - Configuration panel for API integration node
import React, { useState } from 'react';

const ApiConfig = ({ node, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    endpoint: node.data?.config?.endpoint || '',
    method: node.data?.config?.method || 'GET',
    headers: node.data?.config?.headers || {},
    bodyTemplate: node.data?.config?.bodyTemplate || '',
    responseMapping: node.data?.config?.responseMapping || '',
    authType: node.data?.config?.authType || 'none',
    authToken: node.data?.config?.authToken || '',
    username: node.data?.config?.username || '',
    password: node.data?.config?.password || '',
    apiName: node.data?.config?.apiName || '',
    includeInContext: node.data?.config?.includeInContext !== false, // default to true
  });

  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addHeader = () => {
    if (headerKey) {
      setFormData(prev => ({
        ...prev,
        headers: {
          ...prev.headers,
          [headerKey]: headerValue
        }
      }));
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key) => {
    const newHeaders = { ...formData.headers };
    delete newHeaders[key];
    
    setFormData(prev => ({
      ...prev,
      headers: newHeaders
    }));
  };

  const testApiConnection = async () => {
    setIsLoading(true);
    setTestStatus('testing');
    
    // Simulate API test (in a real app, this would call a backend function)
    setTimeout(() => {
      if (formData.endpoint.includes('http')) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
      setIsLoading(false);
    }, 1500);
  };

  const handleSubmit = () => {
    // Create label for the node based on the API name or endpoint
    const apiName = formData.apiName || new URL(formData.endpoint).hostname;
    const label = `API: ${apiName}`;
    
    // Save the configuration
    onSave({
      ...formData,
      label
    });
  };

  return (
    <div className="w-96 border-l border-gray-200 bg-white shadow-xl p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Configure API Integration</h2>
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
        {/* Basic API Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">API Information</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">API Name</label>
            <input
              type="text"
              name="apiName"
              value={formData.apiName}
              onChange={handleInputChange}
              placeholder="Weather API"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
            <input
              type="text"
              name="endpoint"
              value={formData.endpoint}
              onChange={handleInputChange}
              placeholder="https://api.example.com/v1/data"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">HTTP Method</label>
            <select
              name="method"
              value={formData.method}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
        </div>
        
        {/* Authentication */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Authentication</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Type</label>
            <select
              name="authType"
              value={formData.authType}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="none">None</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="api-key">API Key</option>
            </select>
          </div>
          
          {formData.authType === 'bearer' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bearer Token</label>
              <input
                type="password"
                name="authToken"
                value={formData.authToken}
                onChange={handleInputChange}
                placeholder="Enter token"
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
          
          {formData.authType === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Username"
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}
          
          {formData.authType === 'api-key' && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Add your API key in the Headers section below.
              </p>
            </div>
          )}
        </div>
        
        {/* Headers */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Headers</h3>
          
          <div className="grid grid-cols-5 gap-2 mb-2">
            <div className="col-span-2">
              <input
                type="text"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                placeholder="Key"
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <input
                type="text"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                placeholder="Value"
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={addHeader}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                Add
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-md p-3 mb-3">
            {Object.keys(formData.headers).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(formData.headers).map(([key, value], index) => (
                  <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200">
                    <div className="text-xs">
                      <span className="font-medium">{key}:</span> {value}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No headers added</p>
            )}
          </div>
        </div>
        
        {/* Request Body (for POST/PUT) */}
        {(formData.method === 'POST' || formData.method === 'PUT' || formData.method === 'PATCH') && (
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Request Body Template</h3>
            
            <div className="mb-4">
              <textarea
                name="bodyTemplate"
                value={formData.bodyTemplate}
                onChange={handleInputChange}
                rows="4"
                placeholder={`{"param1": "{{value1}}", "param2": "{{value2}}"}`}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Use {`{{variable}}`} syntax for dynamic values</p>
            </div>
          </div>
        )}
        
        {/* Response Mapping */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Response Mapping</h3>
          
          <div className="mb-4">
            <textarea
              name="responseMapping"
              value={formData.responseMapping}
              onChange={handleInputChange}
              rows="4"
              placeholder='{"weather": "data.current.condition.text", "temperature": "data.current.temp_c"}'
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Map response fields to variable names using JSON path notation</p>
          </div>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeInContext"
              name="includeInContext"
              checked={formData.includeInContext}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="includeInContext" className="ml-2 block text-sm text-gray-700">
              Include response in chatbot context
            </label>
          </div>
        </div>
        
        {/* Test Connection */}
        <div className="mt-4">
          <button
            type="button"
            onClick={testApiConnection}
            disabled={isLoading || !formData.endpoint}
            className="mb-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Testing Connection...
              </>
            ) : 'Test API Connection'}
          </button>
          
          {testStatus === 'success' && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Success!</strong>
              <span className="block sm:inline"> API connection is working.</span>
            </div>
          )}
          
          {testStatus === 'error' && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> Could not connect to API. Please check your configuration.</span>
            </div>
          )}
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

export default ApiConfig;