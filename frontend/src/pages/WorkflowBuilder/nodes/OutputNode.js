// OutputNode.js - Output node component for workflow builder
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const OutputNode = ({ data, selected }) => {
  return (
    <div className={`relative rounded-lg px-4 pt-3 pb-2 border-2 ${selected ? 'border-gray-500' : 'border-gray-200'} bg-white shadow-md w-64`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 rounded-full bg-gray-500 border-2 border-white"
      />
      
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{data.label}</h4>
          <p className="text-xs text-gray-500">Final chatbot output</p>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded p-2 mb-2">
        <div className="grid grid-cols-1 gap-2">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Chatbot Name</p>
            <p className="text-xs text-gray-900">{data.config?.name || "Unnamed Chatbot"}</p>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs text-gray-600">
          Connect all necessary components to create a complete chatbot workflow.
        </p>
      </div>
    </div>
  );
};

export default memo(OutputNode);