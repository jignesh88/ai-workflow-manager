// process_document.js - Lambda function for processing documents in the RAG pipeline

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const s3 = new AWS.S3();
const textract = new AWS.Textract();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

/**
 * Lambda handler for processing documents in the RAG pipeline
 * 
 * @param {Object} event - Step Functions event
 * @param {Object} event.dataSource - Data source configuration
 * @param {string} event.dataSource.type - Source type ('document')
 * @param {string} event.dataSource.url - Document S3 URL or ID
 * @param {string} event.dataSource.name - Source name
 * @param {string} event.tenantId - Tenant ID
 * @param {Object} event.config - Configuration
 * @param {string} context - Lambda context
 * @returns {Object} - Processing result
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Extract parameters from event
  const { dataSource, tenantId, config } = event;
  const { url, name } = dataSource;
  
  try {
    // Determine if this is an S3 URL or document ID
    let documentKey;
    let documentBucket;
    
    if (url.startsWith('s3://')) {
      // Parse S3 URL
      const s3Url = new URL(url.replace('s3://', 'https://'));
      documentBucket = s3Url.hostname;
      documentKey = s3Url.pathname.substring(1); // Remove leading slash
    } else if (url.includes('/')) {
      // Assume format bucket/key
      const parts = url.split('/');
      documentBucket = parts[0];
      documentKey = parts.slice(1).join('/');
    } else {
      // Assume it's a document ID in the system
      const documentMetadata = await dynamoDB.get({
        TableName: process.env.METADATA_TABLE,
        Key: {
          id: url,
          tenantId: tenantId
        }
      }).promise();
      
      if (!documentMetadata.Item) {
        throw new Error(`Document ID ${url} not found for tenant ${tenantId}`);
      }
      
      documentBucket = process.env.DOCUMENT_BUCKET;
      documentKey = documentMetadata.Item.s3Key;
    }
    
    console.log(`Processing document ${documentKey} from bucket ${documentBucket} for tenant ${tenantId}`);
    
    // Verify tenant ownership by checking the key prefix
    if (!documentKey.startsWith(`${tenantId}/`)) {
      throw new Error('Access denied: Document does not belong to the specified tenant');
    }
    
    // Get document metadata from S3
    const headObject = await s3.headObject({
      Bucket: documentBucket,
      Key: documentKey
    }).promise();
    
    // Determine document type
    const contentType = headObject.ContentType;
    let extractionMethod;
    
    if (contentType.includes('pdf')) {
      extractionMethod = 'pdf';
    } else if (contentType.includes('image')) {
      extractionMethod = 'image';
    } else if (contentType.includes('word') || contentType.includes('office')) {
      extractionMethod = 'office';
    } else if (contentType.includes('text') || contentType.includes('markdown') || contentType.includes('json')) {
      extractionMethod = 'text';
    } else {
      throw new Error(`Unsupported document type: ${contentType}`);
    }
    
    // Extract text based on document type
    let documentText;
    
    switch (extractionMethod) {
      case 'pdf':
      case 'image':
      case 'office':
        // Use Textract for PDFs, images, and Office documents
        documentText = await extractWithTextract(documentBucket, documentKey);
        break;
        
      case 'text':
        // Simple S3 object read for text files
        const textObject = await s3.getObject({
          Bucket: documentBucket,
          Key: documentKey
        }).promise();
        
        documentText = textObject.Body.toString('utf-8');
        break;
        
      default:
        throw new Error(`Unsupported extraction method: ${extractionMethod}`);
    }
    
    // Store processed text in S3
    const timestamp = new Date().getTime();
    const processedTextKey = `${tenantId}/processed-text/${name}-${timestamp}.txt`;
    
    await s3.putObject({
      Bucket: process.env.DOCUMENT_BUCKET,
      Key: processedTextKey,
      Body: documentText,
      ContentType: 'text/plain',
      Metadata: {
        'tenant-id': tenantId,
        'source-name': name,
        'source-type': 'document',
        'source-document': `${documentBucket}/${documentKey}`,
        'extraction-method': extractionMethod,
        'process-timestamp': timestamp.toString()
      }
    }).promise();
    
    // Update metadata in DynamoDB
    const documentId = `document-${name}-${timestamp}`;
    await dynamoDB.put({
      TableName: process.env.METADATA_TABLE,
      Item: {
        id: documentId,
        tenantId: tenantId,
        itemType: 'source',
        sourceType: 'document',
        sourceName: name,
        sourceUrl: url,
        originalKey: `${documentBucket}/${documentKey}`,
        processedTextKey: processedTextKey,
        contentType: contentType,
        extractionMethod: extractionMethod,
        processTimestamp: timestamp,
        status: 'processed',
        createdAt: new Date().toISOString()
      }
    }).promise();
    
    // Return result
    return {
      sourceId: documentId,
      tenantId: tenantId,
      sourceType: 'document',
      sourceName: name,
      sourceUrl: url,
      processedTextKey: processedTextKey,
      contentType: contentType,
      extractionMethod: extractionMethod,
      status: 'success',
      textLength: documentText.length
    };
  } catch (error) {
    console.error('Error:', error);
    
    // Send error to dead-letter queue for further analysis
    await sqs.sendMessage({
      QueueUrl: process.env.DLQ_URL,
      MessageBody: JSON.stringify({
        error: error.message,
        event: event,
        timestamp: new Date().toISOString(),
        service: 'process-document'
      })
    }).promise();
    
    throw error;
  }
};

/**
 * Extract text from document using Textract
 * 
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @returns {string} - Extracted text
 */
async function extractWithTextract(bucket, key) {
  // Start document text detection
  const startResponse = await textract.startDocumentTextDetection({
    DocumentLocation: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    }
  }).promise();
  
  const jobId = startResponse.JobId;
  
  // Poll until job completes
  let jobStatus = 'IN_PROGRESS';
  while (jobStatus === 'IN_PROGRESS') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const getResponse = await textract.getDocumentTextDetection({
      JobId: jobId
    }).promise();
    
    jobStatus = getResponse.JobStatus;
    
    if (jobStatus === 'FAILED') {
      throw new Error(`Textract job failed: ${getResponse.StatusMessage}`);
    }
    
    if (jobStatus === 'SUCCEEDED') {
      return assembleTextractResponse(getResponse, jobId);
    }
  }
  
  throw new Error(`Unexpected job status: ${jobStatus}`);
}

/**
 * Assemble complete text from Textract response
 * 
 * @param {Object} initialResponse - Initial Textract response
 * @param {string} jobId - Textract job ID
 * @returns {string} - Assembled text
 */
async function assembleTextractResponse(initialResponse, jobId) {
  let blocks = initialResponse.Blocks;
  let nextToken = initialResponse.NextToken;
  
  // Fetch all pages of results
  while (nextToken) {
    const getResponse = await textract.getDocumentTextDetection({
      JobId: jobId,
      NextToken: nextToken
    }).promise();
    
    blocks = blocks.concat(getResponse.Blocks);
    nextToken = getResponse.NextToken;
  }
  
  // Extract and join text blocks
  const textBlocks = blocks
    .filter(block => block.BlockType === 'LINE')
    .map(block => block.Text);
  
  return textBlocks.join('\n');
}