import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Circle, Clock, Calendar as CalendarIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from '../types';
import { cn } from '../lib/utils';
import { isSameDay } from 'date-fns';

interface TodoProps {
  events: CalendarEvent[];
  textColor?: string;
  isLocked?: boolean;
}

interface CustomTodo {
  id: string;
  text: string;
  completed: boolean;
  category: 'daily' | 'weekly' | 'monthly';
  createdAt: number;
  resetConfig?: {
    dailyHour?: number;
    weeklyDay?: number;
    monthlyDate?: number;
  };
  lastResetTimestamp?: number;
}

const WEEKDAYS = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
];

export const Todo: React.FC<TodoProps> = ({ events, textColor = '#000000', isLocked }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'daily' | 'weekly' | 'monthly'>('today');
  const [customTodos, setCustomTodos] = useState<CustomTodo[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_custom_todos');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  // Reset Configuration States for the active creation mode
  const [dailyHour, setDailyHour] = useState<number>(9); // default 9 o'clock
  const [weeklyDay, setWeeklyDay] = useState<number>(1); // default Monday
  const [monthlyDate, setMonthlyDate] = useState<number>(1); // default 1st day

  const [completedEventIds, setCompletedEventIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_completed_events');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  const [inputValue, setInputValue] = useState('');

  // Persist custom todos
  useEffect(() => {
    localStorage.setItem('moni_custom_todos', JSON.stringify(customTodos));
  }, [customTodos]);

  // Persist completed events mapping for Today
  useEffect(() => {
    localStorage.setItem('moni_completed_events', JSON.stringify(completedEventIds));
  }, [completedEventIds]);

  // Automated reset checker and processor
  const checkAndRunResets = (todos: CustomTodo[]): CustomTodo[] => {
    let changed = false;
    const nowEpoch = Date.now();
    const now = new Date();

    const updated = todos.map((todo) => {
      if (!todo.completed) return todo;

      const lastReset = todo.lastResetTimestamp || todo.createdAt;
      let targetTime = 0;
      const config = todo.resetConfig || {
        dailyHour: 9,
        weeklyDay: 1,
        monthlyDate: 1
      };

      if (todo.category === 'daily') {
        const hour = config.dailyHour ?? 9;
        const targetToday = new Date(now);
        targetToday.setHours(hour, 0, 0, 0);
        targetTime = targetToday.getTime();
        if (nowEpoch < targetTime) {
          const targetYesterday = new Date(targetToday);
          targetYesterday.setDate(targetYesterday.getDate() - 1);
          targetTime = targetYesterday.getTime();
        }
      } else if (todo.category === 'weekly') {
        const targetWD = config.weeklyDay ?? 1; // 1 = Monday
        const currentWD = now.getDay();
        let diff = currentWD - targetWD;
        if (diff < 0) diff += 7;
        const targetThisWeek = new Date(now);
        targetThisWeek.setDate(now.getDate() - diff);
        targetThisWeek.setHours(0, 0, 0, 0);
        targetTime = targetThisWeek.getTime();
      } else if (todo.category === 'monthly') {
        const targetMD = config.monthlyDate ?? 1;
        const todayVal = new Date(now);
        const targetThisMonth = new Date(todayVal.getFullYear(), todayVal.getMonth(), targetMD, 0, 0, 0, 0);
        
        // Handle end of month overflows safely
        let actualTargetThisMonth = targetThisMonth;
        if (actualTargetThisMonth.getMonth() !== todayVal.getMonth()) {
          actualTargetThisMonth = new Date(todayVal.getFullYear(), todayVal.getMonth() + 1, 0, 0, 0, 0, 0);
        }

        if (nowEpoch >= actualTargetThisMonth.getTime()) {
          targetTime = actualTargetThisMonth.getTime();
        } else {
          const targetLastMonth = new Date(todayVal.getFullYear(), todayVal.getMonth() - 1, targetMD, 0, 0, 0, 0);
          let actualTargetLastMonth = targetLastMonth;
          const expectedMonth = (todayVal.getMonth() - 1 + 12) % 12;
          if (actualTargetLastMonth.getMonth() !== expectedMonth) {
            actualTargetLastMonth = new Date(todayVal.getFullYear(), todayVal.getMonth(), 0, 0, 0, 0, 0);
          }
          targetTime = actualTargetLastMonth.getTime();
        }
      }

      if (lastReset < targetTime) {
        changed = true;
        return {
          ...todo,
          completed: false,
          lastResetTimestamp: nowEpoch,
        };
      }

      return todo;
    });

    return changed ? updated : todos;
  };

  // Run periodic automated check & reset
  useEffect(() => {
    setCustomTodos((prev) => {
      const reseted = checkAndRunResets(prev);
      if (JSON.stringify(reseted) !== JSON.stringify(prev)) {
        return reseted;
      }
      return prev;
    });

    const timer = setInterval(() => {
      setCustomTodos((prev) => {
        const reseted = checkAndRunResets(prev);
        if (JSON.stringify(reseted) !== JSON.stringify(prev)) {
          return reseted;
        }
        return prev;
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(timer);
  }, []);

  // Filter events scheduled for today
  const todayEvents = events.filter((event) => {
    try {
      return isSameDay(new Date(event.date), new Date());
    } catch (e) {
      return false;
    }
  });

  // Handle adding new custom todo
  const handleAddTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || activeTab === 'today') return;

    const newTodo: CustomTodo = {
      id: Math.random().toString(36).substring(2, 11),
      text: inputValue.trim(),
      completed: false,
      category: activeTab,
      createdAt: Date.now(),
      lastResetTimestamp: Date.now(),
      resetConfig: {
        dailyHour: activeTab === 'daily' ? dailyHour : undefined,
        weeklyDay: activeTab === 'weekly' ? weeklyDay : undefined,
        monthlyDate: activeTab === 'monthly' ? monthlyDate : undefined,
      }
    };

    setCustomTodos((prev) => [newTodo, ...prev]);
    setInputValue('');
  };

  // Toggle custom todo checked status
  const toggleTodo = (id: string) => {
    setCustomTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
    );
  };

  // Delete custom todo
  const deleteTodo = (id: string) => {
    setCustomTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  // Toggle automated today event checklist status
  const toggleTodayEvent = (id: string) => {
    setCompletedEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filtered lists depending on active tab with automatic sorting!
  const getFilteredItems = () => {
    if (activeTab === 'today') {
      return todayEvents;
    }
    const filtered = customTodos.filter((todo) => todo.category === activeTab);
    
    return [...filtered].sort((a, b) => {
      const configA = a.resetConfig || {};
      const configB = b.resetConfig || {};

      if (activeTab === 'daily') {
        const hourA = configA.dailyHour ?? 9;
        const hourB = configB.dailyHour ?? 9;
        if (hourA !== hourB) {
          return hourA - hourB;
        }
      } else if (activeTab === 'weekly') {
        const dayA = configA.weeklyDay ?? 1;
        const dayB = configB.weeklyDay ?? 1;
        if (dayA !== dayB) {
          return dayA - dayB;
        }
      } else if (activeTab === 'monthly') {
        const dateA = configA.monthlyDate ?? 1;
        const dateB = configB.monthlyDate ?? 1;
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      }
      
      return b.createdAt - a.createdAt;
    });
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-6 shadow-2xl w-80 h-[500px] flex flex-col pointer-events-auto shrink-0 relative transition-all duration-500">
      
      {/* Tab Selectors with neat Pill animated background */}
      <div className="flex justify-between p-1 bg-black/5 rounded-2xl mb-4 relative z-0">
        {(['today', 'daily', 'weekly', 'monthly'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setInputValue('');
            }}
            className={cn(
              "relative px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-colors flex-1 text-center select-none cursor-pointer",
              activeTab === tab ? "text-white" : "text-black/60 hover:text-black"
            )}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTodoTab"
                className="absolute inset-0 bg-black rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {tab === 'today' && todayEvents.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Title */}
      <div className="mb-4">
        <h3 className="text-base font-black flex items-center gap-1.5 capitalize" style={{ color: textColor }}>
          {activeTab === 'today' ? (
            <>
              <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
              오늘의 알림 일정
            </>
          ) : (
            <>
              <CalendarIcon className="w-4 h-4" />
              {activeTab} 계획표
            </>
          )}
        </h3>
        <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider mt-0.5">
          {activeTab === 'today' ? '자동 동기화 알람 일정' : '나만의 맞춤 할 일 목록'}
        </p>
      </div>

      {/* To-Do Quick Input Bar (Disabled for automated 'Today' tab) */}
      {activeTab !== 'today' && (
        <>
          <form onSubmit={handleAddTodo} className="flex gap-2 mb-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="할 일을 입력하세요..."
              className="flex-1 bg-black/5 rounded-xl px-4 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black/20"
              maxLength={100}
            />
            <button
              type="submit"
              className="p-2 bg-black hover:bg-black/90 text-white rounded-xl transition-transform active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              title="할 일 추가"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Reset Configuration Bar */}
          <div className="flex items-center justify-between gap-1 px-3 py-2 mb-4 bg-black/5 rounded-2xl border border-black/5 text-[10px] text-black/60 font-bold select-none">
            <span className="shrink-0 flex items-center gap-1 text-black/40">
              ⏳ 초기화 주기
            </span>
            {activeTab === 'daily' && (
              <div className="flex items-center gap-1.5">
                <span>매일</span>
                <select
                  value={dailyHour}
                  onChange={(e) => setDailyHour(Number(e.target.value))}
                  className="bg-white border border-black/10 rounded-lg px-2 py-0.5 text-[10px] font-black text-black focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>{i}시</option>
                  ))}
                </select>
              </div>
            )}
            {activeTab === 'weekly' && (
              <div className="flex items-center gap-1.5">
                <span>매주</span>
                <select
                  value={weeklyDay}
                  onChange={(e) => setWeeklyDay(Number(e.target.value))}
                  className="bg-white border border-black/10 rounded-lg px-2 py-0.5 text-[10px] font-black text-black focus:outline-none cursor-pointer"
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
            )}
            {activeTab === 'monthly' && (
              <div className="flex items-center gap-1.5">
                <span>매달</span>
                <select
                  value={monthlyDate}
                  onChange={(e) => setMonthlyDate(Number(e.target.value))}
                  className="bg-white border border-black/10 rounded-lg px-2 py-0.5 text-[10px] font-black text-black focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 31 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}일</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </>
      )}

      {/* List Container */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center p-4 py-8 bg-black/5 rounded-2xl border border-dashed border-black/10 select-none"
            >
              {activeTab === 'today' ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-black/40">오늘 등록된 알림 일정이 없습니다.</p>
                  <p className="text-[10px] text-black/30">캘린더 일정을 추가해 보세요! ✨</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-black/40">등록된 할 일이 없습니다.</p>
                  <p className="text-[10px] text-black/30">여기에 해야할 일을 기록해 보세요!</p>
                </div>
              )}
            </motion.div>
          ) : (
            filteredItems.map((item) => {
              if (activeTab === 'today') {
                // Render Automatic Today Clock Alarm Events
                const event = item as CalendarEvent;
                const isCompleted = completedEventIds.includes(event.id);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl transition-all cursor-pointer group hover:bg-indigo-50",
                      isCompleted && "opacity-65"
                    )}
                    onClick={() => toggleTodayEvent(event.id)}
                  >
                    <button className="text-indigo-600 focus:outline-none shrink-0" title={isCompleted ? "미완료로 표시" : "완료로 표시"}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 fill-indigo-600 text-white" />
                      ) : (
                        <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-xs font-extrabold text-black truncate transition-all",
                        isCompleted && "line-through text-black/40"
                      )}>
                        {event.title}
                      </p>
                      {event.time && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600/80 mt-0.5 uppercase bg-indigo-50 px-1.5 py-0.5 rounded-md">
                          <Clock className="w-2.5 h-2.5" />
                          {event.time}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              } else {
                // Render Manual Checklist Items
                const todo = item as CustomTodo;
                const config = todo.resetConfig || {
                  dailyHour: 9,
                  weeklyDay: 1,
                  monthlyDate: 1
                };

                let resetLabelDetail = '';
                if (todo.category === 'daily') {
                  resetLabelDetail = `매일 ${config.dailyHour ?? 9}시`;
                } else if (todo.category === 'weekly') {
                  const dayName = WEEKDAYS.find((d) => d.value === (config.weeklyDay ?? 1))?.label || '월 요일';
                  resetLabelDetail = `매주 ${dayName}`;
                } else if (todo.category === 'monthly') {
                  resetLabelDetail = `매달 ${config.monthlyDate ?? 1}일`;
                }

                return (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 bg-black/5 hover:bg-black/10 border border-black/5 rounded-2xl transition-all group",
                      todo.completed && "opacity-60 bg-black/2.5"
                    )}
                  >
                    <div 
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleTodo(todo.id)}
                    >
                      <button className="text-black/60 focus:outline-none shrink-0">
                        {todo.completed ? (
                          <CheckCircle className="w-5 h-5 fill-black text-white" />
                        ) : (
                          <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-bold text-black truncate leading-normal transition-all",
                          todo.completed && "line-through text-black/40"
                        )}>
                          {todo.text}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[8px] font-bold text-black/35 mt-0.5 uppercase bg-black/5 px-1.5 py-0.5 rounded">
                          ⏳ {resetLabelDetail} 초기화
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTodo(todo.id);
                      }}
                      className="p-1.5 text-black/30 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      title="지우기"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              }
            })
          )}
        </AnimatePresence>
      </div>
      
      {/* Tiny descriptive footer */}
      <div className="mt-2 text-center select-none">
        <span className="text-[9px] font-bold text-black/20 uppercase tracking-widest">
          {activeTab === 'today' ? '총 ' + todayEvents.length + '개의 알림 일정' : '완료 ' + customTodos.filter(t => t.category === activeTab && t.completed).length + '개 / 전체 ' + customTodos.filter(t => t.category === activeTab).length + '개'}
        </span>
      </div>
    </div>
  );
};
