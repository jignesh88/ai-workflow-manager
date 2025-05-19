// RagNode.js - RAG pipeline node component for workflow builder
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const RagNode = ({ data, selected }) => {
  const sourcesCount = data.config?.dataSources?.length || 0;
  const memoryDuration = data.config?.memoryDuration || 60;
  const embeddingModel = data.config?.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2';
  
  // Simplified model name for display
  const modelDisplay = embeddingModel.includes('MiniLM') ? 'MiniLM (Fast)' : 
                       embeddingModel.includes('multi-qa') ? 'Multi-QA (Accurate)' : 
                       'MPNet (Balanced)';
  
  return (
    <div className={`relative rounded-lg px-4 pt-3 pb-2 border-2 ${selected ? 'border-indigo-500' : 'border-indigo-200'} bg-white shadow-md w-64`}>
      {data.handles?.includes('target') && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white"
        />
      )}
      
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{data.label}</h4>
          <p className="text-xs text-gray-500">{sourcesCount} data source{sourcesCount !== 1 ? 's' : ''}</p>
        </div>
      </div>
      
      <div className="bg-indigo-50 rounded p-2 mb-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs font-medium text-indigo-700 mb-1">Memory Duration</p>
            <p className="text-xs text-indigo-900">{memoryDuration} minutes</p>
          </div>
          <div>
            <p className="text-xs font-medium text-indigo-700 mb-1">Embedding Model</p>
            <p className="text-xs text-indigo-900">{modelDisplay}</p>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs text-gray-500">Data Sources:</p>
        <ul className="mt-1 space-y-1">
          {data.config?.dataSources?.slice(0, 3).map((source, index) => (
            <li key={index} className="text-xs truncate text-gray-600">
              • {source.name || source.url || `Source ${index + 1}`}
            </li>
          ))}
          {sourcesCount > 3 && (
            <li className="text-xs text-gray-500">
              • {sourcesCount - 3} more...
            </li>
          )}
        </ul>
      </div>
      
      {data.handles?.includes('source') && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white"
        />
      )}
    </div>
  );
};

export default memo(RagNode);