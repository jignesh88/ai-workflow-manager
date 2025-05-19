// validate_input.js - Lambda function for validating RAG workflow inputs

const AWS = require('aws-sdk');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda handler for validating inputs to the RAG workflow
 * 
 * @param {Object} event - Step Functions event
 * @param {string} event.tenantId - Tenant ID
 * @param {Array} event.dataSources - Array of data sources to process
 * @param {Object} event.config - Configuration settings
 * @param {string} context - Lambda context
 * @returns {Object} - Validation result
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const errors = [];
  
  try {
    // Validate tenant ID
    if (!event.tenantId) {
      errors.push('Missing required parameter: tenantId');
    } else {
      // Verify tenant exists
      try {
        const tenantResult = await dynamoDB.get({
          TableName: process.env.CONFIG_TABLE,
          Key: {
            id: 'tenant-config',
            tenantId: event.tenantId
          }
        }).promise();
        
        if (!tenantResult.Item) {
          errors.push(`Tenant not found: ${event.tenantId}`);
        }
      } catch (error) {
        console.error('Error verifying tenant:', error);
        errors.push(`Error verifying tenant: ${error.message}`);
      }
    }
    
    // Validate data sources
    if (!event.dataSources || !Array.isArray(event.dataSources) || event.dataSources.length === 0) {
      errors.push('Missing or invalid dataSources: must be a non-empty array');
    } else {
      event.dataSources.forEach((source, index) => {
        if (!source.type) {
          errors.push(`Data source at index ${index} is missing required parameter: type`);
        } else if (!['website', 'api', 'document'].includes(source.type)) {
          errors.push(`Data source at index ${index} has invalid type: ${source.type}`);
        }
        
        if (!source.url) {
          errors.push(`Data source at index ${index} is missing required parameter: url`);
        }
        
        if (!source.name) {
          errors.push(`Data source at index ${index} is missing required parameter: name`);
        }
      });
    }
    
    // Validate configuration
    if (!event.config || typeof event.config !== 'object') {
      errors.push('Missing or invalid config: must be an object');
    } else {
      // Validate crawl depth
      if (event.config.crawlDepth !== undefined) {
        const crawlDepth = parseInt(event.config.crawlDepth, 10);
        if (isNaN(crawlDepth) || crawlDepth < 1 || crawlDepth > 3) {
          errors.push('Invalid crawlDepth: must be a number between 1 and 3');
        }
      }
      
      // Validate memory duration
      if (event.config.memoryDuration !== undefined) {
        const memoryDuration = parseInt(event.config.memoryDuration, 10);
        if (isNaN(memoryDuration) || memoryDuration < 5 || memoryDuration > 1440) {
          errors.push('Invalid memoryDuration: must be a number between 5 and 1440 minutes');
        }
      }
      
      // Validate max documents
      if (event.config.maxDocuments !== undefined) {
        const maxDocuments = parseInt(event.config.maxDocuments, 10);
        if (isNaN(maxDocuments) || maxDocuments < 1 || maxDocuments > 20) {
          errors.push('Invalid maxDocuments: must be a number between 1 and 20');
        }
      }
      
      // Validate embedding model
      if (event.config.embeddingModel && typeof event.config.embeddingModel !== 'string') {
        errors.push('Invalid embeddingModel: must be a string');
      }
    }
    
    // Return validation result
    return {
      isValid: errors.length === 0,
      errors: errors,
      validatedTenantId: event.tenantId,
      validatedDataSources: errors.length === 0 ? event.dataSources : [],
      validatedConfig: errors.length === 0 ? event.config : {}
    };
  } catch (error) {
    console.error('Error in validation:', error);
    
    // Return validation failure
    return {
      isValid: false,
      errors: [`Validation error: ${error.message}`, ...errors],
      validatedTenantId: event.tenantId,
      validatedDataSources: [],
      validatedConfig: {}
    };
  }
};