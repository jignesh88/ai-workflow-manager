// generate_embeddings.js - Lambda function for generating embeddings from text

const AWS = require('aws-sdk');
const axios = require('axios');

// Initialize AWS services
const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const sqs = new AWS.SQS();

// Maximum text chunk size for embeddings
const MAX_CHUNK_SIZE = 1000;

/**
 * Lambda handler for generating embeddings from extracted text
 * 
 * @param {Object} event - Step Functions event with extracted text information
 * @param {string} event.tenantId - Tenant ID
 * @param {Object} event.dataSource - Data source information
 * @param {Object} event.extractedText - Extracted text information
 * @param {Object} event.config - Configuration settings
 * @param {string} context - Lambda context
 * @returns {Object} - Embeddings result
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from event
    const { tenantId, dataSource, extractedText, config } = event;
    
    if (!extractedText || !extractedText.processedTextKey) {
      throw new Error('No extracted text information provided');
    }
    
    // Get the model name from config
    const embeddingModel = config.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2';
    console.log(`Using embedding model: ${embeddingModel}`);
    
    // Get API key for embedding service
    const apiKey = await getEmbeddingApiKey();
    
    // Read the processed text from S3
    const processedTextObject = await s3.getObject({
      Bucket: process.env.DOCUMENT_BUCKET,
      Key: extractedText.processedTextKey
    }).promise();
    
    const rawText = processedTextObject.Body.toString('utf-8');
    
    // Split text into chunks for embedding
    const textChunks = splitTextIntoChunks(rawText, MAX_CHUNK_SIZE);
    console.log(`Split text into ${textChunks.length} chunks`);
    
    // Generate embeddings for each chunk
    const embeddings = [];
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`Generating embedding for chunk ${i + 1}/${textChunks.length}`);
      
      const embedding = await generateEmbedding(chunk, embeddingModel, apiKey);
      
      embeddings.push({
        text: chunk,
        embedding: embedding,
        chunkIndex: i,
        sourceUrl: dataSource.url,
        sourceName: dataSource.name
      });
      
      // Small delay to avoid rate limiting
      if (i < textChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Store embeddings in S3
    const timestamp = new Date().getTime();
    const embeddingsKey = `${tenantId}/embeddings/${dataSource.name}-${timestamp}.json`;
    
    await s3.putObject({
      Bucket: process.env.DOCUMENT_BUCKET,
      Key: embeddingsKey,
      Body: JSON.stringify(embeddings),
      ContentType: 'application/json',
      Metadata: {
        'tenant-id': tenantId,
        'source-name': dataSource.name,
        'source-type': dataSource.type,
        'embedding-model': embeddingModel,
        'chunk-count': embeddings.length.toString(),
        'generated-timestamp': timestamp.toString()
      }
    }).promise();
    
    return {
      tenantId,
      sourceId: extractedText.sourceId,
      sourceName: dataSource.name,
      sourceType: dataSource.type,
      embeddingsKey,
      embeddingModel,
      chunkCount: embeddings.length,
      status: 'success'
    };
  } catch (error) {
    console.error('Error generating embeddings:', error);
    
    // Send error to dead-letter queue
    await sqs.sendMessage({
      QueueUrl: process.env.DLQ_URL,
      MessageBody: JSON.stringify({
        error: error.message,
        event,
        timestamp: new Date().toISOString(),
        service: 'generate-embeddings'
      })
    }).promise();
    
    throw error;
  }
};

/**
 * Split text into chunks for embedding
 * 
 * @param {string} text - Raw text to split
 * @param {number} maxChunkSize - Maximum characters per chunk
 * @returns {Array} - Array of text chunks
 */
function splitTextIntoChunks(text, maxChunkSize) {
  // Split text by paragraphs
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If paragraph is very large, split it into sentences
    if (paragraph.length > maxChunkSize) {
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
          currentChunk += (currentChunk ? ' ' : '') + sentence.trim() + '.';
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = '';
          }
          
          // If single sentence is too long, split into smaller chunks
          if (sentence.length > maxChunkSize) {
            let remainingSentence = sentence;
            while (remainingSentence.length > 0) {
              const chunkSize = Math.min(remainingSentence.length, maxChunkSize);
              chunks.push(remainingSentence.substring(0, chunkSize));
              remainingSentence = remainingSentence.substring(chunkSize);
            }
          } else {
            currentChunk = sentence.trim() + '.';
          }
        }
      }
    } else {
      if (currentChunk.length + paragraph.length + 1 <= maxChunkSize) {
        currentChunk += (currentChunk ? '\n' : '') + paragraph;
      } else {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Generate embedding for text chunk
 * 
 * @param {string} text - Text to embed
 * @param {string} model - Embedding model name
 * @param {string} apiKey - API key for embedding service
 * @returns {Array} - Vector embedding
 */
async function generateEmbedding(text, model, apiKey) {
  try {
    // Call to embedding service API (Hugging Face or similar)
    const response = await axios.post(
      process.env.EMBEDDING_API_URL,
      {
        inputs: text,
        model: model
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error calling embedding API:', error);
    
    // Create a fallback random embedding for development/testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using fallback random embedding in development mode');
      return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
    }
    
    throw error;
  }
}

/**
 * Get API key for embedding service from Secrets Manager
 * 
 * @returns {string} - API key
 */
async function getEmbeddingApiKey() {
  try {
    const secretData = await secretsManager.getSecretValue({
      SecretId: process.env.EMBEDDING_API_SECRET_ARN
    }).promise();
    
    const secretJson = JSON.parse(secretData.SecretString);
    return secretJson.apiKey;
  } catch (error) {
    console.error('Error retrieving embedding API key:', error);
    throw error;
  }
}