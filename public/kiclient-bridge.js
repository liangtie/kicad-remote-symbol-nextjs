// Install KiClient bridge as early as possible
(function() {
  const existing = window.kiclient || {};
  const previousPost = typeof existing.postMessage === "function" ? existing.postMessage.bind(existing) : null;
  
  existing.postMessage = function(incoming) {
    console.log('KiClient Receive msg from KiCad:', incoming);
    // Store message for later processing
    if (!window.kicadMessages) {
      window.kicadMessages = [];
    }
    window.kicadMessages.push(incoming);
    
    // Parse and handle NEW_SESSION message directly in bridge
    try {
      const message = JSON.parse(incoming);
      if (message.command === 'NEW_SESSION' && message.status === 'OK' && message.session_id) {
        console.log('KiClient: Storing session ID:', message.session_id);
        window.kicadSessionId = message.session_id;
      }
    } catch (e) {
      console.error('KiClient: Error parsing message:', e);
    }
    
    if (previousPost) {
      previousPost(incoming);
    }
  };
  
  window.kiclient = existing;
})();