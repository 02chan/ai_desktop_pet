var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var PORT = 3e3;
var app = (0, import_express.default)();
app.use(import_express.default.json());
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
app.post("/api/chat", async (req, res) => {
  const { messages, petStatus, calendarEvents } = req.body;
  try {
    const systemInstruction = `
      You are "Moni", a cute and helpful AI desk pet living on the user's monitor.
      Your personality is friendly, slightly playful, and very responsible.
      You act as a secretary for the user.
      Today's date is ${(/* @__PURE__ */ new Date()).toLocaleDateString()}.

      Current Pet Status:
      - Hunger: ${petStatus.hunger}/100
      - Happiness: ${petStatus.happiness}/100
      - Energy: ${petStatus.energy}/100

      Current Calendar Events:
      ${calendarEvents.map((e) => `- ID: ${e.id}, Date: ${e.date}, Title: ${e.title} (${e.description})`).join("\n")}

      Guidelines:
      1. If the user mentions a schedule, appointment, or something to remember, use the 'add_calendar_event' tool.
      2. If the user wants to cancel, delete, or remove an event, use the 'remove_calendar_event' tool.
      3. If the user wants to change, reschedule, or update an existing event, use the 'update_calendar_event' tool.
      4. If there's an upcoming event, mention it naturally and recommend an action (e.g., "Don't forget the meeting! Want me to cheer you up before it starts?").
      5. If you are hungry (hunger < 30), mention it cutely.
      6. Respond in Korean (\uD55C\uAD6D\uC5B4) because the user asked in Korean.
      7. Keep responses relatively short (under 3 sentences) unless explaining a schedule.
      8. Use emojis often! \u{1F43E}\u2728
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
                  type: import_genai.Type.OBJECT,
                  properties: {
                    date: { type: import_genai.Type.STRING, description: "The date of the event in YYYY-MM-DD format." },
                    title: { type: import_genai.Type.STRING, description: "Short title of the event." },
                    description: { type: import_genai.Type.STRING, description: "Detailed description of the event." }
                  },
                  required: ["date", "title"]
                }
              },
              {
                name: "remove_calendar_event",
                description: "Remove an existing event from the calendar.",
                parameters: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    id: { type: import_genai.Type.STRING, description: "The unique ID of the event to remove." }
                  },
                  required: ["id"]
                }
              },
              {
                name: "update_calendar_event",
                description: "Update an existing calendar event with new details.",
                parameters: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    id: { type: import_genai.Type.STRING, description: "The unique ID of the event to update." },
                    date: { type: import_genai.Type.STRING, description: "The new date in YYYY-MM-DD format." },
                    title: { type: import_genai.Type.STRING, description: "The new title." },
                    description: { type: import_genai.Type.STRING, description: "The new description." }
                  },
                  required: ["id"]
                }
              }
            ]
          }
        ]
      }
    });
    const result = await model;
    const response = result;
    const textPart = response.text || "";
    const functionCalls = response.functionCalls || [];
    res.json({
      text: textPart || (functionCalls.length ? "\uC77C\uC815\uC744 \uD655\uC778\uD558\uACE0 \uCC98\uB9AC\uD574\uB458\uAC8C! \u{1F4DD}" : "\uC774\uD574\uD588\uC5B4\uC694! \u2728"),
      newEvents: functionCalls.filter((p) => p.name === "add_calendar_event").map((p) => p.args) || [],
      removedEventIds: functionCalls.filter((p) => p.name === "remove_calendar_event").map((p) => p.args?.id) || [],
      updatedEvents: functionCalls.filter((p) => p.name === "update_calendar_event").map((p) => p.args) || []
    });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Moni is sleeping... (API Error)", details: error.message });
  }
});
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
        responseMimeType: "application/json"
      }
    });
    res.json(JSON.parse(result.text || "{}"));
  } catch (error) {
    res.status(500).json({ error: "Failed to get recommendation" });
  }
});
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
}
setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
//# sourceMappingURL=server.cjs.map
