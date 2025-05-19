// AuthContext.js - Authentication context provider for the AI Workflow Manager
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth, Hub } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

// Create context
const AuthContext = createContext();

// Hook for using auth context
export const useAuth = () => useContext(AuthContext);

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Mock API base URL for development
const MOCK_API_URL = 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [mockToken, setMockToken] = useState(localStorage.getItem('mockToken'));

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (isDevelopment && mockToken) {
          // In development, use the mock API server
          try {
            const response = await fetch(`${MOCK_API_URL}/auth/currentuser`, {
              headers: {
                'Authorization': `Bearer ${mockToken}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              setUser({
                attributes: data.user.attributes,
                username: data.user.username
              });
            } else {
              // If the token is invalid, clear it
              localStorage.removeItem('mockToken');
              setMockToken(null);
              setUser(null);
            }
          } catch (error) {
            console.error('Error checking mock auth state:', error);
            localStorage.removeItem('mockToken');
            setMockToken(null);
            setUser(null);
          }
        } else {
          // In production, use Cognito Auth
          try {
            const currentUser = await Auth.currentAuthenticatedUser();
            setUser(currentUser);
          } catch (err) {
            // No current authenticated user is fine
            if (err !== 'The user is not authenticated') {
              console.error('Error initializing auth:', err);
              setError(err.message || 'An error occurred during authentication');
            }
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [mockToken]);

  // Set up auth listener to update state when auth changes
  useEffect(() => {
    if (!initialized) return;
    
    const listener = (data) => {
      switch (data.payload.event) {
        case 'signIn':
          setUser(data.payload.data);
          // Redirect to Dashboard on successful login
          navigate('/dashboard');
          break;
        case 'signOut':
          setUser(null);
          navigate('/');
          break;
        default:
          break;
      }
    };

    Hub.listen('auth', listener);

    return () => {
      Hub.remove('auth', listener);
    };
  }, [initialized, navigate]);

  // Sign in with username/password
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      if (isDevelopment) {
        // In development, use the mock API server
        const response = await fetch(`${MOCK_API_URL}/auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: email,
            password: password
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to sign in');
        }
        
        const data = await response.json();
        
        // Save the mock token to localStorage
        localStorage.setItem('mockToken', data.token);

        console.log('Mock token:', data.token);
        setMockToken(data.token);
        
        // Set the user
        const mockUser = {
          username: data.user.username,
          attributes: data.user.attributes
        };
        
        console.log('Mock user:', mockUser);
        setUser(mockUser);
        navigate('/dashboard');
        console.log('naviagate to dashboard');
        return mockUser;
      } else {
        // In production, use Cognito Auth
        const user = await Auth.signIn(email, password);
        setUser(user);
        navigate('/dashboard');
        return user;
      }
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err.message || 'An error occurred during sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up new user
  const signUp = async (email, password, attributes) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          ...attributes
        }
      });
      
      return result;
    } catch (err) {
      console.error('Error signing up:', err);
      setError(err.message || 'An error occurred during sign up');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Confirm sign up with verification code
  const confirmSignUp = async (email, code) => {
    try {
      setLoading(true);
      setError(null);
      
      await Auth.confirmSignUp(email, code);
    } catch (err) {
      console.error('Error confirming sign up:', err);
      setError(err.message || 'An error occurred during confirmation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out current user
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isDevelopment && mockToken) {
        // In development, use the mock API server
        try {
          await fetch(`${MOCK_API_URL}/auth/signout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockToken}`
            },
            body: JSON.stringify({
              token: mockToken
            })
          });
        } catch (error) {
          console.error('Error signing out from mock server:', error);
        }
        
        // Clear the mock token from localStorage
        localStorage.removeItem('mockToken');
        setMockToken(null);
        setUser(null);
      } else {
        // In production, use Cognito Auth
        await Auth.signOut();
        setUser(null);
      }
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err.message || 'An error occurred during sign out');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Federated sign in (social login)
  const federatedSignIn = async (provider) => {
    try {
      setLoading(true);
      setError(null);
      
      await Auth.federatedSignIn({ provider });
    } catch (err) {
      console.error('Error with federated sign in:', err);
      setError(err.message || 'An error occurred during social login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset password (forgot password flow)
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      await Auth.forgotPassword(email);
    } catch (err) {
      console.error('Error with forgot password:', err);
      setError(err.message || 'An error occurred while resetting password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Submit new password with reset code
  const forgotPasswordSubmit = async (email, code, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      await Auth.forgotPasswordSubmit(email, code, newPassword);
    } catch (err) {
      console.error('Error submitting new password:', err);
      setError(err.message || 'An error occurred while setting new password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Change password for authenticated user
  const changePassword = async (oldPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(currentUser, oldPassword, newPassword);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.message || 'An error occurred while changing password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get current user's attributes
  const getUserAttributes = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      return currentUser.attributes;
    } catch (err) {
      console.error('Error getting user attributes:', err);
      throw err;
    }
  };

  // Update user attributes
  const updateUserAttributes = async (attributes) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(currentUser, attributes);
      
      // Refresh user to get updated attributes
      const refreshedUser = await Auth.currentAuthenticatedUser({ bypassCache: true });
      setUser(refreshedUser);
    } catch (err) {
      console.error('Error updating user attributes:', err);
      setError(err.message || 'An error occurred while updating profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    confirmSignUp,
    signOut,
    federatedSignIn,
    forgotPassword,
    forgotPasswordSubmit,
    changePassword,
    getUserAttributes,
    updateUserAttributes,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;