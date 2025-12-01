import React, { useEffect, useRef } from 'react';
import { TranscriptionMessage } from '../types';

interface ChatHistoryProps {
  messages: TranscriptionMessage[];
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col space-y-4 max-h-60 overflow-y-auto p-4 bg-midnight-purple/50 rounded-xl border border-white/10 scrollbar-hide">
      {messages.length === 0 && (
        <p className="text-gray-500 text-center text-sm italic">
          Start the battle to see the conversation...
        </p>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${
            msg.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
              msg.sender === 'user'
                ? 'bg-electric-blue text-black rounded-tr-none'
                : 'bg-bollywood-pink text-white rounded-tl-none'
            }`}
          >
            <p className="font-bold text-xs mb-1 opacity-75">
              {msg.sender === 'user' ? 'You' : 'Ananya 🇮🇳'}
            </p>
            <p>{msg.text}</p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatHistory;