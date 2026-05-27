import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Settings, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from '../types';
import { cn } from '../lib/utils';

const { ipcRenderer } = window.require('electron');

interface CalendarProps {
  events: CalendarEvent[];
  onAddEvent: (date: Date) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onRemoveEvent: (id: string) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  textColor?: string;
  onOpenSettings?: (color: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ 
  events, 
  onAddEvent, 
  onUpdateEvent,
  onRemoveEvent,
  isLocked,
  onToggleLock,
  textColor = '#000000',
  onOpenSettings 
}) => {
  const [showSettingsInternal, setShowSettingsInternal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div onMouseEnter={() => ipcRenderer.send('calendar-hover')}
  onMouseLeave={() => ipcRenderer.send('calendar-leave')}className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-6 shadow-2xl w-full max-w-md pointer-events-auto group/calendar relative transition-all duration-500">
      <AnimatePresence>
        {showSettingsInternal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 bg-white/95 rounded-3xl p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-black">
                <Settings className="w-4 h-4" />
                Settings
              </h3>
              <button 
                onClick={() => setShowSettingsInternal(false)}
                className="p-2 hover:bg-black/5 rounded-full text-black"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <label className="text-[10px] text-black/40 block mb-2 font-black uppercase tracking-widest text-black">Text & Highlight Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {['#000000', '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4d7c0f', '#4b5563'].map(color => (
                    <button
                      key={color}
                      onClick={() => onOpenSettings?.(color)}
                      className={cn(
                        "w-full aspect-square rounded-full border-2 transition-transform active:scale-95",
                        textColor === color ? "border-black scale-110 shadow-lg" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowSettingsInternal(false)}
              className="w-full py-3 bg-black text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onToggleLock}
            className={cn(
              "p-2 rounded-full transition-all duration-300",
              isLocked 
                ? "bg-red-600 text-white shadow-lg scale-110" 
                : "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 scale-90 hover:scale-100"
            )}
            title={isLocked ? "Unlock Calendar" : "Lock Calendar"}
          >
            {isLocked ? (
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Lock className="w-4 h-4" />
              </motion.div>
            ) : (
              <Unlock className="w-4 h-4" />
            )}
          </button>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: textColor }}>
            <CalendarIcon className="w-5 h-5 text-black" />
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex gap-2">
          {onOpenSettings && (
            <button 
              onClick={() => setShowSettingsInternal(true)}
              className="p-2 hover:bg-black/10 rounded-full transition-colors group"
              title="Calendar Settings"
            >
              <Settings className="w-5 h-5 text-black/60 group-hover:text-black" />
            </button>
          )}
          <button onClick={prevMonth} className="p-2 hover:bg-black/10 rounded-full transition-colors group">
            <ChevronLeft className="w-5 h-5 text-black" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-black/10 rounded-full transition-colors group">
            <ChevronRight className="w-5 h-5 text-black" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
          <div key={day} className="text-center text-xs font-bold py-2 uppercase" style={{ color: textColor }}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const hasEvent = events.some((e) => isSameDay(new Date(e.date), day));
          return (
            <button
              key={day.toString()}
              onClick={() => onAddEvent(day)}
              className={cn(
               "aspect-square relative flex flex-col items-center justify-center rounded-xl transition-all group",
                isSameDay(day, new Date()) ? "bg-black text-white" : "hover:bg-black/5"
              )}
              style={{
                color: isSameDay(day, new Date()) ? 'white' : textColor
              }}
            >
              <span className="text-sm font-bold">{format(day, 'd')}</span>
              {hasEvent && (
                <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-500" />
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/10 rounded-xl transition-opacity pointer-events-none">
                <Plus className="w-4 h-4 text-black" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
        <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: textColor }}>Upcoming Events</p>
        {events
          .filter(e => isSameMonth(new Date(e.date), currentMonth))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((event) => (
            <div 
              key={event.id} 
              className="bg-black/5 border border-black/10 rounded-2xl p-4 hover:bg-black/10 transition-all cursor-pointer group relative hover:shadow-md"
              onClick={() => {
                const newTitle = prompt('일정 제목을 수정하세요:', event.title);
                if (newTitle === null) return;
                
                const newDesc = prompt('일정 설명을 수정하세요:', event.description);
                if (newDesc === null) return;

                if (newTitle === '' && newDesc === '') {
                  if (confirm('이 일정을 삭제할까요?')) {
                    onRemoveEvent(event.id);
                  }
                  return;
                }
                onUpdateEvent({ ...event, title: newTitle || event.title, description: newDesc });
              }}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-black transition-colors" style={{ color: textColor }}>{event.title}</p>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-bold text-black/60">{format(new Date(event.date), 'MMM d')}</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('이 일정을 삭제할까요?')) {
                        onRemoveEvent(event.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-600 font-black hover:underline mt-1 transition-opacity p-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-xs mt-1 line-clamp-1 font-medium" style={{ color: textColor }}>{event.description}</p>
            </div>
          ))}
      </div>
    </div>
  );
};
