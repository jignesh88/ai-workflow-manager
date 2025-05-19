// DocumentNode.js - Document upload node component for workflow builder
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const DocumentNode = ({ data, selected }) => {
  const allowedTypes = data.config?.allowedFileTypes || ['.pdf', '.docx', '.txt'];
  const maxFileSizeMB = data.config?.maxFileSize || 10;
  
  return (
    <div className={`relative rounded-lg px-4 pt-3 pb-2 border-2 ${selected ? 'border-blue-500' : 'border-blue-200'} bg-white shadow-md w-64`}>
      {data.handles?.includes('target') && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"
        />
      )}
      
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{data.label}</h4>
          <p className="text-xs text-gray-500">Document Processing</p>
        </div>
      </div>
      
      <div className="bg-blue-50 rounded p-2 mb-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs font-medium text-blue-700 mb-1">Allowed File Types</p>
            <p className="text-xs text-blue-900">{allowedTypes.join(', ')}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700 mb-1">Max File Size</p>
            <p className="text-xs text-blue-900">{maxFileSizeMB} MB</p>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs text-gray-600">
          Users can upload documents to be processed by the chatbot.
        </p>
      </div>
      
      {data.handles?.includes('source') && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"
        />
      )}
    </div>
  );
};

export default memo(DocumentNode);