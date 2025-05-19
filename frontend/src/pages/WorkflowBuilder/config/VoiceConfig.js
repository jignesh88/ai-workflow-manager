// VoiceConfig.js - Configuration panel for voice integration node
import React, { useState } from 'react';

const VoiceConfig = ({ node, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    voiceId: node.data?.config?.voiceId || 'Neural',
    language: node.data?.config?.language || 'en-US',
    sampleRate: node.data?.config?.sampleRate || 16000,
    useSSML: node.data?.config?.useSSML || false,
    enableRealTimeTranscription: node.data?.config?.enableRealTimeTranscription !== false, // default to true
    interruptionDetection: node.data?.config?.interruptionDetection || false,
    voiceOptions: node.data?.config?.voiceOptions || {
      pitch: 0,
      rate: 1.0,
      volume: 1.0
    },
    roomName: node.data?.config?.roomName || '',
    livekitApiKey: node.data?.config?.livekitApiKey || '',
    livekitApiSecret: node.data?.config?.livekitApiSecret || ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              name === 'sampleRate' ? parseInt(value, 10) : value
    }));
  };

  const handleVoiceOptionChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    
    setFormData(prev => ({
      ...prev,
      voiceOptions: {
        ...prev.voiceOptions,
        [name]: numValue
      }
    }));
  };

  const testVoice = () => {
    // In a real app, this would trigger a text-to-speech sample
    const utterance = new SpeechSynthesisUtterance('This is a test of the voice configuration.');
    utterance.rate = formData.voiceOptions.rate;
    utterance.pitch = formData.voiceOptions.pitch;
    utterance.volume = formData.voiceOptions.volume;
    speechSynthesis.speak(utterance);
  };

  const handleSubmit = () => {
    // Create label for the node
    const label = `Voice: ${formData.language}`;
    
    // Save the configuration
    onSave({
      ...formData,
      label
    });
  };

  return (
    <div className="w-96 border-l border-gray-200 bg-white shadow-xl p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Configure Voice Integration</h2>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Voice Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Voice Settings</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Voice Type</label>
            <select
              name="voiceId"
              value={formData.voiceId}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="Neural">Neural (High Quality)</option>
              <option value="Standard">Standard</option>
              <option value="Amy">Amy (British English)</option>
              <option value="Matthew">Matthew (US English)</option>
              <option value="Joanna">Joanna (US English)</option>
              <option value="Lupe">Lupe (US Spanish)</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              name="language"
              value={formData.language}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish (Spain)</option>
              <option value="es-US">Spanish (US)</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="it-IT">Italian</option>
              <option value="ja-JP">Japanese</option>
              <option value="ko-KR">Korean</option>
              <option value="pt-BR">Portuguese (Brazil)</option>
              <option value="zh-CN">Chinese (Mandarin)</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sample Rate (Hz)</label>
            <select
              name="sampleRate"
              value={formData.sampleRate}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="8000">8000 Hz</option>
              <option value="16000">16000 Hz</option>
              <option value="22050">22050 Hz</option>
              <option value="44100">44100 Hz</option>
            </select>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useSSML"
                name="useSSML"
                checked={formData.useSSML}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="useSSML" className="ml-2 block text-sm text-gray-700">
                Enable SSML support
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableRealTimeTranscription"
                name="enableRealTimeTranscription"
                checked={formData.enableRealTimeTranscription}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="enableRealTimeTranscription" className="ml-2 block text-sm text-gray-700">
                Enable real-time transcription
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="interruptionDetection"
                name="interruptionDetection"
                checked={formData.interruptionDetection}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="interruptionDetection" className="ml-2 block text-sm text-gray-700">
                Enable interruption detection
              </label>
            </div>
          </div>
        </div>
        
        {/* Voice Tuning */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Voice Tuning</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pitch ({formData.voiceOptions.pitch})
              </label>
              <input
                type="range"
                name="pitch"
                min="-10"
                max="10"
                step="1"
                value={formData.voiceOptions.pitch}
                onChange={handleVoiceOptionChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Lower</span>
                <span>Higher</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speed ({formData.voiceOptions.rate.toFixed(1)})
              </label>
              <input
                type="range"
                name="rate"
                min="0.5"
                max="2.0"
                step="0.1"
                value={formData.voiceOptions.rate}
                onChange={handleVoiceOptionChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume ({formData.voiceOptions.volume.toFixed(1)})
              </label>
              <input
                type="range"
                name="volume"
                min="0"
                max="1.0"
                step="0.1"
                value={formData.voiceOptions.volume}
                onChange={handleVoiceOptionChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Quieter</span>
                <span>Louder</span>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                type="button"
                onClick={testVoice}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                Test Voice
              </button>
            </div>
          </div>
        </div>
        
        {/* LiveKit Integration */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">LiveKit Integration</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
            <input
              type="text"
              name="roomName"
              value={formData.roomName}
              onChange={handleInputChange}
              placeholder="my-chatbot-room"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Name for the LiveKit room (can include tenant variables)</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">LiveKit API Key</label>
            <input
              type="password"
              name="livekitApiKey"
              value={formData.livekitApiKey}
              onChange={handleInputChange}
              placeholder="API key from LiveKit"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">LiveKit API Secret</label>
            <input
              type="password"
              name="livekitApiSecret"
              value={formData.livekitApiSecret}
              onChange={handleInputChange}
              placeholder="API secret from LiveKit"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Submit & Cancel Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceConfig;