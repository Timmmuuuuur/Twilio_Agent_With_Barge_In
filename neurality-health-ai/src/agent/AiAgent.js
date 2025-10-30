// src/agent/aiAgent.js
import OpenAI from "openai";
import { decode } from "base64-arraybuffer";
import fs from "fs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function respondToUser(inputText) {
  try {
    console.log(`🧠 User said: ${inputText}`);

    // Optimized for speed and conciseness
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a professional front-desk assistant at Neurality Health. Be concise, helpful, and natural. Keep responses under 2 sentences unless asked for details. Focus on booking appointments, insurance coverage, and patient scheduling."
        },
        { role: "user", content: inputText },
      ],
      max_tokens: 150, // Limit response length for speed
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content;
    console.log("🤖 AI:", reply);
    return reply;
  } catch (err) {
    console.error("AI error:", err);
    return "Sorry, I had trouble understanding that.";
  }
}
