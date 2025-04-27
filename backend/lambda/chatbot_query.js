// chatbot_query.js - Lambda function for handling chatbot queries with RAG

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const opensearch = new AWS.OpenSearch();
const secretsManager = new AWS.SecretsManager();
const lambda = new AWS.Lambda();

// Initialize Redis client (for context memory)
let redisClient = null;

/**
 * Get Redis client for context memory
 * @returns {Promise<Redis>} Redis client
 */
async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }
  
  // Get Redis connection info from Secrets Manager
  const secretData = await secretsManager.getSecretValue({
    SecretId: process.env.REDIS_SECRET_ARN
  }).promise();
  
  const secretJson = JSON.parse(secretData.SecretString);
  
  redisClient = new Redis({
    host: secretJson.host,
    port: secretJson.port,
    password: secretJson.password,
    tls: process.env.NODE_ENV === 'production'
  });
  
  return redisClient;
}

/**
 * Handler for chatbot queries
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Object} - API Gateway response
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse request
    const body = JSON.parse(event.body || '{}');
    const chatbotId = event.pathParameters?.chatbotId;
    const query = body.query;
    
    // Get tenant ID from Cognito claims
    const tenantId = event.requestContext.authorizer?.claims['custom:tenantId'];
    
    // Use existing session ID or create a new one
    const sessionId = body.sessionId || uuidv4();
    
    // Validate input
    if (!chatbotId || !query || !tenantId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Missing required parameters: chatbotId, query, or tenant authentication'
        })
      };
    }
    
    // Get chatbot configuration
    const chatbotConfig = await getChatbotConfig(chatbotId, tenantId);
    
    if (!chatbotConfig) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Chatbot not found or access denied'
        })
      };
    }
    
    // Get conversation history from Redis
    const redis = await getRedisClient();
    const conversationHistoryKey = `${tenantId}:${chatbotId}:${sessionId}:history`;
    const rawHistory = await redis.lrange(conversationHistoryKey, 0, -1);
    
    const conversationHistory = rawHistory.map(item => JSON.parse(item));
    
    // Get memory duration from config (default to 60 minutes if not specified)
    const memoryDuration = chatbotConfig.memoryDuration || 60;
    
    // Search for relevant content with RAG
    const { relevantContent, sources } = await searchRelevantContent(
      tenantId, 
      query, 
      conversationHistory,
      chatbotConfig.maxDocuments || 5
    );
    
    // Prepare prompt with context
    const prompt = buildPromptWithContext(query, conversationHistory, relevantContent, chatbotConfig);
    
    // Generate response using model
    const response = await generateResponse(prompt, chatbotConfig);
    
    // Save conversation to Redis for context memory
    await redis.lpush(conversationHistoryKey, JSON.stringify({
      role: 'user',
      content: query,
      timestamp: Date.now()
    }));
    
    await redis.lpush(conversationHistoryKey, JSON.stringify({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    }));
    
    // Set expiration for conversation history based on memory duration
    await redis.expire(conversationHistoryKey, memoryDuration * 60);
    
    // Record query for analytics
    await recordQuery(tenantId, chatbotId, sessionId, query, response);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response,
        sessionId,
        sources
      })
    };
    
  } catch (error) {
    console.error('Error processing query:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'An error occurred processing your query',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

/**
 * Get chatbot configuration from DynamoDB
 * @param {string} chatbotId - Chatbot ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} - Chatbot configuration
 */
async function getChatbotConfig(chatbotId, tenantId) {
  try {
    const result = await dynamoDB.get({
      TableName: process.env.WORKFLOW_TABLE,
      Key: {
        id: chatbotId,
        tenantId: tenantId
      }
    }).promise();
    
    return result.Item;
  } catch (error) {
    console.error('Error getting chatbot config:', error);
    return null;
  }
}

/**
 * Search for relevant content using OpenSearch
 * @param {string} tenantId - Tenant ID
 * @param {string} query - User query
 * @param {Array} history - Conversation history
 * @param {number} maxDocuments - Maximum number of documents to return
 * @returns {Promise<Object>} - Relevant content and sources
 */
