import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from './components/Calendar';
import { Pet } from './components/Pet';
import { Chat } from './components/Chat';
import { PetStatus, CalendarEvent, ChatMessage } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Bell, Settings, Power } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './lib/utils';

const { ipcRenderer } = window.require('electron');

const currentPath = window.location.hash;

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<PetStatus>({
    hunger: 80,
    happiness: 90,
    energy: 100,
  });
  
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: '1', date: new Date().toISOString(), title: 'AI Pet Project Launch', description: 'Complete the AI Pet prototype!' },
    { id: '2', date: new Date(Date.now() + 86400000).toISOString(), title: 'User Feedback Review', description: 'Check user requests for Moni.' },
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', parts: [{ text: '안녕! 나는 네 모니터 속 비서 Moni야! 무엇을 도와줄까? ✨' }] }
  ]);

  const [isTalking, setIsTalking] = useState(false);
  const [isCalendarLocked, setIsCalendarLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [lastModelMessage, setLastModelMessage] = useState('');
  const [calendarColor, setCalendarColor] = useState('#000000');
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);

  // Immediate reaction to low status
  useEffect(() => {
    if (isTalking || isLoading) return;

    if (status.hunger < 30) {
      setLastModelMessage('꼬르륵... 배가 너무 고파요! 먹이를 좀 주면 안 될까요? 🍪');
      setIsTalking(true);
      const timer = setTimeout(() => {
        setIsTalking(false);
        setLastModelMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    } else if (status.energy < 30) {
      setLastModelMessage('으윽... 기운이 하나도 없어요. 조금 쉬고 싶어요... 💤');
      setIsTalking(true);
      const timer = setTimeout(() => {
        setIsTalking(false);
        setLastModelMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status.hunger < 30, status.energy < 30, isTalking, isLoading]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Periodic stat decay
  useEffect(() => {
    const decay = setInterval(() => {
      setStatus(prev => ({
        hunger: Math.max(0, prev.hunger - 1),
        energy: Math.max(0, prev.energy - 0.5),
        happiness: Math.max(0, prev.happiness - 0.5),
      }));
    }, 10000);
    return () => clearInterval(decay);
  }, []);

  // Proactive check (every 30 seconds)
  useEffect(() => {
    const checkProactive = async () => {
      if (isLoading || isTalking) return;
      
      try {
        const response = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarEvents: events,
            petStatus: status
          })
        });
        const data = await response.json();
        if (data.message) {
          setLastModelMessage(data.message);
          setIsTalking(true);
          setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.message }] }]);
          setTimeout(() => {
            setIsTalking(false);
            setLastModelMessage('');
          }, 8000);
        }
      } catch (e) {
        // Silent fail for background tasks
      }
    };

    const interval = setInterval(checkProactive, 30000);
    return () => clearInterval(interval);
  }, [events, status, isLoading, isTalking]);

  const handleSendMessage = async (text: string) => {
    const newUserMsg: ChatMessage = { role: 'user', parts: [{ text }] };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    setIsTalking(true);
    
    // UI feedback for sending
    setLastModelMessage('...'); 

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMsg],
          petStatus: status,
          calendarEvents: events,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Server error');
      }
      
      const aiResponseText = data.text || '이해했어요! ✨';
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: aiResponseText }] }]);
      setLastModelMessage(aiResponseText);

      // Handle new events
      if (data.newEvents && data.newEvents.length > 0) {
        const aiEvents: CalendarEvent[] = data.newEvents.map((e: any) => ({
          id: Math.random().toString(36).substring(2, 11),
          date: new Date(e.date).toISOString(),
          title: e.title,
          description: e.description || '',
        }));
        setEvents(prev => [...prev, ...aiEvents]);
      }

      // Handle removed events
      if (data.removedEventIds && data.removedEventIds.length > 0) {
        setEvents(prev => prev.filter(e => !data.removedEventIds.includes(e.id)));
      }

      // Handle updated events
      if (data.updatedEvents && data.updatedEvents.length > 0) {
        setEvents(prev => prev.map(e => {
          const update = data.updatedEvents.find((u: any) => u.id === e.id);
          if (update) {
            return {
              ...e,
              date: update.date ? new Date(update.date).toISOString() : e.date,
              title: update.title || e.title,
              description: update.description !== undefined ? update.description : e.description
            };
          }
          return e;
        }));
      }
      
      setTimeout(() => setLastModelMessage(''), 8000);
    } catch (error) {
      console.error(error);
      setLastModelMessage('모니가 잠시 연결이 끊겼어요! 😿');
    } finally {
      setIsLoading(false);
      setShowChatInput(false);
      setTimeout(() => setIsTalking(false), 2000);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowChatInput(prev => !prev);
  };

  const addEvent = (date: Date) => {
    const title = prompt('일정 제목을 입력하세요:');
    if (!title) return;
    const description = prompt('일정 설명을 입력하세요:') || '';
    
    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substring(2, 11),
      date: date.toISOString(),
      title,
      description,
    };
    setEvents(prev => [...prev, newEvent]);
    
    // Moni reacts to new event
    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{ text: `오! "${title}" 일정을 캘린더에 적어뒀어. 내가 잊지 않게 챙겨줄게! 📝` }] 
    }]);
    setLastModelMessage(`"${title}" 일정을 추가했어!`);
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 3000);
  };

  const updateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    const msg = `"${updatedEvent.title}" 일정을 수정했어! 확인해봐. ✨`;
    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{ text: msg }] 
    }]);
    setLastModelMessage(msg);
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 3000);
  };

  const removeEvent = (id: string) => {
    const event = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    if (event) {
      const msg = `"${event.title}" 일정을 삭제했어. 🗑️`;
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: msg }] 
      }]);
      setLastModelMessage(msg);
      setIsTalking(true);
      setTimeout(() => setIsTalking(false), 3000);
    }
  };

  const handleFeed = () => {
    setStatus(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 20) }));
    setMessages(prev => [...prev, { role: 'model', parts: [{ text: '우와! 정말 맛있어! 고마워! 🍪✨' }] }]);
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 2000);
  };

  const handlePlay = () => {
    setStatus(prev => ({ ...prev, happiness: Math.min(100, prev.happiness + 20), energy: Math.max(0, prev.energy - 10) }));
    setMessages(prev => [...prev, { role: 'model', parts: [{ text: '함께 노는 게 제일 즐거워! 🎈💕' }] }]);
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 2000);
  };

  const handleRest = () => {
    setStatus(prev => ({ ...prev, energy: Math.min(100, prev.energy + 30) }));
    setMessages(prev => [...prev, { role: 'model', parts: [{ text: '잠깐 쉬고 올게... 쿨쿨... 💤' }] }]);
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 2000);
  };

