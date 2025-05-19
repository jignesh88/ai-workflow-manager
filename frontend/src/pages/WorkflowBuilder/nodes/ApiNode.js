// ApiNode.js - API integration node component for workflow builder
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const ApiNode = ({ data, selected }) => {
  const endpoint = data.config?.endpoint || '';
  const method = data.config?.method || 'GET';
  const hasHeaders = Object.keys(data.config?.headers || {}).length > 0;
  
  return (
    <div className={`relative rounded-lg px-4 pt-3 pb-2 border-2 ${selected ? 'border-green-500' : 'border-green-200'} bg-white shadow-md w-64`}>
      {data.handles?.includes('target') && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"
        />
      )}
      
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{data.label}</h4>
          <p className="text-xs text-gray-500">{method} API Integration</p>
        </div>
      </div>
      
      <div className="bg-green-50 rounded p-2 mb-2">
        <div>
          <p className="text-xs font-medium text-green-700 mb-1">Endpoint</p>
          <p className="text-xs text-green-900 break-all">{endpoint || 'Not configured'}</p>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs text-gray-500 mb-1">Attributes:</p>
        <div className="grid grid-cols-2 gap-1">
          <div className="text-xs text-gray-600">Method: {method}</div>
          <div className="text-xs text-gray-600">Headers: {hasHeaders ? 'Yes' : 'No'}</div>
        </div>
      </div>
      
      {data.handles?.includes('source') && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"
        />
      )}
    </div>
  );
};

export default memo(ApiNode);