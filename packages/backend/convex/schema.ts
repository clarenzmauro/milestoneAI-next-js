import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Example table kept as-is
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),

  // Plans hold structured plan content; augmented with optional fields for future UX
  plans: defineTable({
    userId: v.string(),
    goal: v.string(),
    monthlyMilestones: v.array(v.object({
      month: v.number(),
      milestone: v.string(),
      weeklyObjectives: v.array(v.object({
        week: v.number(),
        objective: v.string(),
        dailyTasks: v.array(
          v.object({
            day: v.number(),
            description: v.string(),
            completed: v.boolean(),
          })
        ),
      })),
    })),
    chatHistory: v.optional(
      v.array(
        v.object({
          role: v.union(
            v.literal("user"),
            v.literal("ai"),
            v.literal("system")
          ),
          text: v.string(),
        })
      )
    ),
    interactionMode: v.optional(v.string()),
    unlockedAchievements: v.optional(v.record(v.string(), v.boolean())),
    createdAt: v.number(),

    // New optional metadata to support listing/archiving without breaking existing docs
    updatedAt: v.optional(v.number()),
    archived: v.optional(v.boolean()),
    status: v.optional(v.string()), // "draft" | "final"
    summary: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_goal", ["userId", "goal"]),

  // Per-plan chat messages for the AI chat modal
  chatMessages: defineTable({
    userId: v.string(),
    planId: v.id("plans"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    tokens: v.optional(v.number()),
    toolCalls: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_plan_created", ["planId", "createdAt"]) 
    .index("by_user_created", ["userId", "createdAt"]),

  // Insights generated from plans and/or chat
  insights: defineTable({
    userId: v.string(),
    planId: v.optional(v.id("plans")),
    kind: v.string(), // e.g., "risk", "milestone", "dependency", "next_action"
    text: v.string(),
    score: v.optional(v.number()),
    origin: v.union(v.literal("auto"), v.literal("manual")),
    createdAt: v.number(),
  })
    .index("by_plan_created", ["planId", "createdAt"]) 
    .index("by_user_created", ["userId", "createdAt"]),

  // Quick notes (optionally plan-scoped)
  notes: defineTable({
    userId: v.string(),
    planId: v.optional(v.id("plans")),
    text: v.string(),
    pinned: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"]) 
    .index("by_plan_created", ["planId", "createdAt"]),
});
