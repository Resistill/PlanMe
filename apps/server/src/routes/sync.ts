import { Hono } from "hono";
import type { Env } from "../types.js";
import { eq, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { documents, revisionHistory } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

export const syncRoutes = new Hono<Env>();

syncRoutes.use("/*", authMiddleware);

// Push local changes to server
syncRoutes.post("/push", async (c) => {
  const deviceId = c.get("deviceId") as string;
  const body = await c.req.json<{
    documentId: string;
    content: string;
    metadata?: string;
    baseRevision: number;
  }>();

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, body.documentId),
  });

  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }

  // Clean merge: server revision matches client's base
  if (doc.revision === body.baseRevision) {
    const now = new Date().toISOString();
    const newRevision = doc.revision + 1;

    await db
      .update(documents)
      .set({
        content: body.content,
        ...(body.metadata !== undefined && { metadata: body.metadata }),
        revision: newRevision,
        updatedAt: now,
      })
      .where(eq(documents.id, body.documentId));

    await db.insert(revisionHistory).values({
      documentId: body.documentId,
      revision: newRevision,
      content: body.content,
      timestamp: now,
      deviceId,
    });

    return c.json({ ok: true, newRevision });
  }

  // Conflict: server has newer revisions
  return c.json({
    conflict: true,
    serverContent: doc.content,
    serverRevision: doc.revision,
    serverUpdatedAt: doc.updatedAt,
  });
});

// Pull remote changes
syncRoutes.post("/pull", async (c) => {
  const body = await c.req.json<{
    documentId: string;
    lastKnownRevision: number;
  }>();

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, body.documentId),
  });

  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }

  if (doc.revision === body.lastKnownRevision) {
    return c.json({ noChange: true, revision: doc.revision });
  }

  return c.json({
    content: doc.content,
    metadata: doc.metadata,
    revision: doc.revision,
    updatedAt: doc.updatedAt,
  });
});

// Quick status check: which docs have new revisions
syncRoutes.get("/status", async (c) => {
  const docs = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      revision: documents.revision,
      updatedAt: documents.updatedAt,
    })
    .from(documents);

  return c.json({ documents: docs });
});
