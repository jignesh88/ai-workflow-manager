// TenantContext.js - Context provider for tenant-specific configuration and branding
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth, API } from 'aws-amplify';

// Create context
const TenantContext = createContext();

// Hook for using tenant context
export const useTenant = () => useContext(TenantContext);

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Mock API base URL for development
const MOCK_API_URL = 'http://localhost:3001/api';

export const TenantProvider = ({ children }) => {
  const [tenantConfig, setTenantConfig] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mockToken, setMockToken] = useState(localStorage.getItem('mockToken'));

  // Fetch tenant configuration
  useEffect(() => {

    const fetchTenantConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        let userTenantId;

        if (isDevelopment && mockToken) {

          console.log('Using mock token:', mockToken);
          // In development, use the mock API server
          const response = await fetch(`${MOCK_API_URL}/auth/currentuser`, {
            headers: {
              'Authorization': `Bearer ${mockToken}`
            }
          });

          
          if (!response.ok) {
            // If the token is invalid, clear it
            localStorage.removeItem('mockToken');
            setMockToken(null);
            throw new Error('Invalid mock token');
          }

          const data = await response.json();
          userTenantId = data.user.attributes['custom:tenantId'];
          
          // Auto-login for development if no token is present
          if (!userTenantId) {
            const loginResponse = await fetch(`${MOCK_API_URL}/auth/signin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                username: 'admin@example.com',
                password: 'Admin@123'
              })
            });
            
            if (loginResponse.ok) {
              const loginData = await loginResponse.json();
              localStorage.setItem('mockToken', loginData.token);
              setMockToken(loginData.token);
              userTenantId = loginData.user.attributes['custom:tenantId'];
            }
          }
        } else {
          // In production, use Cognito Auth
          const user = await Auth.currentAuthenticatedUser();
          userTenantId = user.attributes['custom:tenantId'];
        }
        
        if (!userTenantId) {
          throw new Error('User has no tenant ID assigned');
        }
        
        setTenantId(userTenantId);
        // Fetch tenant configuration from API
        let configData;
        
        if (isDevelopment) {
          // Use mock API in development
          const response = await fetch(`${MOCK_API_URL}/tenant/${userTenantId}/config`);
          configData = await response.json();
        } else {
          // Use Amplify API in production
          configData = await API.get('configApi', `/tenant/${userTenantId}/config`);
        }
        
        if (configData?.tenantConfig) {
          setTenantConfig(configData.tenantConfig);
        } else {
          throw new Error('Failed to fetch tenant configuration');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching tenant configuration');
        
        // In development, set a default tenant config if there's an error
        if (isDevelopment) {
          setTenantId('tenant1');
          setTenantConfig({
            name: 'Development Tenant',
            primaryColor: '#6366f1',
            secondaryColor: '#4f46e5',
            fontFamily: 'Inter',
            borderRadius: 0.375,
            buttonShadow: true,
            headerBackground: '#ffffff',
            sidebarBackground: '#f9fafb'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTenantConfig();
  }, [mockToken]);

  // Generate CSS variables for tenant branding
  const getTenantBrandingVariables = () => {
    if (!tenantConfig) return {};
    
    return {
      '--primary-color': tenantConfig.primaryColor || '#6366f1',
      '--secondary-color': tenantConfig.secondaryColor || '#4f46e5',
      '--font-family': `'${tenantConfig.fontFamily || 'Inter'}', sans-serif`,
      '--border-radius': `${tenantConfig.borderRadius || '0.375'}rem`,
      '--button-shadow': tenantConfig.buttonShadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
      '--header-background': tenantConfig.headerBackground || '#ffffff',
      '--sidebar-background': tenantConfig.sidebarBackground || '#f9fafb',
    };
  };

  // Update tenant configuration
  const updateTenantConfig = async (newConfig) => {
    try {
      setLoading(true);
      
      let response;
      
      if (isDevelopment) {
        // Use mock API in development
        const fetchResponse = await fetch(`${MOCK_API_URL}/tenant/${tenantId}/config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mockToken ? `Bearer ${mockToken}` : ''
          },
          body: JSON.stringify({
            tenantConfig: {
              ...tenantConfig,
              ...newConfig
            }
          })
        });
        
        response = await fetchResponse.json();
      } else {
        // Use Amplify API in production
        response = await API.put('configApi', `/tenant/${tenantId}/config`, {
          body: {
            tenantConfig: {
              ...tenantConfig,
              ...newConfig
            }
          }
        });
      }
      
      if (response?.success) {
        setTenantConfig({
          ...tenantConfig,
          ...newConfig
        });
        return true;
      } else {
        throw new Error('Failed to update tenant configuration');
      }
    } catch (err) {
      console.error('Error updating tenant config:', err);
      setError(err.message || 'An error occurred while updating tenant configuration');
      
      // In development, we'll still update the local state even if the API call fails
      if (isDevelopment) {
        setTenantConfig({
          ...tenantConfig,
          ...newConfig
        });
        return true;
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    tenantId,
    tenantConfig,
    loading,
    error,
    getTenantBrandingVariables,
    updateTenantConfig
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantProvider;