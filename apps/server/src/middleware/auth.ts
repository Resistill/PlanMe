import type { Context, Next } from "hono";
import type { Env } from "../types";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { devices } from "../db/schema";

export async function authMiddleware(c: Context<Env>, next: Next) {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    return c.json({ error: "Missing X-API-Key header" }, 401);
  }

  const device = await db.query.devices.findFirst({
    where: eq(devices.apiKey, apiKey),
  });

  if (!device) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  // Update last seen
  await db
    .update(devices)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(devices.id, device.id));

  c.set("deviceId", device.id);
  c.set("deviceName", device.name);
  await next();
}
