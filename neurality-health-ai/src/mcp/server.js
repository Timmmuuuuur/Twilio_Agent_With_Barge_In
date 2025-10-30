import express from "express";
import bodyParser from "body-parser";
import { validate } from "../utils/validator.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";

const schemasDir = path.resolve("src/mcp/tools/schemas");
const tools = ["checkInsuranceCoverage","getProviderAvailability","bookAppointment","sendSms"];

export async function startMCPServer(port) {
  const app = express();
  app.use(bodyParser.json());

  for (const tool of tools) {
    const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, `${tool}.json`)));
    app.post(`/${tool}`, (req, res) => {

      const { ok, errors } = validate(schema.input, req.body);
      if (!ok) return res.status(400).json({ ok:false, errors });

      const result = simulateTool(tool, req.body);
      const { ok: outOk, errors: outErr } = validate(schema.output, result);
      if (!outOk) return res.status(500).json({ ok:false, errors: outErr });
      logger.info({ tool, input:req.body, output:result, ok:true });
      res.json(result);
    });
  }

  return new Promise(resolve => app.listen(port, () => {
    console.log("✅ MCP server on", port);
    resolve();
  }));
}

// In-memory booking store for idempotency
const bookingStore = new Map();

function simulateTool(name, input){
  switch(name){
    case "checkInsuranceCoverage":
      // Simulate coverage check
      const covered = input.payer.toLowerCase().includes("delta") || 
                      input.payer.toLowerCase().includes("blue") ||
                      input.payer.toLowerCase().includes("dental");
      return { 
        covered, 
        copay_estimate: covered ? 25 : 0, 
        notes: covered ? "Covered under preventive care" : "Not in network - cash pay available" 
      };
      
    case "getProviderAvailability":
      // Generate realistic slots
      const startDate = new Date(input.date_range.start);
      const slots = [];
      for (let i = 0; i < 3; i++) {
        const slotStart = new Date(startDate);
        slotStart.setHours(9 + i * 2, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(slotStart.getHours() + 1);
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          provider_id: input.provider_id || "DR001"
        });
      }
      return { slots };
      
    case "bookAppointment":
      // Idempotent booking
      const key = input.idempotency_key;
      if (bookingStore.has(key)) {
        return bookingStore.get(key);
      }
      const result = {
        confirmation_id: "CONF-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        status: "booked"
      };
      bookingStore.set(key, result);
      return result;
      
    case "sendSms":
      return { 
        queued: true, 
        message_id: "SM" + Math.random().toString(36).slice(2, 12).toUpperCase()
      };
      
    default:
      return { ok: false };
  }
}
