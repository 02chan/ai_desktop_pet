export interface PetStatus {
  hunger: number;
  happiness: number;
  energy: number;
}

export interface CalendarEvent {
  id: string;
  date: string; // ISO string or YYYY-MM-DD
  title: string;
  description: string;
  time?: string; // "HH:MM" format
  alerted?: boolean;
  alertEnabled?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}
