import OpenAI from "openai";
import { logger } from "../utils/logger.js";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function runAgent(prompt){
  const resp = await openai.chat.completions.create({
    model:"gpt-4-turbo",
    messages:[{role:"system",content:"You are Neurality Health AI front desk agent."},{role:"user",content:prompt}],
    response_format:{ type:"json_object" }
  });
  logger.info(resp.choices[0].message);
  return resp.choices[0].message;
}
