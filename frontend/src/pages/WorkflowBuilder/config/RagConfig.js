import React, { useState } from 'react';
import { API } from 'aws-amplify';
import { useTenant } from '../../../contexts/TenantContext';

const RagConfig = ({ node, onSave, onCancel }) => {
  const { tenantId } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    dataSources: [{ type: 'website', url: '', name: '' }],
    apiEndpoints: [{ url: '', headers: {}, method: 'GET', name: '' }],
    crawlFrequency: 'daily',
    memoryDuration: 60, // minutes
    embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
    maxDocuments: 5,
    crawlDepth: 1
  });

  const handleInputChange = (e, index, field, subfield = null) => {
    const { name, value } = e.target;
    const newFormData = { ...formData };
    
    if (field === 'dataSources') {
      if (subfield) {
        newFormData.dataSources[index][subfield] = value;
      } else {
        newFormData.dataSources[index][name] = value;
      }
    } else if (field === 'apiEndpoints') {
      if (subfield === 'headers') {
        const [headerKey, headerValue] = name.split(':');
        newFormData.apiEndpoints[index].headers[headerKey] = headerValue;
      } else if (subfield) {
        newFormData.apiEndpoints[index][subfield] = value;
      } else {
        newFormData.apiEndpoints[index][name] = value;
      }
    } else {
      newFormData[name] = value;
    }
    
    setFormData(newFormData);
  };

  const addDataSource = () => {
    setFormData({
      ...formData,
      dataSources: [...formData.dataSources, { type: 'website', url: '', name: '' }]
    });
  };

  const removeDataSource = (index) => {
    const newDataSources = [...formData.dataSources];
    newDataSources.splice(index, 1);
    setFormData({ ...formData, dataSources: newDataSources });
  };

  const addApiEndpoint = () => {
    setFormData({
      ...formData,
      apiEndpoints: [...formData.apiEndpoints, { url: '', headers: {}, method: 'GET', name: '' }]
    });
  };

  const removeApiEndpoint = (index) => {
    const newApiEndpoints = [...formData.apiEndpoints];
    newApiEndpoints.splice(index, 1);
    setFormData({ ...formData, apiEndpoints: newApiEndpoints });
  };

  const addHeader = (index) => {
    const newApiEndpoints = [...formData.apiEndpoints];
    newApiEndpoints[index].headers[''] = '';
    setFormData({ ...formData, apiEndpoints: newApiEndpoints });
  };

  const testRagConfig = async () => {
    setIsLoading(true);
    setTestStatus('testing');
    
    try {
      // Call API to test RAG configuration
      const response = await API.post('chatbotApi', '/rag/test', {
        body: {
          ...formData,
          tenantId
        }
      });
      
      if (response.success) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (error) {
      console.error('Error testing RAG config:', error);
      setTestStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    // Process and save the configuration
    const ragConfig = {
      ...formData,
      label: `RAG Pipeline: ${formData.dataSources.length} sources`,
    };
    
    onSave(ragConfig);
  };

  return (
    <div className="w-96 border-l border-gray-200 bg-white shadow-xl p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Configure RAG Pipeline</h2>
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
        {/* Data Sources Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Data Sources</h3>
          
          {formData.dataSources.map((source, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg mb-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Source #{index + 1}</h4>
                <button 
                  onClick={() => removeDataSource(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  disabled={formData.dataSources.length === 1}
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    name="type"
                    value={source.type}
                    onChange={(e) => handleInputChange(e, index, 'dataSources', 'type')}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="website">Website</option>
                    <option value="api">API</option>
                    <option value="document">Document Reference</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={source.name}
                    onChange={(e) => handleInputChange(e, index, 'dataSources', 'name')}
                    placeholder="Knowledge Base"
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="text"
                  name="url"
                  value={source.url}
                  onChange={(e) => handleInputChange(e, index, 'dataSources', 'url')}
                  placeholder={source.type === 'website' ? 'https://example.com/docs' : 'API endpoint or document ID'}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {source.type === 'website' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crawl Depth</label>
                  <input
                    type="number"
                    name="crawlDepth"
                    value={formData.crawlDepth}
                    onChange={(e) => handleInputChange(e, null, null)}
                    min="1"
                    max="3"
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher values will crawl more pages but take longer</p>
                </div>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addDataSource}
            className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Data Source
          </button>
        </div>

        {/* Memory Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Memory Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crawl Frequency</label>
              <select
                name="crawlFrequency"
                value={formData.crawlFrequency}
                onChange={(e) => handleInputChange(e, null, null)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Context Memory (minutes)</label>
              <input
                type="number"
                name="memoryDuration"
                value={formData.memoryDuration}
                onChange={(e) => handleInputChange(e, null, null)}
                min="5"
                max="1440"
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Model Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Embedding Model</h3>
          <select
            name="embeddingModel"
            value={formData.embeddingModel}
            onChange={(e) => handleInputChange(e, null, null)}
            className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="sentence-transformers/all-MiniLM-L6-v2">MiniLM-L6 (Fast)</option>
            <option value="sentence-transformers/all-mpnet-base-v2">MPNet (Balanced)</option>
            <option value="sentence-transformers/multi-qa-mpnet-base-dot-v1">Multi-QA MPNet (Accurate)</option>
          </select>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Documents to Return</label>
            <input
              type="number"
              name="maxDocuments"
              value={formData.maxDocuments}
              onChange={(e) => handleInputChange(e, null, null)}
              min="1"
              max="20"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Number of relevant documents to include in chat context</p>
          </div>
        </div>

        {/* Test RAG Configuration */}
        <div className="mt-4">
          <button
            type="button"
            onClick={testRagConfig}
            disabled={isLoading}
            className="mb-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Testing Configuration...
              </>
            ) : 'Test RAG Configuration'}
          </button>
          
          {testStatus === 'success' && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Success!</strong>
              <span className="block sm:inline"> RAG configuration is valid.</span>
            </div>
          )}
          
          {testStatus === 'error' && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> Could not validate RAG configuration. Please check your data sources and try again.</span>
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

export default RagConfig;