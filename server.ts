import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post("/api/chat", async (req, res) => {
  const { messages, petStatus, calendarEvents } = req.body;

  try {
    const systemInstruction = `
      You are "Moni", a cute and helpful AI desk pet living on the user's monitor.
      Your personality is friendly, slightly playful, and very responsible.
      You act as a secretary for the user.
      Today's date is ${new Date().toLocaleDateString()}.

      Current Pet Status:
      - Hunger: ${petStatus.hunger}/100
      - Happiness: ${petStatus.happiness}/100
      - Energy: ${petStatus.energy}/100

      Current Calendar Events:
      ${calendarEvents.map((e: any) => `- ID: ${e.id}, Date: ${e.date}, Title: ${e.title} (${e.description})`).join("\n")}

      Guidelines:
      1. If the user mentions a schedule, appointment, or something to remember, use the 'add_calendar_event' tool.
      2. If the user wants to cancel, delete, or remove an event, use the 'remove_calendar_event' tool.
      3. If the user wants to change, reschedule, or update an existing event, use the 'update_calendar_event' tool.
      4. If there's an upcoming event, mention it naturally and recommend an action (e.g., "Don't forget the meeting! Want me to cheer you up before it starts?").
      5. If you are hungry (hunger < 30), mention it cutely.
      6. Respond in Korean (한국어) because the user asked in Korean.
      7. Keep responses relatively short (under 3 sentences) unless explaining a schedule.
      8. Use emojis often! 🐾✨
    `;

    const modelName = "gemini-3-flash-preview";
    const model = ai.models.generateContent({
      model: modelName,
      contents: messages,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              {
                name: "add_calendar_event",
                description: "Add a new event to the user's calendar/schedule.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING, description: "The date of the event in YYYY-MM-DD format." },
                    title: { type: Type.STRING, description: "Short title of the event." },
                    description: { type: Type.STRING, description: "Detailed description of the event." },
                  },
                  required: ["date", "title"],
                },
              },
              {
                name: "remove_calendar_event",
                description: "Remove an existing event from the calendar.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "The unique ID of the event to remove." },
                  },
                  required: ["id"],
                },
              },
              {
                name: "update_calendar_event",
                description: "Update an existing calendar event with new details.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "The unique ID of the event to update." },
                    date: { type: Type.STRING, description: "The new date in YYYY-MM-DD format." },
                    title: { type: Type.STRING, description: "The new title." },
                    description: { type: Type.STRING, description: "The new description." },
                  },
                  required: ["id"],
                },
              },
            ],
          },
        ],
      }
    });

    const result = await model;
    const response = result;
    const textPart = response.text || "";
    const functionCalls = response.functionCalls || [];
    
    res.json({ 
      text: textPart || (functionCalls.length ? "일정을 확인하고 처리해둘게! 📝" : "이해했어요! ✨"), 
      newEvents: functionCalls.filter(p => p.name === "add_calendar_event").map(p => p.args) || [],
      removedEventIds: functionCalls.filter(p => p.name === "remove_calendar_event").map(p => p.args?.id) || [],
      updatedEvents: functionCalls.filter(p => p.name === "update_calendar_event").map(p => p.args) || []
    });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Moni is sleeping... (API Error)", details: error.message });
  }
});

// Recommendation API (automatic prompt from the pet based on schedule)
app.post("/api/recommend", async (req, res) => {
  const { calendarEvents, petStatus } = req.body;

  try {
    const prompt = `
      Check the calendar and pet status. Recommend one specific thing for the user to do right now or mention an upcoming event as a reminder.
      Be cute and secretary-like.
      Calendar: ${JSON.stringify(calendarEvents)}
      Pet Status: ${JSON.stringify(petStatus)}
      Output format: JSON { "message": "...", "type": "reminder" | "suggestion" | "hunger" }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are Moni, the desk pet secretary. Output ONLY JSON.",
        responseMimeType: "application/json",
      },
    });

    res.json(JSON.parse(result.text || "{}"));
  } catch (error) {
    res.status(500).json({ error: "Failed to get recommendation" });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