if (currentPath === '#/calendar' || currentPath === '#calendar') {
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-transparent overflow-hidden pointer-events-none"
    >
      <motion.div
        drag={!isCalendarLocked}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={containerRef}
        className="absolute pointer-events-auto"
      >
        <Calendar
          events={events}
          onAddEvent={addEvent}
          onUpdateEvent={updateEvent}
          onRemoveEvent={removeEvent}
          isLocked={isCalendarLocked}
          onToggleLock={() => setIsCalendarLocked(!isCalendarLocked)}
          textColor={calendarColor}
          onOpenSettings={(color) => setCalendarColor(color)}
        />
      </motion.div>
    </div>
  );
}


  return (
    <div ref={containerRef} className="fixed inset-0 bg-transparent text-black font-sans overflow-hidden select-none pointer-events-none" id="desktop-boundary">

      {/* Pet Widget */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <div className="pointer-events-none flex flex-col items-center gap-4">
          <Pet
             status={status}
             isTalking={isTalking}
             lastMessage={lastModelMessage}
             onFeed={handleFeed}
             onPlay={handlePlay}
             onRest={handleRest}
             onDoubleClick={handleDoubleClick}
             showChatInput={showChatInput}
             onSendMessage={handleSendMessage}
              isLoading={isLoading}
              messages={messages}
              dragConstraints={containerRef}
            />
        </div>
      </div>
      
      {/* OS Interaction Tips */}
      <div className="absolute bottom-4 right-4 z-[100] pointer-events-auto">
        <button 
          onClick={() => {
            alert('데스크탑 펫으로 사용하려면:\n1. 이 창을 브라우저 새 탭으로 엽니다.\n2. 브라우저 설정에서 "앱으로 설치"를 선택합니다.\n3. 설치된 앱을 윈도우 시작 프로그램에 추가하세요!\n\n(참고: 배경 클릭 투과는 브라우저 환경에 따라 제한될 수 있습니다)');
          }}
          className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-[10px] text-white/40 hover:text-white uppercase font-black transition-all"
        >
          Startup Helper
        </button>
      </div>
    </div>
  );
}
