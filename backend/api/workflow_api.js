// workflow_api.js - API for workflow operations in the AI Workflow Manager

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const stepFunctions = new AWS.StepFunctions();

/**
 * Handler for workflow API operations
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Object} - API Gateway response
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract tenant ID from request context
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
    
    // Parse path and HTTP method to determine operation
    const path = event.path;
    const httpMethod = event.httpMethod;
    
    // Handle different API operations based on path and method
    if (path === '/workflows' && httpMethod === 'GET') {
      return await listWorkflows(tenantId);
    } else if (path === '/workflows' && httpMethod === 'POST') {
      return await createWorkflow(event.body, tenantId);
    } else if (path.match(/^\/workflows\/[\w-]+$/) && httpMethod === 'GET') {
      const workflowId = path.split('/').pop();
      return await getWorkflow(workflowId, tenantId);
    } else if (path.match(/^\/workflows\/[\w-]+$/) && httpMethod === 'PUT') {
      const workflowId = path.split('/').pop();
      return await updateWorkflow(workflowId, event.body, tenantId);
    } else if (path.match(/^\/workflows\/[\w-]+$/) && httpMethod === 'DELETE') {
      const workflowId = path.split('/').pop();
      return await deleteWorkflow(workflowId, tenantId);
    } else if (path.match(/^\/workflows\/[\w-]+\/execute$/) && httpMethod === 'POST') {
      const workflowId = path.split('/')[2];
      return await executeWorkflow(workflowId, event.body, tenantId);
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
    console.error('Error in workflow API:', error);
    
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
 * List all workflows for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function listWorkflows(tenantId) {
  try {
    const result = await dynamoDB.query({
      TableName: process.env.WORKFLOW_TABLE,
      IndexName: 'TenantIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    }).promise();
    
    // Map to simplified objects
    const workflows = result.Items.map(item => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      status: item.status
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflows
      })
    };
  } catch (error) {
    console.error('Error listing workflows:', error);
    throw error;
  }
}

/**
 * Get a specific workflow
 * @param {string} workflowId - Workflow ID
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function getWorkflow(workflowId, tenantId) {
  try {
    const result = await dynamoDB.get({
      TableName: process.env.WORKFLOW_TABLE,
      Key: {
        id: workflowId,
        tenantId
      }
    }).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Workflow not found'
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow: result.Item
      })
    };
  } catch (error) {
    console.error('Error getting workflow:', error);
    throw error;
  }
}

/**
 * Create a new workflow
 * @param {string} body - Request body
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function createWorkflow(body, tenantId) {
  try {
    const data = JSON.parse(body);
    
    if (!data.workflow || !data.workflow.name) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Invalid workflow data'
        })
      };
    }
    
    const timestamp = new Date().toISOString();
    const workflowId = uuidv4();
    
    const workflowItem = {
      id: workflowId,
      tenantId,
      name: data.workflow.name,
      nodes: data.workflow.nodes || [],
      edges: data.workflow.edges || [],
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'draft'
    };
    
    await dynamoDB.put({
      TableName: process.env.WORKFLOW_TABLE,
      Item: workflowItem
    }).promise();
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflowId,
        success: true
      })
    };
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
}

/**
 * Update an existing workflow
 * @param {string} workflowId - Workflow ID
 * @param {string} body - Request body
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function updateWorkflow(workflowId, body, tenantId) {
  try {
    // First check if workflow exists and belongs to tenant
    const existingWorkflow = await dynamoDB.get({
      TableName: process.env.WORKFLOW_TABLE,
      Key: {
        id: workflowId,
        tenantId
      }
    }).promise();
    
    if (!existingWorkflow.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Workflow not found'
        })
      };
    }
    
    const data = JSON.parse(body);
    
    if (!data.workflow) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Invalid workflow data'
        })
      };
    }
    
    const timestamp = new Date().toISOString();
    
    const updateParams = {
      TableName: process.env.WORKFLOW_TABLE,
      Key: {
        id: workflowId,
        tenantId
      },
      UpdateExpression: 'set #name = :name, nodes = :nodes, edges = :edges, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': data.workflow.name,
        ':nodes': data.workflow.nodes || [],
        ':edges': data.workflow.edges || [],
        ':updatedAt': timestamp
      },
      ReturnValues: 'UPDATED_NEW'
    };
    
    await dynamoDB.update(updateParams).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true
      })
    };
  } catch (error) {
    console.error('Error updating workflow:', error);
    throw error;
  }
}

/**
 * Delete a workflow
 * @param {string} workflowId - Workflow ID
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function deleteWorkflow(workflowId, tenantId) {
  try {
    // First check if workflow exists and belongs to tenant
    const existingWorkflow = await dynamoDB.get({
      TableName: process.env.WORKFLOW_TABLE,
      Key: {
        id: workflowId,
        tenantId
      }
    }).promise();
    
    if (!existingWorkflow.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Workflow not found'
        })
      };
    }
    
    await dynamoDB.delete({
      TableName: process.env.WORKFLOW_TABLE,
      Key: {
        id: workflowId,
        tenantId
      }
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true
      })
    };
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw error;
  }
}

/**
 * Execute a workflow using Step Functions
 * @param {string} workflowId - Workflow ID
 * @param {string} body - Request body with execution parameters
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - API Gateway response
 */
async function executeWorkflow(workflowId, body, tenantId) {
  try {
    // First check if workflow exists and belongs to tenant
    const existingWorkflow = await dynamoDB.get({
      TableName: process.env.WORKFLOW_TABLE,
      Key: {
        id: workflowId,
        tenantId
      }
    }).promise();
    
    if (!existingWorkflow.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Workflow not found'
        })
      };
    }
    
    // Extract RAG nodes from workflow
    const ragNodes = existingWorkflow.Item.nodes.filter(
      node => node.type === 'ragNode'
    );
    
    if (ragNodes.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Workflow has no RAG nodes to execute'
        })
      };
    }
    
    const executionData = JSON.parse(body) || {};
    
    // Build Step Functions input
    const stepFunctionsInput = {
      tenantId,
      workflowId,
      dataSources: ragNodes.flatMap(node => 
        node.data?.config?.dataSources || []
      ),
      config: {
        crawlDepth: Math.max(...ragNodes.map(node => 
          node.data?.config?.crawlDepth || 1
        )),
        memoryDuration: Math.max(...ragNodes.map(node => 
          node.data?.config?.memoryDuration || 60
        )),
        embeddingModel: ragNodes[0]?.data?.config?.embeddingModel || 
          'sentence-transformers/all-MiniLM-L6-v2',
        maxDocuments: Math.max(...ragNodes.map(node => 
          node.data?.config?.maxDocuments || 5
        ))
      },
      ...executionData
    };
    
    // Start Step Functions execution
    const execution = await stepFunctions.startExecution({
      stateMachineArn: process.env.RAG_STATE_MACHINE_ARN,
      name: `${tenantId}-${workflowId}-${Date.now()}`,
      input: JSON.stringify(stepFunctionsInput)
    }).promise();
    
    // Record execution in DynamoDB
    const timestamp = new Date().toISOString();
    await dynamoDB.put({
      TableName: process.env.METADATA_TABLE,
      Item: {
        id: execution.executionArn.split(':').pop(),
        tenantId,
        itemType: 'execution',
        workflowId,
        executionArn: execution.executionArn,
        status: 'RUNNING',
        startTime: timestamp,
        createdAt: timestamp
      }
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        executionArn: execution.executionArn,
        success: true
      })
    };
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
}