import { and, eq, lte } from "drizzle-orm";
import { db } from "./index.js";
import { revisionHistory } from "./schema.js";

/**
 * 每篇文档保留多少条历史版本。
 *
 * revision_history 里存的是每次 push 的**全文快照**，而目前没有任何接口或界面
 * 读取它（只有 3 处 INSERT，0 处 SELECT）。不加限制的话，一篇改了 160 次的
 * 笔记就会在库里留下 160 份全文副本。
 *
 * 设成 0 表示不裁剪（保留全部历史）。
 */
const HISTORY_LIMIT = parseInt(
  process.env.PLANME_REVISION_HISTORY_LIMIT || "100",
);

/** 写入一条历史版本，并裁掉这篇文档过旧的记录 */
export async function recordRevision(entry: {
  documentId: string;
  revision: number;
  content: string;
  timestamp: string;
  deviceId: string;
}): Promise<void> {
  await db.insert(revisionHistory).values(entry);

  if (!Number.isFinite(HISTORY_LIMIT) || HISTORY_LIMIT <= 0) return;

  // revision 在单篇文档内单调递增，所以按阈值删即可
  const threshold = entry.revision - HISTORY_LIMIT;
  if (threshold <= 0) return;

  await db
    .delete(revisionHistory)
    .where(
      and(
        eq(revisionHistory.documentId, entry.documentId),
        lte(revisionHistory.revision, threshold),
      ),
    );
}
