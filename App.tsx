import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveClient } from './services/liveClient';
import { ConnectionStatus, TranscriptionMessage } from './types';
import Visualizer from './components/Visualizer';
import ChatHistory from './components/ChatHistory';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [inputVol, setInputVol] = useState(0);
  const [outputVol, setOutputVol] = useState(0);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  
  const liveClientRef = useRef<LiveClient | null>(null);
  const currentTranscriptRef = useRef<{ user: string; model: string }>({ user: '', model: '' });

  useEffect(() => {
    const client = new LiveClient();
    liveClientRef.current = client;

    client.onStatusChange = (newStatus) => {
      setStatus(newStatus);
    };

    client.onVolumeChange = (input, output) => {
      setInputVol(input);
      // Decay output volume visually if no new data comes in immediately, 
      // but here we just set it. The smooth decay happens in the visualizer usually, 
      // or we can debounce here. For simplicity, direct mapping.
      setOutputVol(output);
    };

    client.onTranscription = (text, sender, isComplete) => {
      if (isComplete) {
         // This logic depends on how we want to display rolling text vs final blocks.
         // For a "Live" feel, we might want to update the last message or add new ones.
         // Let's implement a simple rolling buffer logic.
         return;
      }
      
      setMessages(prev => {
         const newMessages = [...prev];
         const lastMsg = newMessages[newMessages.length - 1];
         
         // Heuristic: If the sender changed or it's a new turn (based on time or empty text reset), create new bubble
         // Here we simply append if the last message was from a different sender, otherwise update.
         if (!lastMsg || lastMsg.sender !== sender) {
             newMessages.push({
                 id: Date.now().toString(),
                 sender,
                 text,
                 timestamp: Date.now()
             });
         } else {
            // Update last message
            // Note: The API sends cumulative segments for a turn or chunks. 
            // If chunks are cumulative (usually are in transcription), just replace.
            // If they are delta, append.
            // The Live API transcription behavior: usually sends partial updates.
            // We will append text for this demo assuming chunks.
            // Actually, based on experience, it sends chunks. We'll simply append.
            lastMsg.text += text;
         }
         return newMessages;
      });
    };

    return () => {
      client.disconnect();
    };
  }, []);

  const handleToggleConnection = useCallback(async () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      await liveClientRef.current?.disconnect();
    } else {
      setMessages([]); // Clear chat on new session
      await liveClientRef.current?.connect();
    }
  }, [status]);

  const getStatusColor = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED: return 'text-green-400';
      case ConnectionStatus.CONNECTING: return 'text-yellow-400';
      case ConnectionStatus.ERROR: return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED: return 'Live On Air';
      case ConnectionStatus.CONNECTING: return 'Connecting to Mumbai...';
      case ConnectionStatus.ERROR: return 'Connection Failed';
      default: return 'Ready to Battle';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e] via-[#0f0518] to-[#2d0b38] z-0"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-bollywood-pink opacity-20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-electric-blue opacity-10 rounded-full blur-[120px] animate-pulse"></div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-bollywood-orange via-white to-green-500 drop-shadow-lg">
            VOICE IMPROV BATTLE
          </h1>
          <p className="text-xl text-gray-300 font-light">
            Face off against <span className="text-bollywood-pink font-bold">Ananya</span> 🇮🇳
          </p>
          <div className={`flex items-center justify-center gap-2 text-sm font-mono uppercase tracking-widest ${getStatusColor()}`}>
            <span className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-400 animate-ping' : 'bg-gray-500'}`}></span>
            {getStatusText()}
          </div>
        </div>

        {/* Main Visualizer Area */}
        <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
          <Visualizer 
            inputVolume={inputVol} 
            outputVolume={outputVol} 
            isActive={status === ConnectionStatus.CONNECTED}
          />
          
          {/* Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <button
              onClick={handleToggleConnection}
              disabled={status === ConnectionStatus.CONNECTING}
              className={`
                relative group overflow-hidden px-8 py-4 rounded-full font-bold text-lg tracking-wide transition-all duration-300 transform hover:scale-105 active:scale-95
                ${status === ConnectionStatus.CONNECTED 
                  ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-500/30' 
                  : 'bg-gradient-to-r from-bollywood-pink to-orange-500 text-white ring-4 ring-pink-500/30'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <span className="relative z-10 flex items-center gap-2">
                {status === ConnectionStatus.CONNECTED ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    END BATTLE
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    START BATTLE
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Transcript Area */}
        <ChatHistory messages={messages} />
        
        <div className="text-center text-xs text-gray-500 opacity-60">
           Powered by Gemini 2.5 Live API • Ensure microphone access is enabled
        </div>
      </div>
    </div>
  );
};

export default App;