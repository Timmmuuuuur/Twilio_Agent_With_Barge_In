import fs from "fs";
import path from "path";
import winston from "winston";

const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: path.join(logsDir, "system.log") })]
});

export function createAudit(callId) {
  const file = path.join(logsDir, `${callId}.json`);
  return {
    push: (data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))
  };
}
