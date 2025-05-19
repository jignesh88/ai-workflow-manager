// Simple Express server for mocking API calls during development
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock users data
const mockUsers = [
  {
    username: 'admin@example.com',
    password: 'Admin@123',
    attributes: {
      email: 'admin@example.com',
      'custom:tenantId': 'tenant1',
      name: 'Admin User'
    }
  },
  {
    username: 'user@example.com',
    password: 'User@123',
    attributes: {
      email: 'user@example.com',
      'custom:tenantId': 'tenant1',
      name: 'Regular User'
    }
  }
];

// Store for tokens
const tokens = {};

// Mock workflows data
const mockWorkflows = [
  {
    id: 'workflow-1',
    name: 'Sales Support Chatbot',
    createdAt: '2023-04-10T12:00:00Z',
    updatedAt: '2023-04-15T14:30:00Z',
    status: 'active',
    nodes: [
      {
        id: 'rag-1',
        type: 'ragNode',
        position: { x: 100, y: 200 },
        data: { 
          label: 'RAG Pipeline',
          handles: ['source', 'target'],
          config: {
            dataSources: [{ type: 'website', url: 'https://example.com', name: 'Documentation' }],
            crawlFrequency: 'daily',
            memoryDuration: 60
          }
        }
      },
      {
        id: 'output-1',
        type: 'outputNode',
        position: { x: 400, y: 200 },
        data: { 
          label: 'Chatbot Output',
          handles: ['target'],
          config: { name: 'Sales Support Chatbot' }
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'rag-1',
        target: 'output-1',
        type: 'default'
      }
    ]
  },
  {
    id: 'workflow-2',
    name: 'Customer Service Agent',
    createdAt: '2023-04-05T09:45:00Z',
    updatedAt: '2023-04-12T11:20:00Z',
    status: 'draft',
    nodes: [],
    edges: []
  },
  {
    id: 'workflow-3',
    name: 'Technical Support Bot',
    createdAt: '2023-03-28T16:15:00Z',
    updatedAt: '2023-04-08T10:10:00Z',
    status: 'active',
    nodes: [],
    edges: []
  }
];

// Mock tenant config
const mockTenantConfig = {
  name: 'Demo Company',
  primaryColor: '#6366f1',
  secondaryColor: '#4f46e5',
  fontFamily: 'Inter',
  borderRadius: 0.375,
  buttonShadow: true,
  headerBackground: '#ffffff',
  sidebarBackground: '#f9fafb'
};

// Authorization middleware for protected routes
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token && tokens[token]) {
    req.user = tokens[token].user;
    next();
  } else {
    res.status(401).json({
      error: 'Not authenticated'
    });
  }
};

// Routes
app.get('/api/workflows', authMiddleware, (req, res) => {
  // Filter workflows by tenant ID
  const tenantId = req.user.attributes['custom:tenantId'];
  // In a real app, we would filter by tenant ID, but for the mock we'll return all
  res.json({ workflows: mockWorkflows });
});

app.get('/api/workflows/:id', authMiddleware, (req, res) => {
  const workflow = mockWorkflows.find(w => w.id === req.params.id);
  
  if (workflow) {
    res.json({ workflow });
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

app.post('/api/workflows', authMiddleware, (req, res) => {
  const newWorkflow = {
    id: `workflow-${Date.now()}`,
    ...req.body.workflow,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockWorkflows.push(newWorkflow);
  
  res.status(201).json({ 
    workflowId: newWorkflow.id,
    success: true
  });
});

app.put('/api/workflows/:id', authMiddleware, (req, res) => {
  const index = mockWorkflows.findIndex(w => w.id === req.params.id);
  
  if (index !== -1) {
    mockWorkflows[index] = {
      ...mockWorkflows[index],
      ...req.body.workflow,
      updatedAt: new Date().toISOString()
    };
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

app.get('/api/tenant/:tenantId/config', (req, res) => {
  // For tenant config, we'll allow unauthenticated access in development
  // but in a real app, this would be protected
  res.json({ tenantConfig: mockTenantConfig });
});

app.put('/api/tenant/:tenantId/config', authMiddleware, (req, res) => {
  // Ensure the tenant ID in the URL matches the user's tenant ID
  const userTenantId = req.user.attributes['custom:tenantId'];
  const requestTenantId = req.params.tenantId;
  
  if (userTenantId !== requestTenantId) {
    return res.status(403).json({
      error: 'You do not have permission to update this tenant'
    });
  }
  
  Object.assign(mockTenantConfig, req.body.tenantConfig);
  res.json({ success: true });
});

// Authentication routes for mock server
app.post('/api/auth/signin', (req, res) => {
  const { username, password } = req.body;
  const user = mockUsers.find(u => u.username === username && u.password === password);
  
  if (user) {
    const token = `mock-token-${Math.random().toString(36).substring(2, 15)}`;
    tokens[token] = {
      user,
      createdAt: new Date()
    };
    
    res.json({
      token,
      user: {
        username: user.username,
        attributes: user.attributes
      }
    });
  } else {
    res.status(401).json({
      error: 'Invalid username or password'
    });
  }
});

app.post('/api/auth/signout', (req, res) => {
  const { token } = req.body;
  
  if (tokens[token]) {
    delete tokens[token];
  }
  
  res.json({
    success: true
  });
});

// Current user route
app.get('/api/auth/currentuser', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token && tokens[token]) {
    const { user } = tokens[token];
    
    res.json({
      user: {
        username: user.username,
        attributes: user.attributes
      }
    });
  } else {
    res.status(401).json({
      error: 'Not authenticated'
    });
  }
});

// Authorization middleware for protected routes
// const authMiddleware = (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
  
//   if (token && tokens[token]) {
//     req.user = tokens[token].user;
//     next();
//   } else {
//     res.status(401).json({
//       error: 'Not authenticated'
//     });
//   }
// };

// Example of a protected route
app.get('/api/auth/protected', authMiddleware, (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user
  });
});

// Start server
app.listen(port, () => {
  console.log(`Mock API server running at http://localhost:${port}`);
});