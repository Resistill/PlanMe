package com.planme.desktop.widget

/**
 * 小组件里的一行内容。
 *
 * level: 1..6 表示 Markdown 标题层级；0 表示普通正文行。
 */
data class WidgetLine(val text: String, val completed: Boolean, val level: Int)

object WidgetTaskParser {
    /** 单个文件最多缓存多少行（列表可滚动，不再受布局行数限制） */
    const val MAX_LINES = 300

    private val HEADING_RE = Regex("""^(#{1,6})\s+(.*)$""")
    private val BULLET_RE = Regex("""^[-*+]\s+(?:\[[ xX]]\s+)?""")
    private val DONE_RE = Regex("""[√✓]\s*$""")
    private val CHECKED_RE = Regex("""^[-*+]\s+\[[xX]]\s+""")

    /**
     * 解析整个文件：标题行和正文行都保留，只丢弃空行。
     * 小组件需要显示"全部文本"，所以这里不做已完成过滤。
     */
    fun parse(content: String, limit: Int = MAX_LINES): List<WidgetLine> =
        content.lineSequence()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .map { line ->
                val heading = HEADING_RE.find(line)
                val level = heading?.groupValues?.get(1)?.length ?: 0
                val body = heading?.groupValues?.get(2) ?: line
                // 已完成：行尾的 √/✓，或 Markdown 的 - [x] 复选框
                val completed = DONE_RE.containsMatchIn(body) || CHECKED_RE.containsMatchIn(body)
                val text = body.replace(BULLET_RE, "").replace(DONE_RE, "").trim()
                WidgetLine(text, completed, level)
            }
            .filter { it.text.isNotEmpty() }
            .take(limit)
            .toList()

    // ── SharedPreferences 序列化 ────────────────────────────────────────
    // 每行编码为 "level\tcompleted\ttext"，行之间用 \n 分隔。
    // text 已经过 trim 且不含换行，因此不会破坏分隔。

    fun encode(lines: List<WidgetLine>): List<String> =
        lines.map { "${it.level}\t${if (it.completed) 1 else 0}\t${it.text}" }

    fun decode(records: List<String>): List<WidgetLine> =
        records.mapNotNull { record ->
            val parts = record.split("\t", limit = 3)
            if (parts.size < 3) return@mapNotNull null
            WidgetLine(
                text = parts[2],
                completed = parts[1] == "1",
                level = parts[0].toIntOrNull() ?: 0,
            )
        }
}
