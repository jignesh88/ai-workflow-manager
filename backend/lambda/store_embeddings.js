// store_embeddings.js - Lambda function for storing embeddings in OpenSearch

const AWS = require('aws-sdk');

// Initialize AWS services
const s3 = new AWS.S3();
const opensearch = new AWS.OpenSearch();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

/**
 * Lambda handler for storing embeddings in OpenSearch
 * 
 * @param {Object} event - Step Functions event with embeddings information
 * @param {string} event.tenantId - Tenant ID
 * @param {Object} event.dataSource - Data source information
 * @param {Object} event.embeddings - Embeddings information
 * @param {string} event.embeddings.embeddingsKey - S3 key to embeddings file
 * @param {Object} event.config - Configuration settings
 * @param {string} context - Lambda context
 * @returns {Object} - Storage result
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from event
    const { tenantId, dataSource, embeddings, config } = event;
    
    if (!embeddings || !embeddings.embeddingsKey) {
      throw new Error('No embeddings information provided');
    }
    
    // Read embeddings from S3
    const embeddingsObject = await s3.getObject({
      Bucket: process.env.DOCUMENT_BUCKET,
      Key: embeddings.embeddingsKey
    }).promise();
    
    const embeddingsData = JSON.parse(embeddingsObject.Body.toString('utf-8'));
    console.log(`Retrieved ${embeddingsData.length} embeddings to store`);
    
    // Get OpenSearch endpoint
    const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT;
    
    // Ensure the tenant-specific index exists
    const indexName = `${tenantId}-vectors`;
    const indexExists = await checkIndexExists(opensearchEndpoint, indexName);
    
    if (!indexExists) {
      console.log(`Creating index ${indexName}`);
      await createVectorIndex(opensearchEndpoint, indexName, embeddingsData[0].embedding.length);
    }
    
    // Bulk insert embeddings into OpenSearch
    const bulkResponse = await bulkInsertEmbeddings(opensearchEndpoint, indexName, embeddingsData, tenantId);
    
    if (bulkResponse.errors) {
      console.error('Bulk insert had errors:', bulkResponse.items.filter(item => item.index && item.index.error));
      throw new Error('Failed to insert some embeddings');
    }
    
    // Update metadata in DynamoDB
    const timestamp = new Date().toISOString();
    await dynamoDB.update({
      TableName: process.env.METADATA_TABLE,
      Key: {
        id: embeddings.sourceId,
        tenantId: tenantId
      },
      UpdateExpression: 'set embeddingsStoredAt = :timestamp, embeddingsCount = :count, status = :status',
      ExpressionAttributeValues: {
        ':timestamp': timestamp,
        ':count': embeddingsData.length,
        ':status': 'indexed'
      }
    }).promise();
    
    // Return result
    return {
      tenantId,
      sourceId: embeddings.sourceId,
      sourceName: dataSource.name,
      indexName,
      vectorCount: embeddingsData.length,
      status: 'success'
    };
  } catch (error) {
    console.error('Error storing embeddings:', error);
    
    // Send error to dead-letter queue
    await sqs.sendMessage({
      QueueUrl: process.env.DLQ_URL,
      MessageBody: JSON.stringify({
        error: error.message,
        event,
        timestamp: new Date().toISOString(),
        service: 'store-embeddings'
      })
    }).promise();
    
    throw error;
  }
};

/**
 * Check if OpenSearch index exists
 * 
 * @param {string} endpoint - OpenSearch endpoint
 * @param {string} indexName - Index name to check
 * @returns {boolean} - True if index exists
 */
