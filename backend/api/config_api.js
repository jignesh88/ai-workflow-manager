// config_api.js - API for tenant configuration in the AI Workflow Manager

const AWS = require('aws-sdk');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Handler for tenant configuration API operations
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Object} - API Gateway response
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract tenant ID from request context
    const requestTenantId = event.requestContext.authorizer?.claims['custom:tenantId'];
    
    if (!requestTenantId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Tenant authentication required'
        })
      };
    }
    
    // Parse path and HTTP method to determine operation
    const path = event.path;
    const httpMethod = event.httpMethod;
    
    // Extract tenant ID from path
    const pathParts = path.split('/');
    const pathTenantId = pathParts[2];
    
    // Ensure tenant ID in path matches authenticated tenant
    if (pathTenantId !== requestTenantId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Access denied to requested tenant configuration'
        })
      };
    }
    
    // Handle different API operations based on path and method
    if (path === `/tenant/${pathTenantId}/config` && httpMethod === 'GET') {
      return await getTenantConfig(pathTenantId);
    } else if (path === `/tenant/${pathTenantId}/config` && httpMethod === 'PUT') {
      return await updateTenantConfig(pathTenantId, event.body);
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Not found'
        })
      };
    }
  } catch (error) {
    console.error('Error in config API:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

/**
 * Get tenant configuration
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function getTenantConfig(tenantId) {
  try {
    const result = await dynamoDB.get({
      TableName: process.env.CONFIG_TABLE,
      Key: {
        id: 'tenant-config',
        tenantId: tenantId
      }
    }).promise();
    
    if (!result.Item) {
      // Return default configuration if none exists
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantConfig: {
            name: 'Default Tenant',
            primaryColor: '#6366f1',
            secondaryColor: '#4f46e5',
            fontFamily: 'Inter',
            borderRadius: 0.375,
            buttonShadow: true,
            headerBackground: '#ffffff',
            sidebarBackground: '#f9fafb'
          }
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tenantConfig: {
          name: result.Item.name,
          primaryColor: result.Item.primaryColor,
          secondaryColor: result.Item.secondaryColor,
          fontFamily: result.Item.fontFamily,
          borderRadius: result.Item.borderRadius,
          buttonShadow: result.Item.buttonShadow,
          headerBackground: result.Item.headerBackground,
          sidebarBackground: result.Item.sidebarBackground,
          faviconUrl: result.Item.faviconUrl,
          logoUrl: result.Item.logoUrl
        }
      })
    };
  } catch (error) {
    console.error('Error getting tenant config:', error);
    throw error;
  }
}

/**
 * Update tenant configuration
 * @param {string} tenantId - Tenant ID
 * @param {string} body - Request body
 * @returns {Object} - API Gateway response
 */
async function updateTenantConfig(tenantId, body) {
  try {
    const data = JSON.parse(body);
    
    if (!data.tenantConfig) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Invalid tenant configuration data'
        })
      };
    }
    
    const timestamp = new Date().toISOString();
    
    // Sanitize and validate the configuration
    const config = {
      id: 'tenant-config',
      tenantId: tenantId,
      itemType: 'tenantConfig',
      name: data.tenantConfig.name || 'Default Tenant',
      primaryColor: validateColor(data.tenantConfig.primaryColor) || '#6366f1',
      secondaryColor: validateColor(data.tenantConfig.secondaryColor) || '#4f46e5',
      fontFamily: data.tenantConfig.fontFamily || 'Inter',
      borderRadius: typeof data.tenantConfig.borderRadius === 'number' ? 
        data.tenantConfig.borderRadius : 0.375,
      buttonShadow: typeof data.tenantConfig.buttonShadow === 'boolean' ? 
        data.tenantConfig.buttonShadow : true,
      headerBackground: validateColor(data.tenantConfig.headerBackground) || '#ffffff',
      sidebarBackground: validateColor(data.tenantConfig.sidebarBackground) || '#f9fafb',
      updatedAt: timestamp
    };
    
    // Add optional fields if provided
    if (data.tenantConfig.faviconUrl) {
      config.faviconUrl = data.tenantConfig.faviconUrl;
    }
    
    if (data.tenantConfig.logoUrl) {
      config.logoUrl = data.tenantConfig.logoUrl;
    }
    
    await dynamoDB.put({
      TableName: process.env.CONFIG_TABLE,
      Item: config
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true
      })
    };
  } catch (error) {
    console.error('Error updating tenant config:', error);
    throw error;
  }
}

/**
 * Validate color string (hex, rgb, rgba)
 * @param {string} color - Color string to validate
 * @returns {string|null} - Validated color or null if invalid
 */
function validateColor(color) {
  if (!color) return null;
  
  // Validate hex color
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    return color;
  }
  
  // Validate rgb/rgba color
  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(color) ||
      /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|1|0?\.\d+)\s*\)$/.test(color)) {
    return color;
  }
  
  return null;
}