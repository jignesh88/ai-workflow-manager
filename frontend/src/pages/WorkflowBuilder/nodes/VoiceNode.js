// VoiceNode.js - Voice integration node component for workflow builder
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const VoiceNode = ({ data, selected }) => {
  const voiceId = data.config?.voiceId || 'Neural';
  const language = data.config?.language || 'en-US';
  const useSSML = data.config?.useSSML || false;
  
  return (
    <div className={`relative rounded-lg px-4 pt-3 pb-2 border-2 ${selected ? 'border-yellow-500' : 'border-yellow-200'} bg-white shadow-md w-64`}>
      {data.handles?.includes('target') && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white"
        />
      )}
      
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{data.label}</h4>
          <p className="text-xs text-gray-500">Voice Capabilities</p>
        </div>
      </div>
      
      <div className="bg-yellow-50 rounded p-2 mb-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs font-medium text-yellow-700 mb-1">Voice</p>
            <p className="text-xs text-yellow-900">{voiceId}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-yellow-700 mb-1">Language</p>
            <p className="text-xs text-yellow-900">{language}</p>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs text-gray-500 mb-1">Features:</p>
        <ul className="space-y-1">
          <li className="text-xs text-gray-600">
            • Speech Recognition
          </li>
          <li className="text-xs text-gray-600">
            • Text-to-Speech
          </li>
          {useSSML && (
            <li className="text-xs text-gray-600">
              • SSML Support
            </li>
          )}
        </ul>
      </div>
      
      {data.handles?.includes('source') && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white"
        />
      )}
    </div>
  );
};

export default memo(VoiceNode);