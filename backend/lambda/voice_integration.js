// voice_integration.js - Lambda function for voice capabilities integration

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const polly = new AWS.Polly();
const transcribe = new AWS.TranscribeService();
const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

/**
 * Lambda handler for voice integration operations
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Object} - API Gateway response
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract headers and parameters from the request
    const httpMethod = event.httpMethod;
    const path = event.path;
    const body = event.body ? JSON.parse(event.body) : {};
    
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
    
    // Handle different endpoints based on path and method
    if (path.endsWith('/tts') && httpMethod === 'POST') {
      return await handleTextToSpeech(body, tenantId);
    } else if (path.endsWith('/stt') && httpMethod === 'POST') {
      return await handleSpeechToText(body, tenantId);
    } else if (path.endsWith('/token') && httpMethod === 'POST') {
      return await generateLiveKitToken(body, tenantId);
    } else if (path.endsWith('/config') && httpMethod === 'GET') {
      return await getVoiceConfig(tenantId, event.pathParameters?.workflowId);
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
    console.error('Error in voice integration:', error);
    
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
 * Handle text-to-speech conversion
 * @param {Object} body - Request body
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function handleTextToSpeech(body, tenantId) {
  const { text, voiceId, engine, outputFormat, workflowId } = body;
  
  if (!text) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Text parameter is required'
      })
    };
  }
  
  // Get voice configuration
  let voice = voiceId || 'Matthew';
  let voiceEngine = engine || 'neural';
  let format = outputFormat || 'mp3';
  
  if (workflowId) {
    const voiceConfig = await getWorkflowVoiceConfig(workflowId, tenantId);
    voice = voiceConfig.voiceId || voice;
    voiceEngine = voiceConfig.engine || voiceEngine;
  }
  
  // Determine if SSML is being used
  const isSSML = text.trim().startsWith('<speak>');
  
  // Call Amazon Polly to synthesize speech
  const pollyParams = {
    Engine: voiceEngine,
    OutputFormat: format,
    Text: text,
    VoiceId: voice,
    TextType: isSSML ? 'ssml' : 'text'
  };
  
  const pollyResponse = await polly.synthesizeSpeech(pollyParams).promise();
  
  // Save audio to S3
  const timestamp = Date.now();
  const audioKey = `${tenantId}/audio/tts-${timestamp}.${format}`;
  
  await s3.putObject({
    Bucket: process.env.AUDIO_BUCKET || process.env.DOCUMENT_BUCKET,
    Key: audioKey,
    Body: pollyResponse.AudioStream,
    ContentType: `audio/${format}`,
    Metadata: {
      'tenant-id': tenantId,
      'voice-id': voice,
      'engine': voiceEngine,
      'created-at': new Date().toISOString()
    }
  }).promise();
  
  // Generate pre-signed URL for client
  const presignedUrl = s3.getSignedUrl('getObject', {
    Bucket: process.env.AUDIO_BUCKET || process.env.DOCUMENT_BUCKET,
    Key: audioKey,
    Expires: 3600 // URL expires in 1 hour
  });
  
  // Record usage for billing/analytics
  await recordVoiceUsage(tenantId, 'tts', text.length, workflowId);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audioUrl: presignedUrl,
      format: format,
      voiceId: voice,
      textLength: text.length
    })
  };
}

/**
 * Handle speech-to-text conversion
 * @param {Object} body - Request body
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function handleSpeechToText(body, tenantId) {
  const { audioUrl, language, sampleRate, workflowId } = body;
  
  if (!audioUrl) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'AudioUrl parameter is required'
      })
    };
  }
  
  // Get voice configuration
  let languageCode = language || 'en-US';
  let sampleRateHertz = sampleRate || 16000;
  
  if (workflowId) {
    const voiceConfig = await getWorkflowVoiceConfig(workflowId, tenantId);
    languageCode = voiceConfig.language || languageCode;
    sampleRateHertz = voiceConfig.sampleRate || sampleRateHertz;
  }
  
  // For real-time transcription, use WebSocket APIs
  // For this example, we'll use Amazon Transcribe batch processing
  
  // Generate a unique job name
  const jobName = `${tenantId}-transcribe-${Date.now()}`;
  
  // Start transcription job
  const transcribeParams = {
    TranscriptionJobName: jobName,
    LanguageCode: languageCode,
    MediaFormat: audioUrl.endsWith('mp3') ? 'mp3' : 'wav',
    Media: {
      MediaFileUri: audioUrl
    },
    Settings: {
      ShowSpeakerLabels: false,
      MaxSpeakerLabels: 2,
      ShowAlternatives: false
    }
  };
  
  await transcribe.startTranscriptionJob(transcribeParams).promise();
  
  // Poll for job completion (simplified for example)
  let jobStatus = 'IN_PROGRESS';
  let transcriptionText = '';
  let retries = 0;
  
  while (jobStatus === 'IN_PROGRESS' && retries < 30) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const jobResult = await transcribe.getTranscriptionJob({
      TranscriptionJobName: jobName
    }).promise();
    
    jobStatus = jobResult.TranscriptionJob.TranscriptionJobStatus;
    
    if (jobStatus === 'COMPLETED') {
      // Get the transcript JSON file
      const transcriptUrl = jobResult.TranscriptionJob.Transcript.TranscriptFileUri;
      
      // Download the transcript
      const transcriptResponse = await fetch(transcriptUrl);
      const transcriptJson = await transcriptResponse.json();
      
      transcriptionText = transcriptJson.results.transcripts[0].transcript;
    }
    
    retries++;
  }
  
  if (jobStatus !== 'COMPLETED') {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Transcription job did not complete in time',
        jobName: jobName
      })
    };
  }
  
  // Record usage for billing/analytics
  await recordVoiceUsage(tenantId, 'stt', transcriptionText.length, workflowId);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: transcriptionText,
      jobName: jobName,
      languageCode: languageCode
    })
  };
}

/**
 * Generate LiveKit token for voice/video sessions
 * @param {Object} body - Request body
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function generateLiveKitToken(body, tenantId) {
  const { roomName, participantName, workflowId } = body;
  
  if (!roomName || !participantName) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'RoomName and ParticipantName parameters are required'
      })
    };
  }
  
  // Get LiveKit credentials from Secrets Manager
  let apiKey, apiSecret;
  
  if (workflowId) {
    const voiceConfig = await getWorkflowVoiceConfig(workflowId, tenantId);
    apiKey = voiceConfig.livekitApiKey;
    apiSecret = voiceConfig.livekitApiSecret;
  }
  
  if (!apiKey || !apiSecret) {
    const secretName = process.env.LIVEKIT_SECRET_ARN;
    const secretData = await secretsManager.getSecretValue({
      SecretId: secretName
    }).promise();
    
    const secretJson = JSON.parse(secretData.SecretString);
    apiKey = secretJson.apiKey;
    apiSecret = secretJson.apiSecret;
  }
  
  // Tenant-specific room name prefix for isolation
  const fullRoomName = `${tenantId}-${roomName}`;
  
  // Generate JWT token for LiveKit
  const tokenOptions = {
    video: {
      roomCreate: true,
      roomJoin: true,
      roomAdmin: false,
      canPublish: true,
      canSubscribe: true
    }
  };
  
  const token = jwt.sign(
    {
      sub: participantName,
      room: fullRoomName,
      iss: apiKey,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour validity
      ...tokenOptions
    },
    apiSecret
  );
  
  // Record LiveKit session in DynamoDB for monitoring
  const sessionId = uuidv4();
  await dynamoDB.put({
    TableName: process.env.METADATA_TABLE,
    Item: {
      id: sessionId,
      tenantId: tenantId,
      itemType: 'livekitSession',
      roomName: fullRoomName,
      participantName: participantName,
      workflowId: workflowId || 'unknown',
      startTime: new Date().toISOString(),
      status: 'created'
    }
  }).promise();
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: token,
      roomName: fullRoomName,
      sessionId: sessionId,
      expiration: new Date(Date.now() + 3600 * 1000).toISOString()
    })
  };
}

/**
 * Get voice configuration for a workflow
 * @param {string} tenantId - Tenant ID
 * @param {string} workflowId - Workflow ID
 * @returns {Object} - API Gateway response
 */
