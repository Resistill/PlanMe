package com.planme.desktop.widget

data class WidgetTask(val title: String, val completed: Boolean, val level: Int)

object WidgetTaskParser {
    private val HEADING_RE = Regex("""^(#{1,3})\s+(.+)$""")

    fun parse(content: String): List<WidgetTask> =
        content.lines().mapNotNull { line ->
            val match = HEADING_RE.find(line.trim()) ?: return@mapNotNull null
            val level = match.groupValues[1].length          // 1, 2, 或 3
            val raw = match.groupValues[2]
            val completed = raw.trimEnd().endsWith('√')
            WidgetTask(raw.replace(Regex("""√\s*$"""), "").trim(), completed, level)
        }

    fun uncompletedTasks(content: String, limit: Int = 6): List<WidgetTask> =
        parse(content).filter { !it.completed }.take(limit)
}
