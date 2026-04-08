import { Hono } from "hono";
import type { Env } from "../types.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { documents, revisionHistory } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

export const documentsRoutes = new Hono<Env>();

documentsRoutes.use("/*", authMiddleware);

// List all documents (metadata only, no content)
documentsRoutes.get("/", async (c) => {
  const docs = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      revision: documents.revision,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents);

  return c.json({ documents: docs });
});

// Get full document
documentsRoutes.get("/:id", async (c) => {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, c.req.param("id")),
  });

  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }

  return c.json(doc);
});

// Create document
documentsRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    filename: string;
    content?: string;
  }>();

  if (!body.filename) {
    return c.json({ error: "Filename is required" }, 400);
  }

  const now = new Date().toISOString();
  const id = uuidv4();

  await db.insert(documents).values({
    id,
    filename: body.filename,
    content: body.content || "",
    revision: 1,
    createdAt: now,
    updatedAt: now,
  });

  // Save initial revision
  const deviceId = c.get("deviceId") as string;
  await db.insert(revisionHistory).values({
    documentId: id,
    revision: 1,
    content: body.content || "",
    timestamp: now,
    deviceId,
  });

  return c.json({ id, filename: body.filename, revision: 1 }, 201);
});

// Update document
documentsRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    filename?: string;
    content?: string;
  }>();

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
  });

  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }

  const now = new Date().toISOString();
  const newRevision = doc.revision + 1;
  const deviceId = c.get("deviceId") as string;

  await db
    .update(documents)
    .set({
      ...(body.filename !== undefined && { filename: body.filename }),
      ...(body.content !== undefined && { content: body.content }),
      revision: newRevision,
      updatedAt: now,
    })
    .where(eq(documents.id, id));

  // Save revision history
  if (body.content !== undefined) {
    await db.insert(revisionHistory).values({
      documentId: id,
      revision: newRevision,
      content: body.content,
      timestamp: now,
      deviceId,
    });
  }

  return c.json({ id, revision: newRevision });
});

// Delete document
documentsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
  });

  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }

  await db.delete(documents).where(eq(documents.id, id));
  return c.json({ ok: true });
});
