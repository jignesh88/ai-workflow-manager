// fetch_from_api.js - Lambda function for fetching data from APIs in the RAG pipeline

const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

/**
 * Lambda handler for fetching data from APIs in the RAG pipeline
 * 
 * @param {Object} event - Step Functions event
 * @param {Object} event.dataSource - Data source configuration
 * @param {string} event.dataSource.type - Source type ('api')
 * @param {string} event.dataSource.url - API endpoint URL
 * @param {string} event.dataSource.name - Source name
 * @param {Object} event.dataSource.headers - API headers
 * @param {string} event.dataSource.method - HTTP method
 * @param {Object} event.dataSource.body - Request body for POST/PUT
 * @param {string} event.tenantId - Tenant ID
 * @param {Object} event.config - Configuration
 * @param {string} context - Lambda context
 * @returns {Object} - API fetch result
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Extract parameters from event
  const { dataSource, tenantId, config } = event;
  const { url, name, headers = {}, method = 'GET', body = null } = dataSource;
  
  try {
    // Check if valid URL
    if (!isValidUrl(url)) {
      throw new Error(`Invalid API URL: ${url}`);
    }
    
    // Setup API request
    const requestConfig = {
      url,
      method,
      headers: {
        'User-Agent': 'AI-Workflow-Manager/1.0',
        ...headers
      },
      timeout: 30000 // 30 seconds timeout
    };
    
    // Handle authentication if specified
    if (dataSource.authType) {
      await configureAuthentication(requestConfig, dataSource, tenantId);
    }
    
    // Add request body for POST/PUT methods
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
      requestConfig.data = body;
    }
    
    console.log(`Making ${method} request to ${url}`);
    
    // Call the API
    const response = await axios(requestConfig);
    
    // Extract and format response data
    const apiData = response.data;
    let formattedData;
    
    if (typeof apiData === 'object') {
      formattedData = JSON.stringify(apiData, null, 2);
    } else if (typeof apiData === 'string') {
      formattedData = apiData;
    } else {
      formattedData = String(apiData);
    }
    
    // Store API response in S3
    const timestamp = new Date().getTime();
    const apiResponseKey = `${tenantId}/api-responses/${name}-${timestamp}.json`;
    
    await s3.putObject({
      Bucket: process.env.DOCUMENT_BUCKET,
      Key: apiResponseKey,
      Body: formattedData,
      ContentType: 'application/json',
      Metadata: {
        'tenant-id': tenantId,
        'source-name': name,
        'source-type': 'api',
        'source-url': url,
        'api-status': response.status.toString(),
        'fetch-timestamp': timestamp.toString()
      }
    }).promise();
    
    // Update metadata in DynamoDB
    const apiSourceId = `api-${name}-${timestamp}`;
    await dynamoDB.put({
      TableName: process.env.METADATA_TABLE,
      Item: {
        id: apiSourceId,
        tenantId: tenantId,
        itemType: 'source',
        sourceType: 'api',
        sourceName: name,
        sourceUrl: url,
        s3Key: apiResponseKey,
        apiStatus: response.status,
        fetchTimestamp: timestamp,
        status: 'fetched',
        createdAt: new Date().toISOString()
      }
    }).promise();
    
    // Return result
    return {
      sourceId: apiSourceId,
      tenantId: tenantId,
      sourceType: 'api',
      sourceName: name,
      sourceUrl: url,
      s3Key: apiResponseKey,
      apiStatus: response.status,
      contentLength: formattedData.length,
      fetchTimestamp: timestamp,
      status: 'success'
    };
  } catch (error) {
    console.error('Error fetching from API:', error);
    
    // Send error to dead-letter queue for further analysis
    await sqs.sendMessage({
      QueueUrl: process.env.DLQ_URL,
      MessageBody: JSON.stringify({
        error: error.message,
        event: event,
        timestamp: new Date().toISOString(),
        service: 'fetch-from-api'
      })
    }).promise();
    
    throw error;
  }
};

/**
 * Check if a URL is valid
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch (e) {
    return false;
  }
}

/**
 * Configure authentication for API request
 * 
 * @param {Object} requestConfig - Axios request configuration
 * @param {Object} dataSource - Data source with auth information
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<void>}
 */
async function configureAuthentication(requestConfig, dataSource, tenantId) {
  const { authType } = dataSource;
  
  switch (authType) {
    case 'bearer':
      if (dataSource.authToken) {
        requestConfig.headers['Authorization'] = `Bearer ${dataSource.authToken}`;
      } else if (dataSource.authSecretName) {
        // Retrieve token from Secrets Manager
        const secretName = `${tenantId}/${dataSource.authSecretName}`;
        const secretData = await secretsManager.getSecretValue({
          SecretId: secretName
        }).promise();
        
        const secretJson = JSON.parse(secretData.SecretString);
        requestConfig.headers['Authorization'] = `Bearer ${secretJson.token}`;
      }
      break;
      
    case 'basic':
      let username, password;
      
      if (dataSource.username && dataSource.password) {
        username = dataSource.username;
        password = dataSource.password;
      } else if (dataSource.authSecretName) {
        // Retrieve credentials from Secrets Manager
        const secretName = `${tenantId}/${dataSource.authSecretName}`;
        const secretData = await secretsManager.getSecretValue({
          SecretId: secretName
        }).promise();
        
        const secretJson = JSON.parse(secretData.SecretString);
        username = secretJson.username;
        password = secretJson.password;
      }
      
      if (username && password) {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        requestConfig.headers['Authorization'] = `Basic ${auth}`;
      }
      break;
      
    case 'api-key':
      if (dataSource.apiKeyHeader && dataSource.apiKey) {
        requestConfig.headers[dataSource.apiKeyHeader] = dataSource.apiKey;
      } else if (dataSource.authSecretName) {
        // Retrieve API key from Secrets Manager
        const secretName = `${tenantId}/${dataSource.authSecretName}`;
        const secretData = await secretsManager.getSecretValue({
          SecretId: secretName
        }).promise();
        
        const secretJson = JSON.parse(secretData.SecretString);
        const headerName = dataSource.apiKeyHeader || secretJson.headerName || 'X-API-Key';
        requestConfig.headers[headerName] = secretJson.apiKey;
      }
      break;
      
    case 'oauth2':
      // OAuth2 token retrieval logic would go here
      throw new Error('OAuth2 authentication not implemented yet');
      
    default:
      console.log(`No authentication configured for type: ${authType}`);
  }
}