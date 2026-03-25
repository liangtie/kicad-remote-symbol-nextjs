"use client";
import { useEffect, useState } from 'react';
import samplePart from '../../data/sample_part.json';

// KiCad message channel type declaration
interface KiCadMessageChannel {
  postMessage(message: string): void;
}

declare global {
  interface Window {
    kicad?: KiCadMessageChannel;
  }
}

export default function KicadLibraryPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageIdCounter, setMessageIdCounter] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessageToKiCad = (message: any) => {
    if (window.kicad) {
      window.kicad.postMessage(JSON.stringify(message));
    } else {
      console.error('KiCad message channel not available');
      setError('KiCad message channel not available');
    }
  };

  const handleKiCadMessage = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Received message from KiCad:', message);

      // Handle NEW_SESSION response
      if (message.command === 'NEW_SESSION' && message.status === 'OK') {
        setSessionId(message.session_id);
        setIsLoading(false);
      }

      // Handle PLACE_COMPONENT response
      if (message.command === 'PLACE_COMPONENT') {
        if (message.status === 'OK') {
          setIsLoading(false);
          alert('Component placed successfully!');
        } else {
          setIsLoading(false);
          setError(`Error placing component: ${message.message || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('Error parsing message from KiCad:', e);
    }
  };

  useEffect(() => {
    // Set up event listener for messages from KiCad
    window.addEventListener('message', handleKiCadMessage);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('message', handleKiCadMessage);
    };
  }, []);

  const handlePlaceComponent = async () => {
    setIsLoading(true);
    setError(null);

    if (!sessionId) {
      // First, send NEW_SESSION to get a session ID
      const newSessionMessage = {
        version: 1,
        message_id: messageIdCounter,
        command: 'NEW_SESSION'
      };

      sendMessageToKiCad(newSessionMessage);
      setMessageIdCounter(prev => prev + 1);

      // Wait for session ID (handled by the event listener)
    } else {
      // We already have a session ID, send PLACE_COMPONENT directly
      sendPlaceComponentCommand();
    }
  };

  const sendPlaceComponentCommand = () => {
    if (!sessionId) return;

    const placeComponentMessage = {
      version: 1,
      session_id: sessionId,
      message_id: messageIdCounter,
      command: 'PLACE_COMPONENT',
      parameters: {
        part_id: 'LM73',
        display_name: 'LM73 Temperature Sensor',
        mode: 'PLACE',
        assets: [
          {
            asset_type: 'symbol',
            name: 'LM73',
            target_library: 'Remote',
            target_name: 'LM73',
            content_type: 'application/json',
            download_url: samplePart.symbol,
            size_bytes: 1024, // Placeholder
            sha256: '' // Placeholder
          },
          {
            asset_type: 'footprint',
            name: 'SOT-23-6',
            target_library: 'Remote',
            target_name: 'SOT-23-6',
            content_type: 'application/json',
            download_url: samplePart.footprint,
            size_bytes: 1024, // Placeholder
            sha256: '' // Placeholder
          },
          {
            asset_type: '3dmodel',
            name: 'SOT-23-6',
            target_library: 'Remote',
            target_name: 'SOT-23-6',
            content_type: 'application/step',
            download_url: samplePart['3dmodel'],
            size_bytes: 1024, // Placeholder
            sha256: '' // Placeholder
          }
        ]
      }
    };

    sendMessageToKiCad(placeComponentMessage);
    setMessageIdCounter(prev => prev + 1);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">KiCad Library Panel</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <button 
        onClick={handlePlaceComponent} 
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        {isLoading ? 'Processing...' : 'Place Component'}
      </button>
      
      {sessionId && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Session ID: {sessionId}
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Sample Part</h2>
        <pre className="whitespace-pre-wrap">{JSON.stringify(samplePart, null, 2)}</pre>
      </div>
    </div>
  );
}
