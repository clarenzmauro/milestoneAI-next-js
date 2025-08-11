import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
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
  })
    .index("by_user", ["userId"])
    .index("by_user_goal", ["userId", "goal"]),
});
