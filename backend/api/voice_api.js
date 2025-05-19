// voice_api.js - API Gateway handler for voice integration endpoints

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const lambda = new AWS.Lambda();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda handler for voice API
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Object} - API Gateway response
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract tenant ID from Cognito claims
    const tenantId = event.requestContext.authorizer?.claims['custom:tenantId'];
    
    if (!tenantId) {
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
    
    // Check tenant permissions for voice capabilities
    const hasPermission = await checkTenantVoicePermissions(tenantId);
    
    if (!hasPermission) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'This tenant does not have access to voice capabilities'
        })
      };
    }
    
    // Invoke voice integration Lambda with the request
    const result = await lambda.invoke({
      FunctionName: process.env.VOICE_INTEGRATION_LAMBDA,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        ...event,
        tenantContext: {
          tenantId
        }
      })
    }).promise();
    
    // Parse and return result
    const payload = JSON.parse(result.Payload);
    
    if (result.FunctionError) {
      console.error('Error from voice integration lambda:', payload);
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Error processing voice request',
          details: process.env.NODE_ENV === 'development' ? payload : undefined
        })
      };
    }
    
    // Record API usage for analytics
    await recordVoiceApiUsage(tenantId, event.path, event.httpMethod);
    
    return payload;
  } catch (error) {
    console.error('Error in voice API:', error);
    
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
 * Check if tenant has permissions for voice capabilities
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} - True if tenant has permissions
 */
async function checkTenantVoicePermissions(tenantId) {
  try {
    // Get tenant configuration
    const result = await dynamoDB.get({
      TableName: process.env.CONFIG_TABLE,
      Key: {
        id: 'tenant-config',
        tenantId
      }
    }).promise();
    
    if (!result.Item) {
      return false;
    }
    
    // Check if voice capabilities are enabled for this tenant
    // This could be controlled by tenant tier, subscription, etc.
    const tenantConfig = result.Item;
    
    // Example permission check based on tenant configuration
    // Adjust this logic based on your actual tenant permission model
    return tenantConfig.enableVoiceCapabilities !== false;
  } catch (error) {
    console.error('Error checking tenant voice permissions:', error);
    // Default to false on error for security
    return false;
  }
}

/**
 * Record voice API usage for analytics
 * @param {string} tenantId - Tenant ID
 * @param {string} path - API path
 * @param {string} method - HTTP method
 * @returns {Promise<void>}
 */
async function recordVoiceApiUsage(tenantId, path, method) {
  try {
    const timestamp = new Date().toISOString();
    const usageId = uuidv4();
    
    // Extract API operation from path
    const operation = path.split('/').pop();
    
    await dynamoDB.put({
      TableName: process.env.METADATA_TABLE,
      Item: {
        id: usageId,
        tenantId,
        itemType: 'apiUsage',
        apiType: 'voice',
        operation,
        method,
        timestamp,
        date: timestamp.split('T')[0]
      }
    }).promise();
  } catch (error) {
    console.error('Error recording voice API usage:', error);
    // Continue execution even if recording fails
  }
}