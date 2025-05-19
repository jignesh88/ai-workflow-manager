// WorkflowBuilder.js - Main workflow builder component with React Flow
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams } from 'react-router-dom';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

// Node types
import RagNode from './nodes/RagNode';
import DocumentNode from './nodes/DocumentNode';
import ApiNode from './nodes/ApiNode';
import VoiceNode from './nodes/VoiceNode';
import OutputNode from './nodes/OutputNode';

// Configuration panels
import RagConfig from './config/RagConfig';
import DocumentConfig from './config/DocumentConfig';
import ApiConfig from './config/ApiConfig';
import VoiceConfig from './config/VoiceConfig';
import OutputConfig from './config/OutputConfig';

// Node types mapping
const nodeTypes = {
  ragNode: RagNode,
  documentNode: DocumentNode,
  apiNode: ApiNode,
  voiceNode: VoiceNode,
  outputNode: OutputNode
};

const WorkflowBuilder = () => {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  
  // Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeConfigNode, setActiveConfigNode] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isNewWorkflow, setIsNewWorkflow] = useState(false);
  
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Load workflow from API
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!workflowId || workflowId === 'new') {
        setIsNewWorkflow(true);
        
        // Initialize with a default output node for new workflows
        const initialNodes = [
          {
            id: 'output-1',
            type: 'outputNode',
            position: { x: 400, y: 350 },
            data: { label: 'Chatbot Output', handles: ['target'], config: { name: 'New Chatbot' } }
          }
        ];
        
        setNodes(initialNodes);
        setWorkflow({
          id: 'new',
          name: 'New Chatbot',
          tenantId,
          nodes: initialNodes,
          edges: []
        });
        
        return;
      }
      
      try {
        const response = await API.get('workflowApi', `/workflows/${workflowId}`, {
          headers: {
            'x-tenant-id': tenantId
          }
        });
        
        if (response?.workflow) {
          setWorkflow(response.workflow);
          
          // Initialize nodes and edges from the workflow
          setNodes(response.workflow.nodes || []);
          setEdges(response.workflow.edges || []);
        } else {
          throw new Error('Workflow not found');
        }
      } catch (err) {
        console.error('Error fetching workflow:', err);
        setError('Failed to load workflow. Please try again.');
      }
    };
    
    fetchWorkflow();
  }, [workflowId, tenantId]);

  // Save workflow to API
  const saveWorkflow = async () => {
    if (!workflow) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const updatedWorkflow = {
        ...workflow,
        name: workflow.name,
        tenantId,
        nodes,
        edges
      };
      
      let response;
      
      if (isNewWorkflow) {
        response = await API.post('workflowApi', '/workflows', {
          headers: {
            'x-tenant-id': tenantId
          },
          body: {
            workflow: updatedWorkflow
          }
        });
        
        if (response?.workflowId) {
          // Redirect to the newly created workflow
          navigate(`/builder/${response.workflowId}`);
        }
      } else {
        response = await API.put('workflowApi', `/workflows/${workflowId}`, {
          headers: {
            'x-tenant-id': tenantId
          },
          body: {
            workflow: updatedWorkflow
          }
        });
      }
      
      if (!response?.success) {
        throw new Error('Failed to save workflow');
      }
    } catch (err) {
      console.error('Error saving workflow:', err);
      setError('Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle connections between nodes
  const onConnect = useCallback((params) => {
    // Prevent multiple connections to the same target handle
    const targetConnections = edges.filter(
      edge => edge.target === params.target && edge.targetHandle === params.targetHandle
    );
    
    if (targetConnections.length > 0) {
      return;
    }
    
    setEdges(eds => addEdge(params, eds));
  }, [edges, setEdges]);

  // Initialize react flow
  const onInit = useCallback(instance => {
    setReactFlowInstance(instance);
  }, []);

  // Handle drag and drop for new nodes
  const onDragOver = useCallback(event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  const onDrop = useCallback(event => {
    event.preventDefault();
    
    if (!reactFlowWrapper.current || !reactFlowInstance) return;
    
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const nodeType = event.dataTransfer.getData('application/reactflow');
    
    if (!nodeType) return;
    
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top
    });
    
    // Create different node types
    const newNodeId = `${nodeType}-${nodes.length + 1}`;
    let newNode = {};
    
    switch (nodeType) {
      case 'rag':
        newNode = {
          id: newNodeId,
          type: 'ragNode',
          position,
          data: { 
            label: 'RAG Pipeline',
            handles: ['source', 'target'],
            config: { 
              dataSources: [{ type: 'website', url: '', name: '' }],
              crawlFrequency: 'daily',
              memoryDuration: 60
            }
          }
        };
        break;
        
      case 'document':
        newNode = {
          id: newNodeId,
          type: 'documentNode',
          position,
          data: { 
            label: 'Document Upload',
            handles: ['source', 'target'],
            config: { 
              allowedFileTypes: ['.pdf', '.docx', '.txt'],
              maxFileSize: 10
            }
          }
        };
        break;
        
      case 'api':
        newNode = {
          id: newNodeId,
          type: 'apiNode',
          position,
          data: { 
            label: 'API Integration',
            handles: ['source', 'target'],
            config: { 
              endpoint: '',
              method: 'GET',
              headers: {}
            }
          }
        };
        break;
        
      case 'voice':
        newNode = {
          id: newNodeId,
          type: 'voiceNode',
          position,
          data: { 
            label: 'Voice Integration',
            handles: ['source', 'target'],
            config: { 
              voiceId: 'Neural',
              language: 'en-US',
              sampleRate: 16000
            }
          }
        };
        break;
        
      default:
        return;
    }
    
    setNodes(nds => [...nds, newNode]);
  }, [reactFlowInstance, nodes, setNodes]);

  // Handle node click for configuration
  const onNodeClick = useCallback((event, node) => {
    setActiveConfigNode(node);
  }, []);

  // Save node configuration
  const handleSaveConfig = useCallback((updatedConfig) => {
    if (!activeConfigNode) return;
    
    setNodes(nds => nds.map(n => {
      if (n.id === activeConfigNode.id) {
        return {
          ...n,
          data: {
            ...n.data,
            config: updatedConfig,
            label: updatedConfig.label || n.data.label
          }
        };
      }
      return n;
    }));
    
    // Close config panel
    setActiveConfigNode(null);
  }, [activeConfigNode, setNodes]);

  // Close config panel
  const handleCancelConfig = useCallback(() => {
    setActiveConfigNode(null);
  }, []);

  // Update workflow name
  const handleNameChange = useCallback((e) => {
    setWorkflow(prev => ({
      ...prev,
      name: e.target.value
    }));
    
    // Update output node with new name
    const outputNode = nodes.find(n => n.type === 'outputNode');
    if (outputNode) {
      setNodes(nds => nds.map(n => {
        if (n.id === outputNode.id) {
          return {
            ...n,
            data: {
              ...n.data,
              config: {
                ...n.data.config,
                name: e.target.value
              }
            }
          };
        }
        return n;
      }));
    }
  }, [workflow, nodes, setNodes]);

  // Render configuration panel based on active node type
  const renderConfigPanel = () => {
    if (!activeConfigNode) return null;
    
    switch (activeConfigNode.type) {
      case 'ragNode':
        return (
          <RagConfig 
            node={activeConfigNode} 
            onSave={handleSaveConfig} 
            onCancel={handleCancelConfig} 
          />
        );
      case 'documentNode':
        return (
          <DocumentConfig 
            node={activeConfigNode} 
            onSave={handleSaveConfig} 
            onCancel={handleCancelConfig} 
          />
        );
      case 'apiNode':
        return (
          <ApiConfig 
            node={activeConfigNode} 
            onSave={handleSaveConfig} 
            onCancel={handleCancelConfig} 
          />
        );
      case 'voiceNode':
        return (
          <VoiceConfig 
            node={activeConfigNode} 
            onSave={handleSaveConfig} 
            onCancel={handleCancelConfig} 
          />
        );
      case 'outputNode':
        return (
          <OutputConfig 
            node={activeConfigNode} 
            onSave={handleSaveConfig} 
            onCancel={handleCancelConfig} 
          />
        );
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="mb-4 text-gray-700">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={workflow.name}
            onChange={handleNameChange}
            className="border-0 text-lg font-medium focus:ring-0 focus:outline-none"
            placeholder="Untitled Chatbot"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={saveWorkflow}
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex">
        {/* Node Palette */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
          <h2 className="font-medium text-gray-700 mb-4">Nodes</h2>
          <div className="space-y-3">
            <div
              className="bg-white p-3 border border-gray-200 rounded-md shadow-sm cursor-move flex items-center"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'rag')}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
              <span>RAG Pipeline</span>
            </div>
            
            <div
              className="bg-white p-3 border border-gray-200 rounded-md shadow-sm cursor-move flex items-center"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'document')}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Document Upload</span>
            </div>
            
            <div
              className="bg-white p-3 border border-gray-200 rounded-md shadow-sm cursor-move flex items-center"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'api')}
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <span>API Integration</span>
            </div>
            
            <div
              className="bg-white p-3 border border-gray-200 rounded-md shadow-sm cursor-move flex items-center"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'voice')}
            >
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Voice Integration</span>
            </div>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.type === 'ragNode') return '#6366f1';
                if (n.type === 'documentNode') return '#3b82f6';
                if (n.type === 'apiNode') return '#10b981';
                if (n.type === 'voiceNode') return '#f59e0b';
                if (n.type === 'outputNode') return '#6b7280';
                return '#ff0072';
              }}
              nodeColor={(n) => {
                if (n.type === 'ragNode') return '#e0e7ff';
                if (n.type === 'documentNode') return '#dbeafe';
                if (n.type === 'apiNode') return '#d1fae5';
                if (n.type === 'voiceNode') return '#fef3c7';
                if (n.type === 'outputNode') return '#f3f4f6';
                return '#fff';
              }}
            />
            <Background color="#f9fafb" gap={16} />
            
            <Panel position="bottom-center">
              <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                <div className="text-xs text-gray-500">
                  Drag nodes from the palette and connect them to create your chatbot workflow
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
        
        {/* Configuration Panel */}
        {renderConfigPanel()}
      </div>
    </div>
  );
};

export default WorkflowBuilder;