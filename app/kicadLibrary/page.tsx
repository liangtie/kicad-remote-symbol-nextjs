"use client";
import { useEffect, useState } from 'react';
import samplePart from '../../data/sample_part.json';

// KiCad message channel type declarations
interface KiCadMessageChannel {
  postMessage(message: string): void;
}

interface KiClientMessageChannel {
  postMessage(message: string): void;
}

declare global {
  interface Window {
    kicad?: KiCadMessageChannel;
    kiclient?: KiClientMessageChannel;
    kicadMessages?: string[];
  }
}

export default function KicadLibraryPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageIdCounter, setMessageIdCounter] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [consoleMessages, setConsoleMessages] = useState<{type: 'send' | 'receive', message: string}[]>([]);

  const sendMessageToKiCad = (message: any) => {
    if (window.kicad) {
      const messageString = JSON.stringify(message, null, 2);
      window.kicad.postMessage(messageString);
      setConsoleMessages(prev => [...prev, {type: 'send', message: messageString}]);
    } else {
      console.error('KiCad message channel not available');
      setError('KiCad message channel not available');
    }
  };

  // Process incoming message from KiCad
  const processMessage = (messageString: string) => {
    try {
      const message = JSON.parse(messageString);
      console.log('Received message from KiCad:', message);
      setConsoleMessages(prev => [...prev, {type: 'receive', message: messageString}]);



      // Handle NEW_SESSION notification from KiCad
      if (message.command === 'NEW_SESSION' && message.status === 'OK') {
        const newSessionId = message.session_id;
        setSessionId(newSessionId);
      }

      // Handle PLACE_COMPONENT response
      if (message.command === 'PLACE_COMPONENT') {
        console.log('Handling PLACE_COMPONENT response:', message.status);
        if (message.status === 'OK') {
          alert('Component placed successfully!');
        } else {
          setError(`Error placing component: ${message.error_message || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('Error parsing message from KiCad:', e);
    }
  };

  // Handle messages from window.postMessage
  const handleKiCadMessage = (event: MessageEvent) => {
    processMessage(event.data);
  };

  useEffect(() => {
    // Set up event listener for messages from KiCad
    window.addEventListener('message', handleKiCadMessage);

    // Process any messages that were stored by the bridge before this component mounted
    if (window.kicadMessages && window.kicadMessages.length > 0) {
      window.kicadMessages.forEach(message => processMessage(message));
      // Clear the stored messages
      window.kicadMessages = [];
    }

    // Update the kiclient postMessage to process messages directly
    if (window.kiclient) {
      const previousPost = typeof window.kiclient.postMessage === "function" ? window.kiclient.postMessage.bind(window.kiclient) : null;
      
      window.kiclient.postMessage = function (incoming: string) {
        processMessage(incoming);
        if (previousPost) {
          previousPost(incoming);
        }
      };
    }

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('message', handleKiCadMessage);
    };
  }, []);

  const handlePlaceComponent = async () => {
    try {
      setError(null);

      if (!sessionId) {
        // Wait for session ID from KiCad's NEW_SESSION notification
        // If we don't get one within 5 seconds, send our own NEW_SESSION message
        setTimeout(() => {
          if (!sessionId) {
            // Send our own NEW_SESSION message as a fallback
            const newSessionMessage = {
              version: 1,
              message_id: messageIdCounter,
              command: 'NEW_SESSION'
            };

            sendMessageToKiCad(newSessionMessage);
            setMessageIdCounter(prev => prev + 1);

            // Set another timeout to check if we get a session ID
            setTimeout(() => {
              if (!sessionId) {
                setError('Failed to get session ID from KiCad');
              }
            }, 5000); // Timeout after another 5 seconds if no session ID received
          }
        }, 1000); // Wait 1 second before sending our own NEW_SESSION as fallback
      } else {
        // We already have a session ID, send PLACE_COMPONENT directly
        await sendPlaceComponentCommand();
      }
    } catch (error) {
      console.error('Error in handlePlaceComponent:', error);
      setError('Failed to place component: ' + (error as Error).message);
    }
  };

  // Function to compute SHA256 hash
  const computeSHA256 = async (data: ArrayBuffer): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Function to download asset and calculate size and SHA256
  const processAsset = async (asset: any): Promise<{size_bytes: number, sha256: string}> => {
    try {
      const response = await fetch(asset.download_url);
      const data = await response.arrayBuffer();
      const size_bytes = data.byteLength;
      const sha256 = await computeSHA256(data);
      return { size_bytes, sha256 };
    } catch (error) {
      console.error(`Error processing asset ${asset.name}:`, error);
      throw error;
    }
  };

  const sendPlaceComponentCommand = async (currentSessionId?: string) => {
    const idToUse = currentSessionId || sessionId;
    if (!idToUse) return;

    // Process each asset to get size and SHA256
    const MPN = 'LM73';
    const assets = [
      {
        asset_type: 'symbol',
        name: MPN,
        target_library: `nextpcb-${MPN}`,
        target_name: MPN,
        content_type: 'application/octet-stream',
        download_url: samplePart.symbol
      },
      {
        asset_type: 'footprint',
        name: MPN,
        target_library: 'nextpcb',
        target_name: MPN,
        content_type: 'application/octet-stream',
        download_url: samplePart.footprint
      },
      {
        asset_type: '3dmodel',
        name: MPN,
        target_library: 'nextpcb',
        target_name: MPN,
        content_type: 'application/octet-stream',
        download_url: samplePart['3dmodel']
      }
    ];

    try {
      // Process all assets in parallel
      const processedAssets = await Promise.all(
        assets.map(async (asset) => {
          const { size_bytes, sha256 } = await processAsset(asset);
          return {
            ...asset,
            size_bytes,
            sha256
          };
        })
      );

      const placeComponentMessage = {
        version: 1,
        session_id: idToUse,
        message_id: messageIdCounter,
        command: 'DL_COMPONENT',  // TODO change to 'PLACE_COMPONENT'
        parameters: {
          part_id: 'LM73',
          display_name: 'LM73 Temperature Sensor',
          mode: 'SAVE', // TODO change to 'PLACE'
          assets: processedAssets
        }
      };

      sendMessageToKiCad(placeComponentMessage);
      setMessageIdCounter(prev => prev + 1);
    } catch (error) {
      console.error('Error processing assets:', error);
      setError('Failed to process assets: ' + (error as Error).message);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-gray-100">KiCad Library Panel</h1>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <button 
        onClick={handlePlaceComponent} 
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Place Component
      </button>
      
      {sessionId && (
        <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded mb-4">
          Session ID: {sessionId}
        </div>
      )}
      
      <div className="bg-gray-800 p-4 rounded mb-4">
        <h2 className="text-xl font-semibold mb-2 text-gray-100">Sample Part</h2>
        <pre className="whitespace-pre-wrap text-gray-300">{JSON.stringify(samplePart, null, 2)}</pre>
      </div>
      
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2 text-gray-100">Console</h2>
        <div className="border border-gray-700 rounded p-2 max-h-60 overflow-y-auto">
          {consoleMessages.length === 0 ? (
            <p className="text-gray-500">No messages yet</p>
          ) : (
            consoleMessages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-2 p-2 rounded ${msg.type === 'send' ? 'bg-blue-900/50' : 'bg-green-900/50'}`}
              >
                <div className={`text-sm font-semibold ${msg.type === 'send' ? 'text-blue-400' : 'text-green-400'}`}>
                  {msg.type === 'send' ? 'Sent:' : 'Received:'}
                </div>
                <pre className="text-sm whitespace-pre-wrap text-gray-300">{msg.message}</pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
