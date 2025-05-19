// extract_text.js - Lambda function for extracting and normalizing text from various sources

const AWS = require('aws-sdk');
const cheerio = require('cheerio');

// Initialize AWS services
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

/**
 * Lambda handler for extracting and normalizing text from various sources
 * 
 * @param {Object} event - Step Functions event
 * @param {Object} event.dataSource - Data source information
 * @param {Object} event.crawlResult - Crawl result for website sources
 * @param {Object} event.apiResult - API result for API sources
 * @param {Object} event.documentResult - Document result for document sources
 * @param {string} event.tenantId - Tenant ID
 * @param {Object} event.config - Configuration
 * @param {string} context - Lambda context
 * @returns {Object} - Extracted text result
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from event
    const { dataSource, tenantId, config } = event;
    const sourceType = dataSource.type;
    
    let sourceContent = null;
    let sourceKey = null;
    let sourceId = null;
    
    // Determine source type and get content
    if (sourceType === 'website' && event.crawlResult) {
      sourceContent = event.crawlResult.s3Key;
      sourceKey = event.crawlResult.s3Key;
      sourceId = event.crawlResult.sourceId;
    } else if (sourceType === 'api' && event.apiResult) {
      sourceContent = event.apiResult.s3Key;
      sourceKey = event.apiResult.s3Key;
      sourceId = event.apiResult.sourceId;
    } else if (sourceType === 'document' && event.documentResult) {
      sourceContent = event.documentResult.processedTextKey;
      sourceKey = event.documentResult.processedTextKey;
      sourceId = event.documentResult.sourceId;
    } else {
      throw new Error(`Invalid source type or missing result for ${sourceType}`);
    }
    
    // Get content from S3
    console.log(`Reading source content from ${sourceKey}`);
    const contentObject = await s3.getObject({
      Bucket: process.env.DOCUMENT_BUCKET,
      Key: sourceContent
    }).promise();
    
    let text = contentObject.Body.toString('utf-8');
    
    // Extract and normalize text based on source type
    switch (sourceType) {
      case 'website':
        // For website crawl, raw content should be JSON
        const crawledPages = JSON.parse(text);
        text = extractTextFromCrawledPages(crawledPages);
        break;
        
      case 'api':
        // For API responses, normalize JSON or keep as is
        if (contentObject.ContentType.includes('json')) {
          text = normalizeJsonForRAG(text);
        }
        break;
        
      case 'document':
        // For documents, text is already extracted by process_document Lambda
        break;
    }
    
    // Clean up text
    text = cleanText(text);
    
    // Store extracted text in S3
    const timestamp = new Date().getTime();
    const extractedTextKey = `${tenantId}/extracted-text/${dataSource.name}-${timestamp}.txt`;
    
    await s3.putObject({
      Bucket: process.env.DOCUMENT_BUCKET,
      Key: extractedTextKey,
      Body: text,
      ContentType: 'text/plain',
      Metadata: {
        'tenant-id': tenantId,
        'source-name': dataSource.name,
        'source-type': sourceType,
        'original-key': sourceKey,
        'extraction-timestamp': timestamp.toString()
      }
    }).promise();
    
    // Update metadata in DynamoDB
    await dynamoDB.update({
      TableName: process.env.METADATA_TABLE,
      Key: {
        id: sourceId,
        tenantId: tenantId
      },
      UpdateExpression: 'set extractedTextKey = :textKey, textLength = :textLength, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':textKey': extractedTextKey,
        ':textLength': text.length,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();
    
    // Return extracted text information
    return {
      sourceId,
      tenantId,
      sourceType,
      sourceName: dataSource.name,
      processedTextKey: extractedTextKey,
      textLength: text.length,
      status: 'success'
    };
  } catch (error) {
    console.error('Error extracting text:', error);
    
    // Send error to dead-letter queue
    await sqs.sendMessage({
      QueueUrl: process.env.DLQ_URL,
      MessageBody: JSON.stringify({
        error: error.message,
        event,
        timestamp: new Date().toISOString(),
        service: 'extract-text'
      })
    }).promise();
    
    throw error;
  }
};

/**
 * Extract text from crawled web pages
 * 
 * @param {Array} crawledPages - Array of crawled page objects
 * @returns {string} - Extracted text
 */
function extractTextFromCrawledPages(crawledPages) {
  const allTexts = [];
  
  for (const page of crawledPages) {
    if (page.content && page.content.trim()) {
      // Add page URL as header
      allTexts.push(`# Page: ${page.url}`);
      allTexts.push(page.content);
      allTexts.push('\n---\n');
    }
  }
  
  return allTexts.join('\n');
}

/**
 * Normalize JSON for RAG
 * 
 * @param {string} jsonText - JSON text
 * @returns {string} - Normalized text
 */
function normalizeJsonForRAG(jsonText) {
  try {
    // Parse JSON
    const data = JSON.parse(jsonText);
    
    // Function to flatten JSON into key-value pairs
    function flattenJson(obj, prefix = '') {
      let result = [];
      
      for (const key in obj) {
        const value = obj[key];
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively process nested objects
          result = result.concat(flattenJson(value, newPrefix));
        } else if (Array.isArray(value)) {
          // Handle arrays
          if (value.length > 0) {
            if (typeof value[0] === 'object' && value[0] !== null) {
              // Array of objects
              value.forEach((item, index) => {
                result.push(`${newPrefix}[${index}]:`);
                result = result.concat(flattenJson(item, `${newPrefix}[${index}]`));
              });
            } else {
              // Array of primitives
              result.push(`${newPrefix}: ${value.join(', ')}`);
            }
          } else {
            result.push(`${newPrefix}: []`);
          }
        } else {
          // Handle primitive values
          result.push(`${newPrefix}: ${value}`);
        }
      }
      
      return result;
    }
    
    const flattened = flattenJson(data);
    return flattened.join('\n');
  } catch (error) {
    console.warn('Failed to parse JSON for normalization:', error);
    return jsonText;
  }
}

/**
 * Clean and normalize text
 * 
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  // Remove HTML tags if any
  let cleanedText = text;
  if (text.includes('<') && text.includes('>')) {
    const $ = cheerio.load(text);
    cleanedText = $.text();
  }
  
  // Remove excessive whitespace
  cleanedText = cleanedText.replace(/\s+/g, ' ');
  
  // Remove excessive newlines while preserving paragraph breaks
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
  
  // Normalize unicode characters
  cleanedText = cleanedText.normalize();
  
  return cleanedText.trim();
}