async function searchRelevantContent(tenantId, query, history, maxDocuments) {
  try {
    // Get embedding for query - call separate Lambda function
    const embeddingResult = await lambda.invoke({
      FunctionName: process.env.EMBEDDING_LAMBDA,
      Payload: JSON.stringify({
        text: query,
        tenantId: tenantId
      })
    }).promise();
    
    const embeddingData = JSON.parse(embeddingResult.Payload);
    const queryEmbedding = embeddingData.embedding;
    
    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding for query');
    }
    
    // Create KNN query for OpenSearch
    const indexName = `${tenantId}-vectors`;
    const knnQuery = {
      size: maxDocuments,
      _source: ["text", "source_url", "source_name"],
      query: {
        knn: {
          embedding: {
            vector: queryEmbedding,
            k: maxDocuments
          }
        }
      }
    };
    
    // Query OpenSearch
    const searchParams = {
      index: indexName,
      body: JSON.stringify(knnQuery)
    };
    
    const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT;
    const requestParams = {
      host: opensearchEndpoint,
      method: 'POST',
      path: `/${indexName}/_search`,
      body: JSON.stringify(knnQuery),
      service: 'es',
      region: process.env.AWS_REGION
    };
    
    const response = await opensearch.request(requestParams);
    const results = JSON.parse(response.body);
    
    // Process results
    const hits = results.hits?.hits || [];
    
    // Create relevant content string and sources
    let relevantContent = '';
    const sources = [];
    
    hits.forEach(hit => {
      const score = hit._score;
      const text = hit._source.text;
      const url = hit._source.source_url;
      const name = hit._source.source_name;
      
      // Only include if score is above threshold (0.5)
      if (score > 0.5) {
        relevantContent += `${text}\n\n`;
        
        sources.push({
          text: text.length > 200 ? text.substring(0, 200) + '...' : text,
          url,
          score,
          name
        });
      }
    });
    
    return { relevantContent, sources };
  } catch (error) {
    console.error('Error searching relevant content:', error);
    return { relevantContent: '', sources: [] };
  }
}

/**
 * Build prompt with context for the language model
 * @param {string} query - User query
 * @param {Array} history - Conversation history
 * @param {string} relevantContent - Relevant content from RAG
 * @param {Object} config - Chatbot configuration
 * @returns {string} - Prompt for language model
 */
function buildPromptWithContext(query, history, relevantContent, config) {
  let prompt = 'You are a helpful AI assistant answering questions based on the provided context.\n\n';
  
  // Add relevant content if available
  if (relevantContent) {
    prompt += 'Context information:\n"""\n' + relevantContent + '\n"""\n\n';
  }
  
  // Add conversation history
  if (history.length > 0) {
    prompt += 'Previous conversation:\n';
    
    // Limit history to last 10 messages (5 exchanges)
    const recentHistory = history.slice(0, 10);
    
    recentHistory.reverse().forEach(msg => {
      const role = msg.role === 'user' ? 'Human' : 'Assistant';
      prompt += `${role}: ${msg.content}\n`;
    });
    
    prompt += '\n';
  }
  
  // Add current query
  prompt += `Human: ${query}\n\nAssistant:`;
  
  return prompt;
}

/**
 * Generate response using a language model
 * @param {string} prompt - Prompt for language model
 * @param {Object} config - Chatbot configuration
 * @returns {Promise<string>} - Generated response
 */
async function generateResponse(prompt, config) {
  try {
    // Call separate Lambda function for LLM inference
    const result = await lambda.invoke({
      FunctionName: process.env.INFERENCE_LAMBDA,
      Payload: JSON.stringify({
        prompt: prompt,
        max_tokens: 1000,
        temperature: 0.7,
        model: config.model || 'gpt-3.5-turbo'
      })
    }).promise();
    
    const inferenceData = JSON.parse(result.Payload);
    
    if (inferenceData.error) {
      throw new Error(inferenceData.error);
    }
    
    return inferenceData.response.trim();
  } catch (error) {
    console.error('Error generating response:', error);
    return 'I apologize, but I encountered an issue generating a response. Please try again later.';
  }
}

/**
 * Record query for analytics
 * @param {string} tenantId - Tenant ID
 * @param {string} chatbotId - Chatbot ID
 * @param {string} sessionId - Session ID
 * @param {string} query - User query
 * @param {string} response - Generated response
 * @returns {Promise<void>}
 */
async function recordQuery(tenantId, chatbotId, sessionId, query, response) {
  try {
    const timestamp = new Date().toISOString();
    const queryId = uuidv4();
    
    await dynamoDB.put({
      TableName: process.env.QUERIES_TABLE,
      Item: {
        id: queryId,
        tenantId: tenantId,
        chatbotId: chatbotId,
        sessionId: sessionId,
        query: query,
        responseLength: response.length,
        timestamp: timestamp,
        date: timestamp.split('T')[0]
      }
    }).promise();
  } catch (error) {
    console.error('Error recording query:', error);
    // Continue execution even if recording fails
  }
}