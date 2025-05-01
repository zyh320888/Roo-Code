import { sqliteTable, text, real, integer, blob, uniqueIndex } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { createInsertSchema } from "drizzle-zod"

import {
	RooCodeSettings,
	ToolUsage,
	exerciseLanguages,
	rooCodeSettingsSchema,
	toolNames,
	toolUsageSchema,
} from "@evals/types"

/**
 * runs
 */

export const runs = sqliteTable("runs", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	taskMetricsId: integer({ mode: "number" }).references(() => taskMetrics.id),
	model: text().notNull(),
	description: text(),
	settings: blob({ mode: "json" }).$type<RooCodeSettings>(),
	pid: integer({ mode: "number" }),
	socketPath: text().notNull(),
	concurrency: integer({ mode: "number" }).default(2).notNull(),
	passed: integer({ mode: "number" }).default(0).notNull(),
	failed: integer({ mode: "number" }).default(0).notNull(),
	createdAt: integer({ mode: "timestamp" }).notNull(),
})

export const runsRelations = relations(runs, ({ one }) => ({
	taskMetrics: one(taskMetrics, { fields: [runs.taskMetricsId], references: [taskMetrics.id] }),
}))

export type Run = typeof runs.$inferSelect

export const insertRunSchema = createInsertSchema(runs).omit({ id: true, createdAt: true }).extend({
	settings: rooCodeSettingsSchema.optional(),
})

export type InsertRun = Omit<typeof runs.$inferInsert, "id" | "createdAt">

export type UpdateRun = Partial<Omit<Run, "id" | "createdAt">>

/**
 * tasks
 */

export const tasks = sqliteTable(
	"tasks",
	{
		id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		runId: integer({ mode: "number" })
			.references(() => runs.id)
			.notNull(),
		taskMetricsId: integer({ mode: "number" }).references(() => taskMetrics.id),
		language: text({ enum: exerciseLanguages }).notNull(),
		exercise: text().notNull(),
		passed: integer({ mode: "boolean" }),
		startedAt: integer({ mode: "timestamp" }),
		finishedAt: integer({ mode: "timestamp" }),
		createdAt: integer({ mode: "timestamp" }).notNull(),
	},
	(table) => [uniqueIndex("tasks_language_exercise_idx").on(table.runId, table.language, table.exercise)],
)

export const tasksRelations = relations(tasks, ({ one }) => ({
	run: one(runs, { fields: [tasks.runId], references: [runs.id] }),
	taskMetrics: one(taskMetrics, { fields: [tasks.taskMetricsId], references: [taskMetrics.id] }),
}))

export type Task = typeof tasks.$inferSelect

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true })

export type InsertTask = Omit<typeof tasks.$inferInsert, "id" | "createdAt">

export type UpdateTask = Partial<Omit<Task, "id" | "createdAt">>

/**
 * taskMetrics
 */

export const taskMetrics = sqliteTable("taskMetrics", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	tokensIn: integer({ mode: "number" }).notNull(),
	tokensOut: integer({ mode: "number" }).notNull(),
	tokensContext: integer({ mode: "number" }).notNull(),
	cacheWrites: integer({ mode: "number" }).notNull(),
	cacheReads: integer({ mode: "number" }).notNull(),
	cost: real().notNull(),
	duration: integer({ mode: "number" }).notNull(),
	toolUsage: text({ mode: "json" }).$type<ToolUsage>(),
	createdAt: integer({ mode: "timestamp" }).notNull(),
})

export type TaskMetrics = typeof taskMetrics.$inferSelect

export const insertTaskMetricsSchema = createInsertSchema(taskMetrics)
	.omit({ id: true, createdAt: true })
	.extend({ toolUsage: toolUsageSchema.optional() })

export type InsertTaskMetrics = Omit<typeof taskMetrics.$inferInsert, "id" | "createdAt">

export type UpdateTaskMetrics = Partial<Omit<TaskMetrics, "id" | "createdAt">>

/**
 * toolErrors
 */

export const toolErrors = sqliteTable("toolErrors", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	runId: integer({ mode: "number" }).references(() => runs.id),
	taskId: integer({ mode: "number" }).references(() => tasks.id),
	toolName: text({ enum: toolNames }).notNull(),
	error: text().notNull(),
	createdAt: integer({ mode: "timestamp" }).notNull(),
})

export const toolErrorsRelations = relations(toolErrors, ({ one }) => ({
	run: one(runs, { fields: [toolErrors.runId], references: [runs.id] }),
	task: one(tasks, { fields: [toolErrors.taskId], references: [tasks.id] }),
}))

export type ToolError = typeof toolErrors.$inferSelect

export const insertToolErrorSchema = createInsertSchema(toolErrors)
	.omit({ id: true, createdAt: true })
	.extend({ toolUsage: toolUsageSchema.optional() })

export type InsertToolError = Omit<typeof toolErrors.$inferInsert, "id" | "createdAt">

export type UpdateToolError = Partial<Omit<ToolError, "id" | "createdAt">>

/**
 * schema
 */

export const schema = { runs, runsRelations, tasks, tasksRelations, taskMetrics }
