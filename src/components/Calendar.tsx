import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Settings, Lock, Unlock, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from '../types';
import { cn } from '../lib/utils';
import { Todo } from './Todo';

const isElectron = typeof window !== 'undefined' && typeof window.require === 'function';
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

interface CalendarProps {
  events: CalendarEvent[];
  onAddEvent: (date: Date, title: string, description: string, time: string) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onRemoveEvent: (id: string) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  textColor?: string;
  onOpenSettings?: (color: string) => void;
  onClose?: () => void;
}

export const Calendar: React.FC<CalendarProps> = ({ 
  events, 
  onAddEvent, 
  onUpdateEvent,
  onRemoveEvent,
  isLocked,
  onToggleLock,
  textColor = '#000000',
  onOpenSettings,
  onClose
}) => {
  const [showSettingsInternal, setShowSettingsInternal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEventsExpanded, setIsEventsExpanded] = useState(true);
  const [showTodo, setShowTodo] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_calendar_show_todo');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('moni_calendar_show_todo', String(showTodo));
  }, [showTodo]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTime, setFormTime] = useState('12:00');

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDayOfWeek = startOfMonth(currentMonth).getDay();

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (modalMode === 'add' && selectedDay) {
      onAddEvent(selectedDay, formTitle, formDesc, formTime);
    } else if (modalMode === 'edit' && editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        title: formTitle,
        description: formDesc,
        time: formTime,
      });
    }

    setIsModalOpen(false);
    setFormTitle('');
    setFormDesc('');
    setFormTime('12:00');
    setEditingEvent(null);
  };

  return (
    <div 
      onMouseEnter={() => ipcRenderer?.send('calendar-hover')}
      onMouseLeave={() => ipcRenderer?.send('calendar-leave')}
      className="flex items-start gap-4 pointer-events-auto"
    >
      <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-6 shadow-2xl w-full max-w-md pointer-events-auto group/calendar relative transition-all duration-500">
      
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
              className="w-full py-3 bg-black text-white rounded-xl text-sm font-bold active:scale-95 transition-transform cursor-pointer"
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 bg-white/95 rounded-3xl p-6 flex flex-col justify-between text-black"
          >
            <form onSubmit={handleFormSubmit} className="flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-black">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    {modalMode === 'add' ? '새 일정 추가' : '일정 수정'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingEvent(null);
                    }}
                    className="p-2 hover:bg-black/5 rounded-full text-black"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-black/40 block mb-1 font-black uppercase tracking-widest">일정 날짜</label>
                    <div className="bg-black/5 rounded-xl px-4 py-2 text-sm text-black font-semibold">
                      {selectedDay ? format(selectedDay, 'yyyy년 MM월 dd일') : ''}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-black/40 block mb-1 font-black uppercase tracking-widest">일정 제목</label>
                    <input 
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-2 text-sm text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="예: AI 프로젝트 회의"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-black/40 block mb-1 font-black uppercase tracking-widest">시간 설정</label>
                    <input 
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-2 text-sm text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-black/40 block mb-1 font-black uppercase tracking-widest">일정 설명</label>
                    <textarea 
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-2 text-sm text-black font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-16 resize-none"
                      placeholder="상세 내용을 입력하세요..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform cursor-pointer hover:bg-indigo-500"
                >
                  저장
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="px-6 py-3 bg-black/5 text-black rounded-xl text-sm font-bold active:scale-95 transition-transform cursor-pointer hover:bg-black/10"
                >
                  취소
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 최상단 행: 연월, 잠금, 설정, x표시 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold flex items-center gap-1.5" style={{ color: textColor }}>
            <CalendarIcon className="w-5 h-5 text-black" />
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button 
            onClick={onToggleLock}
            className={cn(
              "p-2 rounded-full transition-all duration-300",
              isLocked 
                ? "bg-red-600 text-white shadow-md scale-100" 
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
        </div>
        
        <div className="flex items-center gap-1">
          {onOpenSettings && (
            <button 
              onClick={() => setShowSettingsInternal(true)}
              className="p-2 hover:bg-black/10 rounded-full transition-colors group"
              title="Calendar Settings"
            >
              <Settings className="w-5 h-5 text-black/60 group-hover:text-black" />
            </button>
          )}
          <button
            onClick={() => {
              ipcRenderer?.send('calendar-close');
              onClose?.();
            }}
            className="p-2 hover:bg-red-500 hover:text-white rounded-full transition-colors group cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5 text-black/60 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* 그 아랫줄: 좌우 화살표로 개월 변경 */}
      <div className="flex items-center justify-center gap-8 mb-6 bg-black/5 rounded-xl py-2 px-4">
        <button onClick={prevMonth} className="p-1.5 hover:bg-white/80 rounded-lg transition-colors group flex items-center gap-1 cursor-pointer">
          <ChevronLeft className="w-4 h-4 text-black" />
          <span className="text-xs font-medium text-black/60 select-none">이전달</span>
        </button>
        <span className="text-xs font-bold text-black/40 uppercase tracking-widest select-none">Month</span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-white/80 rounded-lg transition-colors group flex items-center gap-1 cursor-pointer">
          <span className="text-xs font-medium text-black/60 select-none">다음달</span>
          <ChevronRight className="w-4 h-4 text-black" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={`${day}-${index}`} className="text-center text-xs font-bold py-2 uppercase" style={{ color: textColor }}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDayOfWeek }).map((_, index) => (
          <div key={`empty-start-${index}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const hasEvent = events.some((e) => isSameDay(new Date(e.date), day));
          return (
            <button
              key={day.toString()}
              onClick={() => {
                setSelectedDay(day);
                setModalMode('add');
                setFormTitle('');
                setFormDesc('');
                setFormTime('12:00');
                setIsModalOpen(true);
              }}
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
        {Array.from({ length: (42 - startDayOfWeek - days.length) }).map((_, index) => (
          <div key={`empty-end-${index}`} className="aspect-square" />
        ))}
      </div>

      <div className="mt-6 border-t border-black/5 pt-4">
        <div className="flex items-center justify-between px-1 mb-3">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: textColor }}>Upcoming Events</p>
          <button 
            onClick={() => setIsEventsExpanded(!isEventsExpanded)}
            className="p-1.5 hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center cursor-pointer text-black/60 hover:text-black"
            title={isEventsExpanded ? "Collapse" : "Expand"}
          >
            <motion.div
              animate={{ rotate: isEventsExpanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isEventsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="h-44 overflow-y-auto pr-1 scrollbar-hide flex flex-col gap-3">
                {(() => {
                  const filteredEvents = events
                    .filter(e => isSameMonth(new Date(e.date), currentMonth))
                    .sort((a, b) => {
                      const dateA = new Date(a.date).getTime();
                      const dateB = new Date(b.date).getTime();
                      if (dateA !== dateB) return dateA - dateB;
                      return (a.time || '').localeCompare(b.time || '');
                    });

                  if (filteredEvents.length === 0) {
                    return (
                      <div className="text-center bg-black/5 rounded-2xl border border-dashed border-black/10 select-none animate-fade-in flex flex-col justify-center flex-1 h-full py-6 px-4 min-h-[100px]">
                        <p className="text-xs font-semibold text-black/40">이번 달 등록된 일정이 없습니다. ✨</p>
                      </div>
                    );
                  }

                  return filteredEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="bg-black/5 border border-black/10 rounded-2xl p-4 hover:bg-black/10 transition-all cursor-pointer group relative hover:shadow-md shrink-0"
                      onClick={() => {
                        setEditingEvent(event);
                        setModalMode('edit');
                        setFormTitle(event.title);
                        setFormDesc(event.description);
                        setFormTime(event.time || '12:00');
                        setSelectedDay(new Date(event.date));
                        setIsModalOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-black transition-colors" style={{ color: textColor }}>{event.title}</p>
                          {event.time && (
                            <p className="text-[11px] font-bold text-indigo-600 mt-0.5">{event.time}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] font-bold text-black/60">{format(new Date(event.date), 'MMM d')}</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveEvent(event.id);
                            }}
                            className="text-[11px] text-red-500 hover:text-red-700 font-bold hover:underline mt-1 transition-colors p-1 cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-xs mt-1 line-clamp-1 font-medium text-black/70">{event.description}</p>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* To-Do Panel Toggle Arrow */}
      <button
        onClick={() => setShowTodo(!showTodo)}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-[45] bg-white hover:bg-black text-black hover:text-white border border-black/10 w-7 h-7 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center pointer-events-auto"
        title={showTodo ? "할 일 목록 닫기" : "할 일 목록 열기"}
      >
        {showTodo ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
    </div>

    {/* To-Do list on the right */}
    <AnimatePresence>
      {showTodo && (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="origin-left"
        >
          <Todo events={events} textColor={textColor} isLocked={isLocked} />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
};
