// error_handler.js - Lambda function for handling errors in the RAG pipeline

const AWS = require('aws-sdk');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();
const cloudwatch = new AWS.CloudWatch();

/**
 * Lambda handler for handling errors in the RAG pipeline
 * 
 * @param {Object} event - Step Functions error event
 * @param {string} event.error - Error type
 * @param {string} event.message - Error message
 * @param {Object} event.details - Error details
 * @param {string} event.tenantId - Tenant ID
 * @param {Object} event.dataSource - Data source (if applicable)
 * @param {string} context - Lambda context
 * @returns {Object} - Error handling result
 */
exports.handler = async (event, context) => {
  console.log('Error event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract error information
    const errorType = event.error || 'UnknownError';
    const errorMessage = event.message || 'An unknown error occurred';
    const errorDetails = event.details || {};
    const tenantId = event.tenantId || 'unknown';
    const dataSource = event.dataSource || {};
    
    // Generate error ID
    const errorId = `${errorType}-${Date.now()}`;
    
    // Log error to CloudWatch
    console.error(`Error [${errorId}]: ${errorMessage}`, {
      errorType,
      errorDetails,
      tenantId,
      dataSource
    });
    
    // Store error in DynamoDB
    await storeErrorInDynamoDB(errorId, errorType, errorMessage, errorDetails, tenantId, dataSource);
    
    // Publish error notification to SNS topic if critical
    if (isCriticalError(errorType)) {
      await publishErrorNotification(errorId, errorType, errorMessage, tenantId, dataSource);
    }
    
    // Record error metric in CloudWatch
    await recordErrorMetric(errorType, tenantId);
    
    // Return error handling result
    return {
      errorId,
      errorType,
      errorMessage,
      handledAt: new Date().toISOString(),
      isRecoverable: isRecoverableError(errorType)
    };
  } catch (handlerError) {
    console.error('Error in error handler:', handlerError);
    
    // Return basic error info even if handling fails
    return {
      errorId: `fallback-${Date.now()}`,
      errorType: event.error || 'UnknownError',
      errorMessage: event.message || 'An unknown error occurred',
      handledAt: new Date().toISOString(),
      isRecoverable: false,
      handlerError: handlerError.message
    };
  }
};

/**
 * Store error information in DynamoDB
 * 
 * @param {string} errorId - Error ID
 * @param {string} errorType - Error type
 * @param {string} errorMessage - Error message
 * @param {Object} errorDetails - Error details
 * @param {string} tenantId - Tenant ID
 * @param {Object} dataSource - Data source information
 * @returns {Promise<void>}
 */
async function storeErrorInDynamoDB(errorId, errorType, errorMessage, errorDetails, tenantId, dataSource) {
  try {
    const timestamp = new Date().toISOString();
    
    await dynamoDB.put({
      TableName: process.env.METADATA_TABLE,
      Item: {
        id: errorId,
        tenantId: tenantId,
        itemType: 'error',
        errorType: errorType,
        errorMessage: errorMessage,
        errorDetails: JSON.stringify(errorDetails),
        sourceName: dataSource.name,
        sourceType: dataSource.type,
        sourceUrl: dataSource.url,
        createdAt: timestamp,
        date: timestamp.split('T')[0]
      }
    }).promise();
  } catch (error) {
    console.error('Failed to store error in DynamoDB:', error);
    // Continue execution even if storage fails
  }
}

/**
 * Publish error notification to SNS topic
 * 
 * @param {string} errorId - Error ID
 * @param {string} errorType - Error type
 * @param {string} errorMessage - Error message
 * @param {string} tenantId - Tenant ID
 * @param {Object} dataSource - Data source information
 * @returns {Promise<void>}
 */
async function publishErrorNotification(errorId, errorType, errorMessage, tenantId, dataSource) {
  try {
    const message = {
      errorId,
      errorType,
      errorMessage,
      tenantId,
      dataSource: {
        name: dataSource.name,
        type: dataSource.type,
        url: dataSource.url
      },
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT || 'development'
    };
    
    await sns.publish({
      TopicArn: process.env.ERROR_NOTIFICATION_TOPIC_ARN,
      Message: JSON.stringify(message),
      Subject: `[${process.env.ENVIRONMENT || 'DEV'}] RAG Pipeline Error: ${errorType}`
    }).promise();
  } catch (error) {
    console.error('Failed to publish error notification:', error);
    // Continue execution even if notification fails
  }
}

/**
 * Record error metric in CloudWatch
 * 
 * @param {string} errorType - Error type
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<void>}
 */
async function recordErrorMetric(errorType, tenantId) {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'AIWorkflowManager/RAGPipeline',
      MetricData: [
        {
          MetricName: 'ErrorCount',
          Dimensions: [
            {
              Name: 'ErrorType',
              Value: errorType
            },
            {
              Name: 'TenantId',
              Value: tenantId
            },
            {
              Name: 'Environment',
              Value: process.env.ENVIRONMENT || 'development'
            }
          ],
          Value: 1,
          Unit: 'Count',
          Timestamp: new Date()
        }
      ]
    }).promise();
  } catch (error) {
    console.error('Failed to record error metric:', error);
    // Continue execution even if metric recording fails
  }
}

/**
 * Check if error is critical and requires notification
 * 
 * @param {string} errorType - Error type
 * @returns {boolean} - True if critical error
 */
function isCriticalError(errorType) {
  const criticalErrors = [
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'DependencyError',
    'ConfigurationError',
    'ResourceExhaustedError'
  ];
  
  return criticalErrors.includes(errorType);
}

/**
 * Check if error is potentially recoverable
 * 
 * @param {string} errorType - Error type
 * @returns {boolean} - True if recoverable error
 */
function isRecoverableError(errorType) {
  const recoverableErrors = [
    'ThrottlingError',
    'TemporaryFailure',
    'NetworkError',
    'ServiceException',
    'TooManyRequestsException',
    'ProvisionedThroughputExceededException'
  ];
  
  return recoverableErrors.includes(errorType);
}