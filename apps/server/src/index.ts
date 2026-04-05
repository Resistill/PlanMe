import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import "./db"; // Initialize database
import { authRoutes } from "./routes/auth";
import { documentsRoutes } from "./routes/documents";
import { syncRoutes } from "./routes/sync";

const app = new Hono();

app.use("/*", cors());

app.get("/", (c) =>
  c.json({ name: "PlanMe Sync Server", version: "0.1.0" }),
);

app.route("/api/auth", authRoutes);
app.route("/api/documents", documentsRoutes);
app.route("/api/sync", syncRoutes);

const port = parseInt(process.env.PLANME_PORT || "3847");

console.log(`PlanMe server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