async function checkIndexExists(endpoint, indexName) {
  try {
    const requestParams = {
      host: endpoint,
      method: 'HEAD',
      path: `/${indexName}`,
      service: 'es',
      region: process.env.AWS_REGION
    };
    
    await opensearch.request(requestParams);
    return true;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Create vector index in OpenSearch
 * 
 * @param {string} endpoint - OpenSearch endpoint
 * @param {string} indexName - Index name to create
 * @param {number} dimensions - Vector dimensions
 * @returns {Object} - Create index response
 */
async function createVectorIndex(endpoint, indexName, dimensions) {
  const indexBody = {
    settings: {
      index: {
        number_of_shards: 5,
        number_of_replicas: 1,
        knn: true
      }
    },
    mappings: {
      properties: {
        embedding: {
          type: 'knn_vector',
          dimension: dimensions,
          method: {
            name: 'hnsw',
            space_type: 'cosinesimil',
            engine: 'nmslib',
            parameters: {
              ef_construction: 128,
              m: 24
            }
          }
        },
        text: { type: 'text' },
        source_url: { type: 'keyword' },
        source_name: { type: 'keyword' },
        tenant_id: { type: 'keyword' },
        chunk_index: { type: 'integer' },
        created_at: { type: 'date' }
      }
    }
  };
  
  const requestParams = {
    host: endpoint,
    method: 'PUT',
    path: `/${indexName}`,
    body: JSON.stringify(indexBody),
    service: 'es',
    region: process.env.AWS_REGION
  };
  
  return opensearch.request(requestParams);
}

/**
 * Bulk insert embeddings into OpenSearch
 * 
 * @param {string} endpoint - OpenSearch endpoint
 * @param {string} indexName - Index name
 * @param {Array} embeddings - Array of embedding objects
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - Bulk insert response
 */
async function bulkInsertEmbeddings(endpoint, indexName, embeddings, tenantId) {
  // Prepare bulk request body
  let bulkBody = '';
  const timestamp = new Date().toISOString();
  
  embeddings.forEach((embeddingData, index) => {
    // Create a unique ID for each embedding
    const docId = `${tenantId}-${Date.now()}-${index}`;
    
    // Add action metadata line
    bulkBody += JSON.stringify({ index: { _index: indexName, _id: docId } }) + '\n';
    
    // Add document data line
    bulkBody += JSON.stringify({
      embedding: embeddingData.embedding,
      text: embeddingData.text,
      source_url: embeddingData.sourceUrl,
      source_name: embeddingData.sourceName,
      tenant_id: tenantId,
      chunk_index: embeddingData.chunkIndex,
      created_at: timestamp
    }) + '\n';
  });
  
  // Bulk insert in batches of 100 documents
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < embeddings.length; i += batchSize) {
    const batchEmbeddings = embeddings.slice(i, i + batchSize);
    let batchBody = '';
    
    batchEmbeddings.forEach((embeddingData, index) => {
      const docId = `${tenantId}-${Date.now()}-${i + index}`;
      batchBody += JSON.stringify({ index: { _index: indexName, _id: docId } }) + '\n';
      batchBody += JSON.stringify({
        embedding: embeddingData.embedding,
        text: embeddingData.text,
        source_url: embeddingData.sourceUrl,
        source_name: embeddingData.sourceName,
        tenant_id: tenantId,
        chunk_index: embeddingData.chunkIndex,
        created_at: timestamp
      }) + '\n';
    });
    
    batches.push(batchBody);
  }
  
  // Process all batches
  const results = [];
  for (let i = 0; i < batches.length; i++) {
    const batchBody = batches[i];
    
    const requestParams = {
      host: endpoint,
      method: 'POST',
      path: '/_bulk',
      body: batchBody,
      service: 'es',
      region: process.env.AWS_REGION,
      headers: {
        'Content-Type': 'application/x-ndjson'
      }
    };
    
    const response = await opensearch.request(requestParams);
    results.push(JSON.parse(response.body));
    
    // Small delay between batches
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Combine results
  const combinedResult = {
    took: results.reduce((sum, result) => sum + result.took, 0),
    errors: results.some(result => result.errors),
    items: results.flatMap(result => result.items)
  };
  
  return combinedResult;
}