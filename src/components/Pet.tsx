import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PetStatus, CalendarEvent, ChatMessage } from '../types';
import { Heart, Zap, Dessert } from 'lucide-react';
import { Chat } from './Chat';
import { cn } from '../lib/utils';
const { ipcRenderer } = window.require('electron');

interface PetProps {
  status: PetStatus;
  isTalking: boolean;
  lastMessage: string;
  onFeed: () => void;
  onPlay: () => void;
  onRest: () => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  showChatInput?: boolean;
  onSendMessage?: (text: string) => void;
  isLoading?: boolean;
  messages: ChatMessage[];
  dragConstraints?: React.RefObject<HTMLDivElement>;
}

export const Pet: React.FC<PetProps> = ({ 
  status, isTalking, lastMessage, onFeed, onPlay, onRest, onDoubleClick,
  showChatInput, onSendMessage, isLoading, messages, dragConstraints
}) => {
  return (
    <div className="flex flex-col items-center gap-6 relative pointer-events-none">
      
      {/* Pet Interaction Bubble (Status) - DRAGGABLE INDEPENDENTLY */}
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={dragConstraints}
        onMouseEnter={() => ipcRenderer.send('pet-hover')}
        onMouseLeave={() => ipcRenderer.send('pet-leave')}
        className="fixed top-12 left-1/2 -translate-x-1/2 flex gap-4 bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl cursor-move select-none z-[70] min-w-[280px] justify-around pointer-events-auto"
      >
        <div className="flex items-center gap-2">
          <Dessert className="w-3 h-3 text-orange-400" />
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${status.hunger}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-3 h-3 text-red-400" />
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-red-400"
              initial={{ width: 0 }}
              animate={{ width: `${status.happiness}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-yellow-500" />
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-yellow-500"
              initial={{ width: 0 }}
              animate={{ width: `${status.energy}%` }}
            />
          </div>
        </div>
      </motion.div>
 
      {/* The Main Pet Unit - EVERYTHING HERE DRAGS TOGETHER */}
      <motion.div
        drag
        dragConstraints={dragConstraints}
        dragElastic={0.05}
        whileDrag={{ scale: 1.05 }}
        onMouseEnter={() => ipcRenderer.send('pet-hover')}
        onMouseLeave={() => ipcRenderer.send('pet-leave')}
        className="group relative flex flex-col items-center z-50 pointer-events-auto cursor-grab active:cursor-grabbing"
      >
        {/* Speech Bubble - Relative to current position */}
        <AnimatePresence>
          {lastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 bg-white text-slate-900 p-4 rounded-3xl shadow-2xl z-[60] border-2 border-indigo-100 pointer-events-none"
            >
              <p className="text-sm font-medium leading-relaxed">{lastMessage}</p>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r-2 border-b-2 border-indigo-100" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character Visual */}
        <div 
          onDoubleClick={onDoubleClick}
          className="w-48 h-48 relative pointer-events-auto cursor-grab active:cursor-grabbing"
        >
          <motion.div
            animate={{
              y: [-5, 5],
              scale: isTalking ? [1, 1.05] : 1,
            }}
            transition={{
              y: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
              scale: { duration: 0.2, repeat: isTalking ? Infinity : 0, repeatType: "reverse" }
            }}
            className="w-full h-full"
          >
            <div className={cn(
              "absolute inset-0 transition-colors duration-500 rounded-[50%_50%_40%_40%] shadow-xl border-4 border-white/20 overflow-hidden",
              status.hunger < 30 ? "bg-gradient-to-br from-orange-400 to-amber-600" :
              status.energy < 30 ? "bg-gradient-to-br from-slate-400 to-slate-600" :
              "bg-gradient-to-br from-indigo-400 to-purple-600"
            )}>
              <div className="absolute top-[50%] left-[15%] w-6 h-3 bg-red-400/30 blur-sm rounded-full" />
              <div className="absolute top-[50%] right-[15%] w-6 h-3 bg-red-400/30 blur-sm rounded-full" />
              <div className="absolute top-[35%] left-[25%] flex flex-col items-center gap-1">
                <motion.div 
                  animate={{ 
                    scaleY: status.energy < 30 ? 0.3 : [1, 0.1, 1],
                    opacity: status.energy < 30 ? 0.5 : 1
                  }}
                  transition={{ duration: 4, repeat: Infinity, times: [0.95, 0.98, 1] }}
                  className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
                >
                  <div className="w-3 h-3 bg-slate-900 rounded-full" />
                </motion.div>
              </div>
              <div className="absolute top-[35%] right-[25%] flex flex-col items-center gap-1">
                <motion.div 
                  animate={{ 
                    scaleY: status.energy < 30 ? 0.3 : [1, 0.1, 1],
                    opacity: status.energy < 30 ? 0.5 : 1
                  }}
                  transition={{ duration: 4, repeat: Infinity, times: [0.96, 0.99, 1] }}
                  className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
                >
                  <div className="w-3 h-3 bg-slate-900 rounded-full" />
                </motion.div>
              </div>
              <div className="absolute top-[55%] left-1/2 -translate-x-1/2">
                <motion.div 
                  animate={{
                    height: isTalking ? [8, 16] : (status.energy < 20 || status.hunger < 20 ? 4 : 8),
                    width: isTalking ? [12, 16] : (status.energy < 20 || status.hunger < 20 ? 20 : 12),
                    borderRadius: isTalking ? "50%" : "0 0 10px 10px"
                  }}
                  className="bg-slate-900"
                />
              </div>
            </div>
            <div className="absolute -top-4 left-6 w-8 h-12 bg-indigo-500 rounded-full -rotate-12 -z-10" />
            <div className="absolute -top-4 right-6 w-8 h-12 bg-indigo-500 rounded-full rotate-12 -z-10" />
          </motion.div>
        </div>

        {/* Action Buttons - These follow the pet */}
        <div 
          className="absolute -right-24 top-0 flex flex-col gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-[70]"
          onPointerDown={(e) => e.stopPropagation()} // Prevent parent drag when clicking buttons
        >
          <button 
            onClick={onFeed}
            className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            <Dessert className="w-6 h-6" />
          </button>
          <button 
            onClick={onPlay}
            className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            <Heart className="w-6 h-6" />
          </button>
          <button 
            onClick={onRest}
            className="w-12 h-12 rounded-full bg-yellow-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            <Zap className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Input - Always below character, moves WITH character */}
        <AnimatePresence>
          {showChatInput && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 10, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="w-80 z-[100] mt-4"
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag while typing/clicking chat
            >
              <div className="bg-black/60 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-4 shadow-2xl h-80 flex flex-col">
                 <div className="flex-1 overflow-hidden pointer-events-auto">
                   <Chat 
                    messages={messages.slice(-10)} // Show last 10 messages for context
                    onSendMessage={onSendMessage || (() => {})} 
                    isLoading={isLoading || false} 
                    variant="floating"
                  />
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