async function getVoiceConfig(tenantId, workflowId) {
  if (!workflowId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'WorkflowId parameter is required'
      })
    };
  }
  
  const voiceConfig = await getWorkflowVoiceConfig(workflowId, tenantId);
  
  // Return sanitized configuration (no secrets)
  const sanitizedConfig = {
    voiceId: voiceConfig.voiceId || 'Neural',
    language: voiceConfig.language || 'en-US',
    sampleRate: voiceConfig.sampleRate || 16000,
    useSSML: voiceConfig.useSSML || false,
    enableRealTimeTranscription: voiceConfig.enableRealTimeTranscription !== false,
    voiceOptions: {
      pitch: voiceConfig.voiceOptions?.pitch || 0,
      rate: voiceConfig.voiceOptions?.rate || 1.0,
      volume: voiceConfig.voiceOptions?.volume || 1.0
    },
    roomName: voiceConfig.roomName,
    hasLivekitConfig: !!(voiceConfig.livekitApiKey && voiceConfig.livekitApiSecret)
  };
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      config: sanitizedConfig
    })
  };
}

/**
 * Get voice configuration for a workflow from DynamoDB
 * @param {string} workflowId - Workflow ID
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - Voice configuration
 */
async function getWorkflowVoiceConfig(workflowId, tenantId) {
  try {
    const workflowData = await dynamoDB.get({
      TableName: process.env.WORKFLOW_TABLE,
      Key: {
        id: workflowId,
        tenantId: tenantId
      }
    }).promise();
    
    if (!workflowData.Item) {
      return {};
    }
    
    // Find voice node in the workflow
    const nodes = workflowData.Item.nodes || [];
    const voiceNode = nodes.find(node => node.type === 'voiceNode');
    
    if (!voiceNode || !voiceNode.data || !voiceNode.data.config) {
      return {};
    }
    
    return voiceNode.data.config;
  } catch (error) {
    console.error('Error getting workflow voice config:', error);
    return {};
  }
}

/**
 * Record voice usage for billing and analytics
 * @param {string} tenantId - Tenant ID
 * @param {string} usageType - Usage type (tts or stt)
 * @param {number} characters - Number of characters processed
 * @param {string} workflowId - Workflow ID
 */
async function recordVoiceUsage(tenantId, usageType, characters, workflowId) {
  try {
    const timestamp = new Date().toISOString();
    const usageId = uuidv4();
    
    await dynamoDB.put({
      TableName: process.env.METADATA_TABLE,
      Item: {
        id: usageId,
        tenantId: tenantId,
        itemType: 'voiceUsage',
        usageType: usageType,
        characters: characters,
        workflowId: workflowId || 'unknown',
        timestamp: timestamp,
        date: timestamp.split('T')[0]
      }
    }).promise();
  } catch (error) {
    console.error('Error recording voice usage:', error);
    // Continue execution even if recording fails
  }
}