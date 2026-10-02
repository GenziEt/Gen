import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";
export const db = new PrismaClient({
    log: [
        { emit: "event", level: "error" },
        { emit: "event", level: "warn" },
    ],
});
db.$on("error", (event) => {
    logger.error("Prisma error", {
        message: event.message,
    });
});
db.$on("warn", (event) => {
    logger.warn("Prisma warning", {
        message: event.message,
    });
});
