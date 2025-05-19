import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from 'aws-amplify';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import TenantBranding from '../../components/TenantBranding';

// Placeholder data for development
const mockWorkflows = [
  {
    id: 'workflow-1',
    name: 'Sales Support Chatbot',
    createdAt: '2023-04-10T12:00:00Z',
    updatedAt: '2023-04-15T14:30:00Z',
    status: 'active'
  },
  {
    id: 'workflow-2',
    name: 'Customer Service Agent',
    createdAt: '2023-04-05T09:45:00Z',
    updatedAt: '2023-04-12T11:20:00Z',
    status: 'draft'
  },
  {
    id: 'workflow-3',
    name: 'Technical Support Bot',
    createdAt: '2023-03-28T16:15:00Z',
    updatedAt: '2023-04-08T10:10:00Z',
    status: 'active'
  }
];

console.log('loading dashboard');
const Dashboard = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { tenantId, tenantConfig } = useTenant();
  
  useEffect(() => {

    console.log('Tenant ID:', tenantId);
    console.log('Tenant Config:', tenantConfig);

    const fetchWorkflows = async () => {
      try {
        setLoading(true);
        
        if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_API_ENDPOINT) {
          // Use mock data for local development
          setTimeout(() => {
            setWorkflows(mockWorkflows);
            setLoading(false);
          }, 500);
          return;
        }
        
        // In production, we would fetch from the real API
        const response = await API.get('workflowApi', '/workflows', {
          headers: {
            'x-tenant-id': tenantId
          }
        });
        
        if (response.workflows) {
          setWorkflows(response.workflows);
        }
      } catch (err) {
        console.error('Error fetching workflows:', err);
        setError(err.message || 'Failed to load workflows');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkflows();
  }, []);
  
  const handleCreateWorkflow = () => {
    navigate('/builder/new');
  };
  
  const handleEditWorkflow = (workflowId) => {
    navigate(`/builder/${workflowId}`);
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <TenantBranding />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            {tenantConfig?.name || 'AI Workflow Manager'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Tenant ID: {tenantId}
            </span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Chatbot Workflows</h2>
          <button
            onClick={handleCreateWorkflow}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Workflow
          </button>
        </div>
        
        {/* Workflows list */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        ) : workflows.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-16 sm:px-6 text-center">
              <p className="text-gray-500 text-lg mb-4">You don't have any workflows yet</p>
              <button
                onClick={handleCreateWorkflow}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Your First Workflow
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {workflows.map((workflow) => (
                <li key={workflow.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-indigo-600 truncate">{workflow.name}</p>
                      <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        workflow.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {workflow.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Created: {new Date(workflow.createdAt).toLocaleDateString()} · 
                      Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditWorkflow(workflow.id)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Edit
                    </button>
                    <button
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Preview
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-gray-500 text-center">
            &copy; 2025 AI Workflow Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;