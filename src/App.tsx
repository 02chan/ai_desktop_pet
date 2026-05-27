import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from './components/Calendar';
import { Pet } from './components/Pet';
import { Chat } from './components/Chat';
import { PetStatus, CalendarEvent, ChatMessage } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Bell, Settings, Power, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './lib/utils';

const isElectron = typeof window !== 'undefined' && typeof window.require === 'function';
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;
const apiBase = isElectron ? 'http://localhost:3000' : '';

const currentPath = typeof window !== 'undefined' ? window.location.hash : '';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [status, setStatus] = useState<PetStatus>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_pet_status');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return {
      hunger: 80,
      happiness: 90,
      energy: 100,
    };
  });
  
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_calendar_events');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [
      { id: '1', date: new Date().toISOString(), title: 'AI Pet Project Launch', description: 'Complete the AI Pet prototype!' },
      { id: '2', date: new Date(Date.now() + 86400000).toISOString(), title: 'User Feedback Review', description: 'Check user requests for Moni.' },
    ];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_chat_messages');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [
      { role: 'model', parts: [{ text: '안녕! 나는 네 모니터 속 비서 Moni야! 무엇을 도와줄까? ✨' }] }
    ];
  });

  const [isTalking, setIsTalking] = useState(false);
  const [isCalendarLocked, setIsCalendarLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [lastModelMessage, setLastModelMessage] = useState('');
  const [calendarColor, setCalendarColor] = useState('#000000');
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [showCalendarOverlay, setShowCalendarOverlay] = useState(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Alarm clock schedule reminder check (every 5 seconds)
  useEffect(() => {
    const alarmTicker = setInterval(() => {
      const now = new Date();
      // Format today's date parts
      const todayStr = format(now, 'yyyy-MM-dd');
      const currentHM = format(now, 'HH:mm');

      // Find an event scheduled for today at the current time that has not run alert yet
      const dueEvent = events.find(event => {
        if (event.alerted) return false;

        const eventDate = new Date(event.date);
        const eventDateStr = format(eventDate, 'yyyy-MM-dd');
        const isToday = eventDateStr === todayStr;

        const eventTime = event.time; // "HH:MM"
        if (!eventTime) return false;

        return isToday && eventTime === currentHM;
      });

      if (dueEvent) {
        // Mark event as alerted
        setEvents(prev => prev.map(e => e.id === dueEvent.id ? { ...e, alerted: true } : e));

        // Create alert messages for Moni to voice out
        const alertMsg = `⏰ 따르릉! 지금은 ${dueEvent.time} 이에요! "${dueEvent.title}" 일정을 시작할 시간이에요! 📢${dueEvent.description ? `\n(메모: ${dueEvent.description})` : ''}`;
        
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: alertMsg }]
        }]);
        setLastModelMessage(`⏰ "${dueEvent.title}" 일정이 지금 시작해요!`);
        setIsTalking(true);

        // Sound alert tone with HTML5 Web Audio API Synth beep
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          // Cute twin notes scale pattern
          oscillator.frequency.setValueAtTime(660, audioCtx.currentTime); // E5
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.35);
        } catch (e) {
          console.warn('Audio feedback failed', e);
        }

        setTimeout(() => {
          setIsTalking(false);
          setLastModelMessage('');
        }, 12000);
      }
    }, 5000);

    return () => clearInterval(alarmTicker);
  }, [events]);

  // Save status, events, and messages to localStorage on change
  useEffect(() => {
    localStorage.setItem('moni_pet_status', JSON.stringify(status));
  }, [status]);

  useEffect(() => {
    localStorage.setItem('moni_calendar_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('moni_chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Sync state between windows on storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === 'moni_pet_status' && e.newValue) {
          setStatus(JSON.parse(e.newValue));
        }
        if (e.key === 'moni_calendar_events' && e.newValue) {
          setEvents(JSON.parse(e.newValue));
        }
        if (e.key === 'moni_chat_messages' && e.newValue) {
          setMessages(JSON.parse(e.newValue));
        }
      } catch (err) {
        console.error("Storage sync parse error:", err);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Electron: Sync showCalendarOverlay state to the separate calendar window
  useEffect(() => {
    if (isElectron && ipcRenderer) {
      if (showCalendarOverlay) {
        ipcRenderer.send('calendar-show');
      } else {
        ipcRenderer.send('calendar-hide');
      }
    }
  }, [showCalendarOverlay]);

  // Electron: Receive background calendar window close events to update visual button state in Pet widget
  useEffect(() => {
    if (isElectron && ipcRenderer) {
      const handleExternalClose = () => {
        setShowCalendarOverlay(false);
      };
      ipcRenderer.on('calendar-closed-external', handleExternalClose);
      return () => {
        ipcRenderer.removeListener('calendar-closed-external', handleExternalClose);
      };
    }
  }, []);

  // Proactive check (every 30 seconds)
  useEffect(() => {
    const checkProactive = async () => {
      if (isLoading || isTalking) return;
      
      try {
        // Calculate date range: today 00:00:00 to [today + 2 days] 23:59:59
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limitDate = new Date();
        limitDate.setDate(today.getDate() + 2);
        limitDate.setHours(23, 59, 59, 999);

        const filteredEvents = events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= limitDate;
        });

        const response = await fetch(`${apiBase}/api/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarEvents: filteredEvents
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
  }, [events, isLoading, isTalking]);

  const handleSendMessage = async (text: string) => {
    const newUserMsg: ChatMessage = { role: 'user', parts: [{ text }] };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    setIsTalking(true);
    
    // UI feedback for sending
    setLastModelMessage('...'); 

    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMsg],
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
          time: e.time || '12:00',
          alerted: false,
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
              description: update.description !== undefined ? update.description : e.description,
              time: update.time || e.time,
              alerted: false,
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



  const addEvent = (date: Date, title: string, description: string, time: string) => {
    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substring(2, 11),
      date: date.toISOString(),
      title,
      description,
      time: time || '12:00',
      alerted: false,
    };
    setEvents(prev => [...prev, newEvent]);
    
    // Moni reacts to new event
    const timeDisplay = time ? ` ${time}분에` : '';
    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{ text: `오! "${title}" 일정을${timeDisplay} 캘린더에 적어뒀어. 가르쳐준 시간에 꼭 알려줄게! 📝⏰` }] 
    }]);
    setLastModelMessage(`"${title}" 일정을 추가했어!`);
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 3000);
  };

  const updateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...updatedEvent, alerted: false } : e));
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

  const handlePlay = () => {
    setMessages(prev => [...prev, { role: 'model', parts: [{ text: '함께 노는 게 제일 즐거워! 🎈💕' }] }]);
    setLastModelMessage('함께 노는 게 제일 즐거워! 🎈💕');
    setIsTalking(true);
    setTimeout(() => {
      setIsTalking(false);
      setLastModelMessage('');
    }, 4000);
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
        className="absolute top-12 left-12 pointer-events-auto origin-top"
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
          onClose={() => {
            if (ipcRenderer) {
              ipcRenderer.send('calendar-close');
            }
          }}
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
             onPlay={handlePlay}
             showChatInput={showChatInput}
             onToggleChat={() => setShowChatInput(prev => !prev)}
             showCalendar={showCalendarOverlay}
             onToggleCalendar={() => setShowCalendarOverlay(prev => !prev)}
             onSendMessage={handleSendMessage}
             isLoading={isLoading}
             messages={messages}
             dragConstraints={containerRef}
          />
        </div>
      </div>

      {/* Draggable Calendar Overlay for Web Preview */}
      <AnimatePresence>
        {!isElectron && showCalendarOverlay && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={containerRef}
            className="absolute left-6 top-1/4 z-[80] pointer-events-auto origin-top"
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
              onClose={() => setShowCalendarOverlay(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
