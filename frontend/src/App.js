import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

// Pages
import Login from './pages/Auth/Login';
import WorkflowBuilder from './pages/WorkflowBuilder/WorkflowBuilder';
import Dashboard from './pages/Dashboard/Dashboard';

// Protected route component
const ProtectedRoute = ({ children }) => {
  // In a real app, this would check JWT tokens or similar
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Configure Amplify - in a real app, this would use environment variables
const awsConfig = {
  // For local development with mock data
  API: {
    endpoints: [
      {
        name: 'workflowApi',
        endpoint: process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3001/api'
      },
      {
        name: 'configApi',
        endpoint: process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3001/api'
      },
      {
        name: 'chatbotApi',
        endpoint: process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3001/api'
      }
    ]
  },
  Auth: {
    // For local development, use dummy auth
    // In production, this would point to Cognito
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'local-user-pool',
    userPoolWebClientId: process.env.REACT_APP_CLIENT_ID || 'local-client-id',
  }
};

// For local development, let's add mock authentication
if (!process.env.REACT_APP_AWS_REGION) {
  // Only for local development
  const originalSignIn = Amplify.Auth.signIn;
  Amplify.Auth.signIn = async (username, password) => {
    // Mock sign in for development
    console.log('Mock sign in:', username, password);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('currentUser', JSON.stringify({
      username,
      attributes: {
        'custom:tenantId': 'tenant1',
        email: username
      }
    }));
    return {
      username,
      attributes: {
        'custom:tenantId': 'tenant1',
        email: username
      }
    };
  };
  
  Amplify.Auth.currentAuthenticatedUser = async () => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      throw new Error('The user is not authenticated');
    }
    return JSON.parse(user);
  };
  
  Amplify.Auth.signOut = async () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
  };
}

// Configure Amplify with our settings
Amplify.configure(awsConfig);

function App() {
  return (
    <Router>
      <AuthProvider>
        <TenantProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/builder/:workflowId" element={
              <ProtectedRoute>
                <WorkflowBuilder />
              </ProtectedRoute>
            } />
            <Route path="/builder" element={
              <ProtectedRoute>
                <Navigate to="/builder/new" replace />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </TenantProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;