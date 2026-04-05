import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { devices } from "../db/schema";

export const authRoutes = new Hono();

authRoutes.post("/register-device", async (c) => {
  const body = await c.req.json<{ name: string }>();

  if (!body.name || typeof body.name !== "string") {
    return c.json({ error: "Device name is required" }, 400);
  }

  const id = uuidv4();
  const apiKey = `pm_${uuidv4().replace(/-/g, "")}`;

  await db.insert(devices).values({
    id,
    name: body.name,
    apiKey,
    createdAt: new Date().toISOString(),
  });

  return c.json({ id, name: body.name, apiKey });
});
