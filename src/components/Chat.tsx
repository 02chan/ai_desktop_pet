import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  variant?: 'floating' | 'log';
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading, variant = 'floating' }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLogMode = variant === 'log';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
      <div className={cn(
        "flex flex-col w-full transition-all",
        isLogMode ? "h-full bg-transparent border-none p-0" : "h-full rounded-[2.5rem] max-w-lg bg-black/40 backdrop-blur-xl border border-white/10 p-6 shadow-2xl"
      )}>
      {!isLogMode && (
        <div className="flex items-center gap-2 mb-4 px-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest">Talk to Moni</h3>
        </div>
      )}

      <div ref={scrollRef} className={cn(
        "flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide",
        messages.length > 0 ? "mb-4" : ""
      )}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                msg.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white/10 text-white border border-white/5 rounded-tl-none"
              )}>
                {msg.parts[0].text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-2 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Moni에게 말을 걸어보세요..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-5 pr-12 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
        />
        <button 
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-400 transition-colors disabled:opacity-50"
          disabled={!input.trim() || isLoading}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

